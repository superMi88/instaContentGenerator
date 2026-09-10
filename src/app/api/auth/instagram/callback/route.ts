import { NextRequest, NextResponse } from 'next/server';
import { saveStoredInstagramAuth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error');

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

  if (error) {
    console.error('Meta OAuth Error:', error);
    return NextResponse.redirect(`${publicBaseUrl}/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${publicBaseUrl}/?auth_error=${encodeURIComponent('Kein Autorisierungscode von Meta empfangen.')}`
    );
  }

  const appId =
    process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID;
  const appSecret =
    process.env.META_APP_SECRET ||
    process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      `${publicBaseUrl}/?auth_error=${encodeURIComponent(
        'META_APP_ID oder META_APP_SECRET ist auf dem Server nicht konfiguriert.'
      )}`
    );
  }

  const redirectUri = `${publicBaseUrl}/api/auth/instagram/callback`;

  try {
    // 1. Exchange authorization code for short-lived access token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', appId);
    tokenUrl.searchParams.append('client_secret', appSecret);
    tokenUrl.searchParams.append('redirect_uri', redirectUri);
    tokenUrl.searchParams.append('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(
        tokenData?.error?.message || 'Token-Austausch mit Meta fehlgeschlagen.'
      );
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for 60-day long-lived access token
    const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    longLivedUrl.searchParams.append('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.append('client_id', appId);
    longLivedUrl.searchParams.append('client_secret', appSecret);
    longLivedUrl.searchParams.append('fb_exchange_token', shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();

    const userAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Query connected Facebook Pages & Instagram Business Accounts
    const accountsUrl = new URL('https://graph.facebook.com/v21.0/me/accounts');
    accountsUrl.searchParams.append(
      'fields',
      'name,access_token,instagram_business_account{id,username,name}'
    );
    accountsUrl.searchParams.append('access_token', userAccessToken);

    const accountsRes = await fetch(accountsUrl.toString());
    const accountsData = await accountsRes.json();
    console.log('Accounts data from Meta /me/accounts:', JSON.stringify(accountsData));

    let instagramUserId = '';
    let instagramUsername = '';
    let pageId = '';
    let pageName = '';
    let pageAccessToken = '';

    if (accountsData.data && Array.isArray(accountsData.data)) {
      for (const page of accountsData.data) {
        if (page.instagram_business_account?.id) {
          pageId = page.id;
          pageName = page.name;
          pageAccessToken = page.access_token;
          instagramUserId = page.instagram_business_account.id;
          instagramUsername = page.instagram_business_account.username || 'ehefraugesucht';
          break;
        }
      }
    }

    if (!instagramUserId) {
      const pageNames = accountsData.data?.map((p: any) => p.name).join(', ') || 'keine';
      console.warn('Kein Instagram Business Account gefunden. Gefundene Seiten:', pageNames);
      return NextResponse.redirect(
        `${publicBaseUrl}/?auth_error=${encodeURIComponent(
          accountsData.data?.length === 0
            ? 'Meta hat keine Facebook-Seite gemeldet. Bitte hake deine Facebook-Seite beim Anmeldedialog an oder trage INSTAGRAM_USER_ID direkt in .env.local ein.'
            : `Gefundene Seite(n): ${pageNames}, aber es ist kein Instagram Business-Konto damit verknüpft.`
        )}`
      );
    }

    // Save stored credentials
    await saveStoredInstagramAuth({
      connected: true,
      instagramUserId: instagramUserId || undefined,
      instagramUsername: instagramUsername || undefined,
      pageId: pageId || undefined,
      pageName: pageName || undefined,
      accessToken: userAccessToken,
      pageAccessToken: pageAccessToken || userAccessToken,
      connectedAt: new Date().toISOString(),
    });

    // If INSTAGRAM_USER_ID in .env.local is empty and we found it, update .env.local automatically!
    if (instagramUserId) {
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        let envContent = await fs.readFile(envPath, 'utf-8');
        if (envContent.includes('INSTAGRAM_USER_ID=')) {
          envContent = envContent.replace(
            /INSTAGRAM_USER_ID=.*(\r?\n)/,
            `INSTAGRAM_USER_ID=${instagramUserId}$1`
          );
          await fs.writeFile(envPath, envContent, 'utf-8');
        }
      } catch (e) {
        console.warn('Could not auto-write to .env.local:', e);
      }
    }

    return NextResponse.redirect(`${publicBaseUrl}/?auth=success`);
  } catch (err: any) {
    console.error('Error during Instagram OAuth callback:', err);
    return NextResponse.redirect(
      `${publicBaseUrl}/?auth_error=${encodeURIComponent(err.message || 'Authentifizierungsfehler')}`
    );
  }
}
