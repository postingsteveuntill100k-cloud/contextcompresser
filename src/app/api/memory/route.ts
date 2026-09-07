import { NextRequest, NextResponse } from 'next/server';
import { getMemory, saveMemory } from '@/lib/storage/store';
import { verifyAuthSession, AuthenticationError, AuthorizationError } from '@/lib/security/auth_guard';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const memory = await getMemory(userId);
    return NextResponse.json({ memory });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Memory GET API] Server diagnostic:', msg);
    return NextResponse.json({ error: 'An error occurred while retrieving structured memory.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const body = await request.json();
    const { decision, failedApproach, unresolvedIssue } = body;

    const memory = await getMemory(userId);

    if (decision) {
      const topic = String(decision.topic || 'General').slice(0, 150);
      const decText = String(decision.decision || '').slice(0, 2000);
      const why = String(decision.why || '').slice(0, 2000);
      if (!decText) {
        return NextResponse.json({ error: 'Decision text cannot be empty.' }, { status: 400 });
      }

      memory.decisions.unshift({
        id: `dec_manual_${crypto.randomUUID()}`,
        userId,
        topic,
        decision: decText,
        why,
        rejectedAlternatives: Array.isArray(decision.rejectedAlternatives)
          ? decision.rejectedAlternatives.map(String).slice(0, 10)
          : [],
        timestamp: new Date().toISOString(),
        conversationId: 'manual_entry',
        conversationTitle: 'Direct Architecture Decision Entry',
        status: 'active',
      });
    }

    if (failedApproach) {
      const approach = String(failedApproach.approach || '').slice(0, 2000);
      const whyFailed = String(failedApproach.whyFailed || '').slice(0, 2000);
      const lesson = String(failedApproach.lesson || '').slice(0, 2000);
      if (!approach) {
        return NextResponse.json({ error: 'Approach text cannot be empty.' }, { status: 400 });
      }

      memory.failedApproaches.unshift({
        id: `fail_manual_${crypto.randomUUID()}`,
        userId,
        approach,
        whyFailed,
        lesson,
        timestamp: new Date().toISOString(),
        conversationId: 'manual_entry',
        conversationTitle: 'Direct Failure Log Entry',
      });
    }

    if (unresolvedIssue) {
      const issue = String(unresolvedIssue.issue || '').slice(0, 2000);
      const context = String(unresolvedIssue.context || '').slice(0, 2000);
      if (!issue) {
        return NextResponse.json({ error: 'Issue text cannot be empty.' }, { status: 400 });
      }

      memory.unresolvedIssues.unshift({
        id: `issue_manual_${crypto.randomUUID()}`,
        userId,
        issue,
        context,
        urgency: ['low', 'medium', 'high'].includes(unresolvedIssue.urgency) ? unresolvedIssue.urgency : 'medium',
        conversationId: 'manual_entry',
      });
    }

    await saveMemory(userId, memory);
    return NextResponse.json({ memory, message: 'Structured memory updated.' });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Memory API] Server diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred while updating structured memory.' }, { status: 500 });
  }
}
