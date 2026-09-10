import { NextRequest, NextResponse } from 'next/server';
import { getPostMeta, savePostMeta } from '@/lib/storage';
import { publishCarouselPost } from '@/lib/instagram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId } = body as { postId: string };

    if (!postId) {
      return NextResponse.json({ error: 'postId ist erforderlich.' }, { status: 400 });
    }

    const post = await getPostMeta(postId);
    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    const publicBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const res = await publishCarouselPost(post, publicBaseUrl);

    if (res.success) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.instagramPostId = res.instagramPostId || null;
      post.error = null;
    } else {
      post.error = res.error || 'Veröffentlichung fehlgeschlagen.';
    }

    await savePostMeta(post);

    if (!res.success) {
      return NextResponse.json(
        {
          success: false,
          error: res.error,
          post,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      instagramPostId: res.instagramPostId,
      post,
    });
  } catch (error: any) {
    console.error('Error in /api/publish:', error);
    return NextResponse.json(
      { error: error?.message || 'Fehler bei der Sofort-Veröffentlichung.' },
      { status: 500 }
    );
  }
}
