import { NextRequest, NextResponse } from 'next/server';
import { getConversations, getMemory } from '@/lib/storage/store';
import { askHistory } from '@/lib/ai/qa';
import { verifyAuthSession, AuthenticationError, AuthorizationError } from '@/lib/security/auth_guard';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const body = await request.json();
    const { question, mode } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    if (question.length > 3000) {
      return NextResponse.json(
        { error: 'Question exceeds maximum permitted length of 3000 characters.' },
        { status: 400 }
      );
    }

    const conversations = await getConversations(userId);
    const memory = await getMemory(userId);

    const askResponse = await askHistory(
      question.trim(),
      conversations,
      memory,
      mode === 'deep' ? 'deep' : 'normal',
      userId
    );

    return NextResponse.json(askResponse);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Ask API] Server diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred while processing your question.' }, { status: 500 });
  }
}
