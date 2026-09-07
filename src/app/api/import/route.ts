import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { detectFormat, computeSha256 } from '@/lib/ingestion/detector';
import { normalizeImport } from '@/lib/ingestion/normalizer';
import { extractFromConversation } from '@/lib/ai/extractor';
import {
  saveRawImport,
  getRawImports,
  saveConversations,
  saveMemory,
  getMemory,
  saveRawArchiveToStorage,
  getRawArchiveFromStorage,
  saveImportJob,
  getImportJob,
  updateImportJobProgress,
} from '@/lib/storage/store';
import { indexConversationForRetrieval } from '@/lib/retrieval/hybrid';
import { verifyAuthSession, AuthenticationError, AuthorizationError } from '@/lib/security/auth_guard';
import { RawImport } from '@/types';

// Maximum supported upload payload size: 50 MiB
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
// Bounded batch size for resumable processing
const BATCH_SIZE = 25;

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;

    let rawBytes: Buffer = Buffer.alloc(0);
    let rawContent = '';
    let filename = 'gemini_export.json';
    let resumeJobId: string | undefined;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data.' }, { status: 400 });
      }
      filename = file.name || filename;
      const ab = await file.arrayBuffer();
      rawBytes = Buffer.from(ab);
      rawContent = rawBytes.toString('utf8');
    } else {
      const body = await request.json();
      rawContent = body.content || '';
      rawBytes = Buffer.from(rawContent, 'utf8');
      filename = body.filename || filename;
      resumeJobId = body.jobId;
    }

    // Handle job resumption if requested
    if (resumeJobId) {
      const existingJob = await getImportJob(userId, resumeJobId);
      if (!existingJob) {
        return NextResponse.json({ error: `Import job '${resumeJobId}' not found.` }, { status: 404 });
      }
      // Retrieve original immutable archive from Cloud Storage
      rawContent = await getRawArchiveFromStorage(userId, existingJob.storagePath);
      filename = existingJob.filename;
    }

    if (rawBytes.length === 0 || rawContent.trim().length === 0) {
      return NextResponse.json({ error: 'Archive content is empty (0 bytes).' }, { status: 400 });
    }

    if (rawBytes.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Payload exceeds maximum permitted size of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MiB.` },
        { status: 413 }
      );
    }

    const sha256 = computeSha256(rawBytes);

    // Idempotency: Check if identical archive has already been imported
    if (!resumeJobId) {
      const existingImports = await getRawImports(userId);
      const existingMatch = existingImports.find((i) => i.sha256 === sha256);
      if (existingMatch) {
        return NextResponse.json({
          duplicate: true,
          message: `This exact archive (${filename}) was already imported on ${existingMatch.importedAt}.`,
          importId: existingMatch.id,
          storagePath: existingMatch.storagePath,
          conversationCount: existingMatch.conversationCount,
        });
      }
    }

    // Detect format
    const detection = detectFormat(rawBytes, filename);
    if (!detection.isValid && detection.errorMessage) {
      return NextResponse.json(
        {
          error: detection.errorMessage,
          format: detection.format,
        },
        { status: 422 }
      );
    }

    const importId = `imp_${sha256.slice(0, 16)}`;
    const jobId = resumeJobId || `job_${sha256.slice(0, 12)}_${crypto.randomUUID().slice(0, 8)}`;

    // 1. Immutable Cloud Storage upload (exact raw archive preservation using raw bytes)
    const storagePath = await saveRawArchiveToStorage(userId, importId, filename, rawBytes);

    // 2. Normalize into canonical internal model
    const normResult = normalizeImport(rawBytes, userId, importId, filename);

    if (normResult.errors.length > 0 && normResult.conversations.length === 0) {
      return NextResponse.json(
        {
          error: normResult.errors.join('; '),
          warnings: normResult.warnings,
        },
        { status: 422 }
      );
    }

    // 3. Save Raw Archive metadata record in Firestore with Cloud Storage reference
    const rawRecord: RawImport = {
      id: importId,
      userId,
      filename,
      mimeType: filename.endsWith('.json') ? 'application/json' : 'text/plain',
      byteSize: Buffer.byteLength(rawContent, 'utf8'),
      format: detection.format,
      sha256,
      storagePath,
      conversationCount: normResult.conversations.length,
      importedAt: new Date().toISOString(),
      status: 'processing',
    };
    await saveRawImport(userId, rawRecord);

    // 4. Initialize or load ImportJob for progress & crash resumability
    let job = await getImportJob(userId, jobId);
    if (!job) {
      job = {
        id: jobId,
        userId,
        importId,
        filename,
        storagePath,
        status: 'processing',
        totalConversations: normResult.conversations.length,
        storedConversations: 0,
        normalizedConversations: normResult.conversations.length,
        extractedMemories: 0,
        indexedChunks: 0,
        failedCount: 0,
        retriedCount: 0,
        progressPercentage: 0,
        checkpointIndex: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveImportJob(job);
    }

    // 5. Save canonical conversations to Firestore (idempotent subcollection writes)
    await saveConversations(userId, normResult.conversations);
    job.storedConversations = normResult.conversations.length;

    // Helper to deduplicate structured entities by deterministic ID
    function dedupeById<T extends { id?: string }>(existing: T[], incoming: T[]): T[] {
      const map = new Map<string, T>();
      for (const item of existing) {
        if (item.id) map.set(item.id, item);
      }
      for (const item of incoming) {
        if (item.id) map.set(item.id, item);
        else map.set(JSON.stringify(item), item);
      }
      return Array.from(map.values());
    }

    // 6. Resume from checkpoint index & retry failed conversations
    const currentMemory = await getMemory(userId);
    const totalConvos = normResult.conversations.length;
    let failedConvosList: { conversationId: string; title: string; error: string }[] = [...(job.failedConversations || [])];

    // Explicit retry for previously failed conversations (e.g. on resume/retry)
    if (failedConvosList.length > 0) {
      const remainingFailed: { conversationId: string; title: string; error: string }[] = [];
      for (const failedItem of failedConvosList) {
        const convo = normResult.conversations.find((c) => c.id === failedItem.conversationId);
        if (!convo) {
          remainingFailed.push(failedItem);
          continue;
        }

        let retriedOk = false;
        let lastRetryErr = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const extracted = await extractFromConversation(convo);
            convo.summary = extracted.summary;

            currentMemory.decisions = dedupeById(currentMemory.decisions, extracted.decisions);
            currentMemory.technicalSpecs = dedupeById(currentMemory.technicalSpecs, extracted.technicalSpecs);
            currentMemory.failedApproaches = dedupeById(currentMemory.failedApproaches, extracted.failedApproaches);
            currentMemory.unresolvedIssues = dedupeById(currentMemory.unresolvedIssues, extracted.unresolvedIssues);
            if (extracted.timeline) {
              currentMemory.timeline = dedupeById(currentMemory.timeline || [], extracted.timeline);
            }
            if (extracted.contradictions) {
              currentMemory.contradictions = dedupeById(currentMemory.contradictions || [], extracted.contradictions);
            }

            const indexed = await indexConversationForRetrieval(userId, convo);
            job.indexedChunks += indexed.length;
            job.extractedMemories +=
              extracted.decisions.length +
              extracted.technicalSpecs.length +
              extracted.failedApproaches.length +
              extracted.unresolvedIssues.length;

            retriedOk = true;
            break;
          } catch (err) {
            lastRetryErr = err instanceof Error ? err.message : String(err);
            job.retriedCount++;
            if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
          }
        }

        if (!retriedOk) {
          remainingFailed.push({
            conversationId: convo.id,
            title: convo.title,
            error: lastRetryErr,
          });
        }
      }
      failedConvosList = remainingFailed;
      job.failedConversations = failedConvosList;
      job.failedCount = failedConvosList.length;
    }

    const startIndex = job.checkpointIndex || 0;

    for (let i = startIndex; i < totalConvos; i += BATCH_SIZE) {
      const batch = normResult.conversations.slice(i, i + BATCH_SIZE);

      for (const convo of batch) {
        // Skip if already in failed list from prior step
        if (failedConvosList.some((f) => f.conversationId === convo.id)) {
          continue;
        }

        let extractedOk = false;
        let lastConvoErr = '';

        // Bounded retry policy: try extraction up to 2 times
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const extracted = await extractFromConversation(convo);
            convo.summary = extracted.summary;

            // Deduplicate all structured entities by deterministic ID so resumption is 100% idempotent
            currentMemory.decisions = dedupeById(currentMemory.decisions, extracted.decisions);
            currentMemory.technicalSpecs = dedupeById(currentMemory.technicalSpecs, extracted.technicalSpecs);
            currentMemory.failedApproaches = dedupeById(currentMemory.failedApproaches, extracted.failedApproaches);
            currentMemory.unresolvedIssues = dedupeById(currentMemory.unresolvedIssues, extracted.unresolvedIssues);
            if (extracted.timeline) {
              currentMemory.timeline = dedupeById(currentMemory.timeline || [], extracted.timeline);
            }
            if (extracted.contradictions) {
              currentMemory.contradictions = dedupeById(currentMemory.contradictions || [], extracted.contradictions);
            }

            // Index into persistent retrieval index
            const indexed = await indexConversationForRetrieval(userId, convo);
            job.indexedChunks += indexed.length;
            job.extractedMemories +=
              extracted.decisions.length +
              extracted.technicalSpecs.length +
              extracted.failedApproaches.length +
              extracted.unresolvedIssues.length;

            extractedOk = true;
            break;
          } catch (err) {
            lastConvoErr = err instanceof Error ? err.message : String(err);
            job.retriedCount++;
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        if (!extractedOk) {
          job.lastError = lastConvoErr;
          failedConvosList.push({
            conversationId: convo.id,
            title: convo.title,
            error: lastConvoErr,
          });
          console.warn(`[Import Pipeline] Warning on convo ${convo.id}: ${lastConvoErr}`);
        }
      }

      // Checkpoint progress to Firestore
      job.checkpointIndex = Math.min(totalConvos, i + batch.length);
      job.progressPercentage = Math.round((job.checkpointIndex / totalConvos) * 100);
      job.failedCount = failedConvosList.length;
      job.failedConversations = failedConvosList;
      await updateImportJobProgress(userId, jobId, {
        checkpointIndex: job.checkpointIndex,
        progressPercentage: job.progressPercentage,
        indexedChunks: job.indexedChunks,
        extractedMemories: job.extractedMemories,
        failedCount: job.failedCount,
        retriedCount: job.retriedCount,
        failedConversations: job.failedConversations,
        lastError: job.lastError,
      });
    }

    // 7. Finalize memory & complete job
    await saveMemory(userId, currentMemory);
    await saveConversations(userId, normResult.conversations);

    // Truthful final status determination
    const finalStatus: 'completed' | 'partial_success' | 'failed' =
      failedConvosList.length === 0
        ? 'completed'
        : failedConvosList.length === totalConvos
        ? 'failed'
        : 'partial_success';

    job.status = finalStatus;
    job.completedAt = new Date().toISOString();
    job.progressPercentage = 100;
    job.failedCount = failedConvosList.length;
    job.failedConversations = failedConvosList;

    await updateImportJobProgress(userId, jobId, {
      status: finalStatus,
      completedAt: job.completedAt,
      progressPercentage: 100,
      failedCount: job.failedCount,
      failedConversations: job.failedConversations,
    });

    // Update RawImport status to truthful status
    rawRecord.status = finalStatus === 'completed' ? 'completed' : finalStatus === 'failed' ? 'failed' : 'normalized';
    await saveRawImport(userId, rawRecord);

    return NextResponse.json({
      success: finalStatus !== 'failed',
      status: finalStatus,
      importId,
      jobId,
      storagePath,
      format: detection.format,
      conversationsImported: normResult.conversations.length,
      failedConversationsCount: job.failedCount,
      failedConversations: failedConvosList,
      messagesTotal: normResult.totalMessages,
      progressPercentage: 100,
      warnings: normResult.warnings,
      structuredEntitiesExtracted: {
        decisions: currentMemory.decisions.length,
        technicalSpecs: currentMemory.technicalSpecs.length,
        failedApproaches: currentMemory.failedApproaches.length,
        unresolvedIssues: currentMemory.unresolvedIssues.length,
        timelineEvents: currentMemory.timeline.length,
        contradictions: currentMemory.contradictions.length,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Import API] Processing failure:', errMessage);
    return NextResponse.json({ error: 'An error occurred while processing the archive.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;

    const action = request.nextUrl.searchParams.get('action');

    // Action 1: Exact byte-for-byte Raw Archive Recovery from Cloud Storage
    if (action === 'download_raw') {
      const importId = request.nextUrl.searchParams.get('importId');
      if (!importId) {
        return NextResponse.json({ error: 'importId query parameter is required.' }, { status: 400 });
      }

      const imports = await getRawImports(userId);
      const match = imports.find((i) => i.id === importId);
      if (!match) {
        return NextResponse.json({ error: 'Import record not found.' }, { status: 404 });
      }

      const storagePath = match.storagePath || `users/${userId}/raw_imports/${match.id}/${match.filename}`;
      const rawContent = await getRawArchiveFromStorage(userId, storagePath);

      return new NextResponse(rawContent, {
        headers: {
          'Content-Type': match.mimeType || 'application/json',
          'Content-Disposition': `attachment; filename="${match.filename}"`,
        },
      });
    }

    // Action 2: Import Job status check (for background/resumable processing)
    if (action === 'job_status') {
      const jobId = request.nextUrl.searchParams.get('jobId');
      if (!jobId) {
        return NextResponse.json({ error: 'jobId query parameter is required.' }, { status: 400 });
      }
      const job = await getImportJob(userId, jobId);
      if (!job) {
        return NextResponse.json({ error: 'Import job not found.' }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    // Default: List user's imports
    const imports = await getRawImports(userId);
    return NextResponse.json({ imports });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Import API GET] Diagnostic:', msg);
    return NextResponse.json({ error: 'An error occurred while retrieving import records.' }, { status: 500 });
  }
}
