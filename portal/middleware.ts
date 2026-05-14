import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Copies the original Host header into x-portal-host so RSC layouts
 * can read it via next/headers regardless of the fetch-target host.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-portal-host', request.headers.get('host') ?? '');
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
