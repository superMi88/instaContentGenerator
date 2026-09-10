import { NextRequest, NextResponse } from 'next/server';
import { getDuePosts, savePostMeta } from '@/lib/storage';
import { publishCarouselPost } from '@/lib/instagram';

async function handleCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    const urlSecret = req.nextUrl.searchParams.get('secret');
    if (authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
    }
  }

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  try {
    const duePosts = await getDuePosts();
    const results: Array<{ id: string; success: boolean; error?: string; igId?: string }> = [];

    for (const post of duePosts) {
      console.log(`Cron: Veröffentliche geplanten Post ${post.id}...`);
      const res = await publishCarouselPost(post, publicBaseUrl);

      if (res.success) {
        post.status = 'published';
        post.publishedAt = new Date().toISOString();
        post.instagramPostId = res.instagramPostId || null;
        post.error = null;
      } else {
        post.status = 'failed';
        post.error = res.error || 'Veröffentlichung fehlgeschlagen';
      }

      await savePostMeta(post);
      results.push({
        id: post.id,
        success: res.success,
        error: res.error,
        igId: res.instagramPostId,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: duePosts.length,
      results,
    });
  } catch (error: any) {
    console.error('Error during cron execution:', error);
    return NextResponse.json(
      { error: error?.message || 'Unerwarteter Fehler im Cron-Job.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
