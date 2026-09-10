import { NextRequest, NextResponse } from 'next/server';
import { getStoredInstagramAuth, deleteStoredInstagramAuth } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await getStoredInstagramAuth();
    const envUserId = process.env.INSTAGRAM_USER_ID;

    if (auth && auth.connected && (auth.accessToken || auth.pageAccessToken)) {
      return NextResponse.json({
        connected: true,
        username: auth.instagramUsername || 'Verbunden',
        userId: auth.instagramUserId || envUserId || null,
        connectedAt: auth.connectedAt,
        pageName: auth.pageName,
      });
    }

    return NextResponse.json({
      connected: false,
      userId: envUserId || null,
    });
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message });
  }
}

export async function DELETE() {
  try {
    await deleteStoredInstagramAuth();
    return NextResponse.json({ success: true, message: 'Instagram-Verbindung getrennt.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
