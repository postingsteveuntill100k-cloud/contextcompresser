import { NextRequest, NextResponse } from 'next/server';
import { runSecurityPenetrationSuite } from '@/lib/security/auditor';
import { verifyAuthSession, AuthenticationError, AuthorizationError } from '@/lib/security/auth_guard';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Forbidden: Security penetration testing endpoint is disabled in production.' },
      { status: 403 }
    );
  }

  try {
    await verifyAuthSession(request);
    const report = await runSecurityPenetrationSuite();
    return NextResponse.json({ report });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Security Penetration API] Server diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred during penetration test suite execution.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Forbidden: Security penetration testing endpoint is disabled in production.' },
      { status: 403 }
    );
  }

  try {
    await verifyAuthSession(request);
    const report = await runSecurityPenetrationSuite();
    return NextResponse.json({ report });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Security Penetration API] Server diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred during penetration test suite execution.' }, { status: 500 });
  }
}
