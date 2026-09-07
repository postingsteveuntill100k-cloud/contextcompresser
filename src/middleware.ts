import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://compresscontext.web.app',
  'https://compresscontext.firebaseapp.com',
  'https://gen-lang-client-0175818220.web.app',
  'https://gen-lang-client-0175818220.firebaseapp.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin or server-to-server requests
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }
  return false;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = isOriginAllowed(origin);

  if (request.method === 'OPTIONS') {
    if (!allowed && origin) {
      return new NextResponse(null, { status: 403 });
    }
    const response = new NextResponse(null, { status: 204 });
    if (origin && allowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  const response = NextResponse.next();
  if (origin && allowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
