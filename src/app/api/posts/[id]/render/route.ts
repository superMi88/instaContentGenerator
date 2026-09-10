import { NextRequest, NextResponse } from 'next/server';
import { getPostMeta, savePostMeta } from '@/lib/storage';
import { renderAllPostSlides } from '@/lib/renderer';
import { PostMeta } from '@/types/post';

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    let post: PostMeta | null = null;

    // Check if client sent latest post directly in body
    try {
      const body = await req.json();
      if (body && body.slides && Array.isArray(body.slides)) {
        post = body as PostMeta;
        await savePostMeta(post);
      }
    } catch {}

    if (!post) {
      post = await getPostMeta(params.id);
    }

    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    const slideUrls = await renderAllPostSlides(post);

    return NextResponse.json({
      success: true,
      slideUrls,
      slide1Url: slideUrls[0] || null,
      slide2Url: slideUrls[1] || null,
    });
  } catch (error: any) {
    console.error('Error rendering slides:', error);
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Rendern der Karussell-Bilder.' },
      { status: 500 }
    );
  }
}
