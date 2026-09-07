import { NextRequest, NextResponse } from 'next/server';
import {
  getConversations,
  getMemory,
  saveContextPackage,
  getContextPackages,
} from '@/lib/storage/store';
import { generateContextPackage } from '@/lib/ai/compressor';
import { verifyAuthSession, AuthenticationError, AuthorizationError } from '@/lib/security/auth_guard';
import { ContextMode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const body = await request.json();
    const rawTitle = typeof body.projectTitle === 'string' ? body.projectTitle.trim() : '';
    if (rawTitle.length > 200) {
      return NextResponse.json(
        { error: 'Project title exceeds maximum permitted length of 200 characters.' },
        { status: 400 }
      );
    }
    const projectTitle = rawTitle || 'Gemini AI Context Project';
    const mode: ContextMode = body.mode === 'quick' ? 'quick' : 'full';

    const conversations = await getConversations(userId);
    const memory = await getMemory(userId);

    const pkg = await generateContextPackage({
      userId,
      projectTitle,
      conversations,
      decisions: memory.decisions,
      technicalSpecs: memory.technicalSpecs,
      failedApproaches: memory.failedApproaches,
      unresolvedIssues: memory.unresolvedIssues,
      mode,
    });

    await saveContextPackage(userId, pkg);

    return NextResponse.json({
      package: pkg,
      message: `Generated ${mode.toUpperCase()} Context Package (${pkg.tokenCount} tokens, ${pkg.compressionRatio}% compression)`,
    });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Generate Context API] Server diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred while generating the context package.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const packages = await getContextPackages(userId);
    return NextResponse.json({ packages });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Generate Context GET API] Server diagnostic:', msg);
    return NextResponse.json({ error: 'An error occurred while retrieving context packages.' }, { status: 500 });
  }
}
