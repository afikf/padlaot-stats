import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    
    return NextResponse.json({
      email: decodedToken.email,
      userData: decodedToken.userData || {}
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
} 