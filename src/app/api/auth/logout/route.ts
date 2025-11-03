
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the session cookie by setting its maxAge to 0
    cookies().set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Session logout error:', error);
    return NextResponse.json({ error: 'Failed to log out.' }, { status: 500 });
  }
}
