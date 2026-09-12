import { NextRequest, NextResponse } from 'next/server';
import { getUser, saveUser } from '@/lib/storage/store';
import {
  verifyAuthSession,
  createSignedSessionToken,
  AuthenticationError,
  AuthorizationError,
} from '@/lib/security/auth_guard';
import { User } from '@/types';

/**
 * Real Authentication & Identity API
 *
 * Enforces:
 * 1. Verification of Bearer token via Firebase Admin or cryptographic signed tokens.
 * 2. Source of truth is session.uid (never untrusted header/body).
 * 3. Secure token minting for test identities (Alice, Bob, Guest).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuthSession(request);
    const userId = session.uid;

    let user = await getUser(userId);
    if (!user) {
      user = {
        id: userId,
        email: session.email || `${userId}@contextos.internal`,
        displayName:
          userId === 'victim_user_alice_001'
            ? 'Alice (Principal Engineer)'
            : userId === 'adversary_user_bob_002'
            ? 'Bob (Adversary Auditor)'
            : session.email
            ? session.email.split('@')[0]
            : `User (${userId.slice(0, 10)})`,
        createdAt: new Date().toISOString(),
      };
      await saveUser(user);
    }

    return NextResponse.json({ user, session });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Auth API GET] Diagnostic:', msg);
    return NextResponse.json({ error: 'An error occurred during authentication.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, displayName, email } = body;

    // Token minting for demo workspace users
    if (action === 'mint_token' || action === 'login') {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_AUTH !== 'true') {
        return NextResponse.json(
          { error: 'Forbidden: Test token minting is disabled in production. Authenticate via genuine Firebase Google sign-in.' },
          { status: 403 }
        );
      }
      const targetUid = userId || 'user_gemini_main';
      const token = createSignedSessionToken(targetUid, email);

      let user = await getUser(targetUid);
      if (!user) {
        user = {
          id: targetUid,
          email: email || `${targetUid}@contextos.internal`,
          displayName:
            displayName ||
            (targetUid === 'user_gemini_main'
              ? 'Alice (Principal Engineer)'
              : targetUid === 'adversary_user_bob_002'
              ? 'Bob (Adversary Auditor)'
              : `User (${targetUid.slice(0, 8)})`),
          createdAt: new Date().toISOString(),
        };
        await saveUser(user);
      }

      return NextResponse.json({
        token,
        user,
        message: `Authenticated as ${targetUid} (dev mode)`,
      });
    }

    // Otherwise, standard profile update for authenticated user
    const session = await verifyAuthSession(request);
    const authenticatedUid = session.uid;

    const existingUser = await getUser(authenticatedUid);
    const updatedUser: User = {
      id: authenticatedUid,
      email: email || existingUser?.email || `${authenticatedUid}@contextos.internal`,
      displayName: displayName || existingUser?.displayName || `User ${authenticatedUid}`,
      createdAt: existingUser?.createdAt || new Date().toISOString(),
    };

    await saveUser(updatedUser);
    return NextResponse.json({ user: updatedUser, message: 'User profile updated.' });
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[Auth API POST] Diagnostic:', errMessage);
    return NextResponse.json({ error: 'An error occurred during profile update.' }, { status: 500 });
  }
}
