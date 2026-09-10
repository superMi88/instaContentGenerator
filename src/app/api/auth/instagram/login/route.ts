import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const appId =
    process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID;

  if (!appId) {
    return NextResponse.json(
      { error: 'META_APP_ID ist in .env.local nicht konfiguriert.' },
      { status: 500 }
    );
  }

  let publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (!publicBaseUrl || publicBaseUrl.includes('localhost')) {
    if (forwardedHost) {
      const proto = forwardedProto || 'https';
      publicBaseUrl = `${proto}://${forwardedHost}`;
    } else {
      publicBaseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    }
  }

  if (
    publicBaseUrl.startsWith('http://') &&
    !publicBaseUrl.includes('localhost') &&
    !publicBaseUrl.includes('127.0.0.1')
  ) {
    publicBaseUrl = publicBaseUrl.replace('http://', 'https://');
  }
  publicBaseUrl = publicBaseUrl.replace(/\/$/, '');

  const redirectUri = `${publicBaseUrl}/api/auth/instagram/callback`;

  // Required scopes for Instagram Graph API Carousel publishing & Page access
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
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
