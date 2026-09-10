import { NextRequest, NextResponse } from 'next/server';
import { savePostAsset, getPostMeta, savePostMeta } from '@/lib/storage';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, characterType, base64Image } = body as {
      postId: string;
      characterType?: 'chibi_boy' | 'chibi_girl' | 'custom';
      base64Image?: string;
    };

    if (!postId) {
      return NextResponse.json({ error: 'postId ist erforderlich.' }, { status: 400 });
    }

    const post = await getPostMeta(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden.' }, { status: 404 });
    }

    let imageBuffer: Buffer;

    if (base64Image) {
      // Remove data URL prefix if present
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    } else {
      // Pick preset
      const filename = characterType === 'chibi_girl' ? 'chibi_girl.jpg' : 'chibi_boy.jpg';
      const presetPath = path.join(process.cwd(), 'public', 'assets', 'characters', filename);
      imageBuffer = await fs.readFile(presetPath);
    }

    await savePostAsset(postId, 'character.png', imageBuffer);

    post.hasCustomCharacter = true;
    post.updatedAt = new Date().toISOString();
    await savePostMeta(post);

    return NextResponse.json({
      success: true,
      characterUrl: `/api/posts/${postId}/assets/character.png?t=${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/image:', error);
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Aktualisieren des Chibi-Charakters.' },
      { status: 500 }
    );
  }
}
