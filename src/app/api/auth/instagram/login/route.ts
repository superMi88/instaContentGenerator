import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const appId =
    process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || '1724140925308828';

  if (!appId) {
    return NextResponse.json(
      { error: 'META_APP_ID ist in .env.local nicht konfiguriert.' },
      { status: 500 }
    );
  }

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const redirectUri = `${publicBaseUrl}/api/auth/instagram/callback`;

  // Required scopes for Instagram Graph API Carousel publishing & Page access
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'public_profile',
  ].join(',');

  const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  oauthUrl.searchParams.append('client_id', appId);
  oauthUrl.searchParams.append('redirect_uri', redirectUri);
  oauthUrl.searchParams.append('scope', scopes);
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('state', 'instagram_auth');
  oauthUrl.searchParams.append('auth_type', 'rerequest');

  return NextResponse.redirect(oauthUrl.toString());
}
