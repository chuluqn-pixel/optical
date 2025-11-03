
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/firebase/admin';
import { cookies } from 'next/headers';
import { auth } from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    const sessionCookie = await auth(adminApp).createSessionCookie(idToken, { expiresIn });

    cookies().set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000, // maxAge is in seconds
      path: '/',
    });

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error('Session login error:', error);
    return NextResponse.json({ error: `Failed to create session: ${error.message}` }, { status: 401 });
  }
}
