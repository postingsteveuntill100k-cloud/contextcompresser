import { NextRequest, NextResponse } from 'next/server';
import { getMemory, saveDevHandoff, getDevHandoffs } from '@/lib/storage/store';
import { createDeveloperHandoff } from '@/lib/devmode/parser';
import { verifyAuthSession, AuthenticationError, AuthorizationError } from '@/lib/security/auth_guard';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const body = await request.json();
    const { projectTitle = 'Personal Context Engine', codeSnippets = [] } = body;

    // Reject fake fallback if no real source code provided
    if (!codeSnippets || !Array.isArray(codeSnippets) || codeSnippets.length === 0) {
      return NextResponse.json(
        { error: 'No source code provided. Please submit real TypeScript/JavaScript source code to parse AST symbols.' },
        { status: 400 }
      );
    }

    if (codeSnippets.length > 25) {
      return NextResponse.json(
        { error: 'Exceeded maximum limit of 25 source code files per request.' },
        { status: 400 }
      );
    }

    const memory = await getMemory(userId);

    const handoff = await createDeveloperHandoff({
      userId,
      projectTitle,
      codeSnippets,
      decisions: memory.decisions,
      failedApproaches: memory.failedApproaches,
      unresolvedIssues: memory.unresolvedIssues,
    });

    await saveDevHandoff(userId, handoff);

    return NextResponse.json({
      handoff,
      message: `Generated Developer Handoff with ${handoff.symbols.length} AST symbols and ${handoff.tokenCount} tokens.`,
    });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Dev Mode API] Server diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred while generating developer handoff.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;
    const handoffs = await getDevHandoffs(userId);
    return NextResponse.json({ handoffs });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Dev Mode GET API] Server diagnostic:', msg);
    return NextResponse.json({ error: 'An error occurred while retrieving developer handoffs.' }, { status: 500 });
  }
}
