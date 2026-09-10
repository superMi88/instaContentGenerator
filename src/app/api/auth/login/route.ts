import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich.' },
        { status: 400 }
      );
    }

    const configuredEmail = process.env.AUTH_EMAIL || 'admin@kleiner-wald-server.de';
    const configuredPassword = process.env.AUTH_PASSWORD || 'admin';

    const cleanInputEmail = email.trim().toLowerCase();
    const cleanConfiguredEmail = configuredEmail.trim().toLowerCase();

    if (cleanInputEmail !== cleanConfiguredEmail || password !== configuredPassword) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse oder falsches Passwort.' },
        { status: 401 }
      );
    }

    // Credentials valid, create signed token
    const token = await createSessionToken(cleanConfiguredEmail);

    const response = NextResponse.json({
      success: true,
      email: cleanConfiguredEmail,
    });

    const isSecure = req.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Fehler bei der Anmeldung.' },
      { status: 500 }
    );
  }
}
