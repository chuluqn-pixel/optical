import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  // If the user is trying to access the login page
  if (pathname.startsWith('/login')) {
    // If they have a session cookie, redirect them to the home page
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Otherwise, let them proceed to the login page
    return NextResponse.next();
  }

  // For any other page, check for a session cookie
  if (!sessionCookie) {
    // If no cookie, redirect to the login page
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Verify the session cookie by calling our API route
    const response = await fetch(new URL('/api/auth/verify', request.url), {
      headers: {
        'Cookie': `session=${sessionCookie.value}`
      }
    });

    // If verification fails (e.g., cookie expired), redirect to login
    if (!response.ok) {
        const loginUrl = new URL('/login', request.url);
        // Clear the invalid cookie by setting a new one with an expired date
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('session', '', { expires: new Date(0) });
        return response;
    }
    
  } catch (error) {
    // If there's an error during verification, it's safer to redirect to login
    console.error('Middleware verification error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }


  // If the session is valid, let the request proceed
  return NextResponse.next();
}

export const config = {
  // Match all routes except for API routes, static files, and image optimization files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
