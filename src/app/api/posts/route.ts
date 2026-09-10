import { NextRequest, NextResponse } from 'next/server';
import { listPosts, savePostMeta, savePostAsset, duplicatePostAssets } from '@/lib/storage';
import { renderAllPostSlides } from '@/lib/renderer';
import { PostMeta } from '@/types/post';
import { PRESET_THEMES } from '@/lib/gemini';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    const posts = await listPosts();
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error('Error listing posts:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Beitragsliste.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date();
    const id = body.id || `post_${now.getTime()}`;

    // If duplicating an existing post, copy all its assets first
    if (body.duplicateFromId) {
      await duplicatePostAssets(body.duplicateFromId, id);
    }

    const defaultColors = PRESET_THEMES['Liebe & Beziehung'];

    let initialSlides = body.slides || [
      {
        id: 'slide_1',
        slideNumber: 1,
        layoutType: 'bild_mit_text' as const,
        category: body.category || 'Liebe & Beziehung',
        text: body.slide1_question || 'Wie stehst du zu diesem Thema?',
        imageUrl: '/assets/characters/chibi_boy.jpg',
      },
      {
        id: 'slide_2',
        slideNumber: 2,
        layoutType: 'bild_mit_text' as const,
        category: body.category || 'Liebe & Beziehung',
        text: body.slide2_answer || 'Hier ist mein persönlicher Standpunkt und Einblick dazu.',
        imageUrl: '/assets/characters/chibi_girl.jpg',
      },
    ];

    let initialGallery = body.gallery || [
      {
        id: 'preset_boy',
        filename: 'chibi_boy.jpg',
        url: '/assets/characters/chibi_boy.jpg',
        prompt: 'Chibi Junge Preset',
        createdAt: now.toISOString(),
        isAiGenerated: false,
      },
      {
        id: 'preset_girl',
        filename: 'chibi_girl.jpg',
        url: '/assets/characters/chibi_girl.jpg',
        prompt: 'Chibi Mädchen Preset',
        createdAt: now.toISOString(),
        isAiGenerated: false,
      },
    ];

    // If duplicating, rewrite self-referencing URLs from duplicateFromId to id
    if (body.duplicateFromId) {
      initialSlides = initialSlides.map((s: any) => ({
        ...s,
        imageUrl: s.imageUrl?.replaceAll(`/api/posts/${body.duplicateFromId}/`, `/api/posts/${id}/`),
      }));
      initialGallery = initialGallery.map((g: any) => ({
        ...g,
        url: g.url?.replaceAll(`/api/posts/${body.duplicateFromId}/`, `/api/posts/${id}/`),
      }));
    }

    const newPost: PostMeta = {
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      topic: body.topic || 'Neues Karussell',
      category: body.category || 'Liebe & Beziehung',
      slide1_question: body.slide1_question || 'Wie stehst du zu diesem Thema?',
      slide2_answer: body.slide2_answer || 'Hier ist mein persönlicher Standpunkt und Einblick dazu.',
      character_prompt: body.character_prompt || 'Cute anime chibi character thinking',
      instagram_caption:
        body.instagram_caption ||
        'Was ist deine Meinung dazu? Schreib es in die Kommentare! 👇\n\n#mindset #community #inspiration',
      hashtags: body.hashtags || ['#mindset', '#community', '#inspiration'],
      colors: body.colors || defaultColors,
      chat_history: body.chat_history || [],
      status: body.status || 'draft',
      scheduledAt: body.scheduledAt || null,
      publishedAt: null,
      instagramPostId: null,
      error: null,
      hasCustomCharacter: false,
      slides: initialSlides,
      gallery: initialGallery,
    };

    // Save initial metadata
    await savePostMeta(newPost);

    // Copy initial default character to post folder if not already present
    try {
      if (!body.duplicateFromId) {
        const defaultCharPath = path.join(
          process.cwd(),
          'public',
          'assets',
          'characters',
          'chibi_boy.jpg'
        );
        const charBuffer = await fs.readFile(defaultCharPath);
        await savePostAsset(id, 'character.png', charBuffer);
      }
    } catch (e) {
      console.warn('Could not copy default character:', e);
    }

    // Pre-render all slides
    try {
      await renderAllPostSlides(newPost);
    } catch (renderError) {
      console.error('Initial slide render error:', renderError);
    }

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Erstellen des Beitrags.' },
      { status: 500 }
    );
  }
}
