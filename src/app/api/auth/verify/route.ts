
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/firebase/admin';
import { cookies } from 'next/headers';
import { auth } from 'firebase-admin';

export async function GET() {
    const sessionCookie = cookies().get('session')?.value;

    if (!sessionCookie) {
        return NextResponse.json({ error: 'Session cookie not found.' }, { status: 401 });
    }

    try {
        const adminApp = getAdminApp();
        const decodedIdToken = await auth(adminApp).verifySessionCookie(sessionCookie, true /** checkRevoked */);
        return NextResponse.json({ uid: decodedIdToken.uid });
    } catch (error) {
        console.error('Error verifying session cookie:', error);
        return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }
}
