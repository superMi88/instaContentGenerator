import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getPostMeta, savePostMeta, saveGalleryAsset, getGalleryAsset, getImageSets, getImageSetAsset } from '@/lib/storage';
import { generateChibiImage } from '@/lib/gemini-image';
import { GalleryAsset } from '@/types/post';

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const post = await getPostMeta(id);

    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    const body = await req.json();
    const { action, prompt, instruction, base64Image, referenceImageBase64, referenceImageUrl, backgroundColorHex, styleImages, styleSetId } = body as {
      action: 'generate' | 'upload' | 'edit';
      prompt?: string;
      instruction?: string;
      base64Image?: string;
      referenceImageBase64?: string;
      referenceImageUrl?: string;
      backgroundColorHex?: string;
      styleImages?: Array<{ base64Data: string; mimeType?: string }>;
      styleSetId?: string;
    };

    let imageBuffer: Buffer;
    let assetPrompt = prompt || instruction || post.character_prompt || 'Cute character';
    let isAi = false;

    if (action === 'upload' && base64Image) {
      // User uploaded custom image
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
      assetPrompt = 'Hochgeladenes Bild';
    } else if (action === 'edit') {
      // Multimodal Image Editing with Reference Image
      isAi = true;
      const targetBg = backgroundColorHex || post.colors?.topBg;
      let refBase64 = referenceImageBase64;

      if (!refBase64 && referenceImageUrl) {
        // Resolve image from storage
        try {
          if (referenceImageUrl.includes('/gallery/')) {
            const filename = referenceImageUrl.split('/gallery/').pop()?.split('?')[0];
            if (filename) {
              const buf = await getGalleryAsset(id, filename);
              if (buf) refBase64 = buf.toString('base64');
            }
          } else if (referenceImageUrl.includes('/api/image-sets/')) {
            const match = referenceImageUrl.match(/\/api\/image-sets\/([^/]+)\/assets\/([^/?#]+)/);
            if (match) {
              const [, setId, filename] = match;
              const buf = await getImageSetAsset(setId, filename);
              if (buf) refBase64 = buf.toString('base64');
            }
          } else if (referenceImageUrl.startsWith('/assets/')) {
            const relPath = path.join(process.cwd(), 'public', referenceImageUrl);
            const buf = await fs.readFile(relPath);
            if (buf) refBase64 = buf.toString('base64');
          }
        } catch (e) {
          console.error('Failed to resolve reference image from URL:', e);
        }
      }

      if (!refBase64) {
        return NextResponse.json(
          { error: 'Referenzbild konnte nicht geladen werden.' },
          { status: 400 }
        );
      }

      const cleanRefBase64 = refBase64.replace(/^data:image\/\w+;base64,/, '');
      const editInstruction = instruction || prompt || 'Modify character';
      assetPrompt = `${editInstruction} (basiert auf Referenzbild)`;

      const genResult = await generateChibiImage(
        editInstruction,
        targetBg,
        { base64Data: cleanRefBase64, mimeType: 'image/png' }
      );

      if (!genResult.success || !genResult.base64Data) {
        return NextResponse.json(
          { error: genResult.error || 'Bildanpassung fehlgeschlagen.' },
          { status: 500 }
        );
      }

      imageBuffer = Buffer.from(genResult.base64Data, 'base64');
    } else {
      // Generate using Gemini 2.5 Flash Image API with matching background color and optional style references
      isAi = true;
      const targetBg = backgroundColorHex || post.colors?.topBg;
      let resolvedStyleImages: Array<{ base64Data: string; mimeType?: string }> = styleImages ? [...styleImages] : [];

      if (styleSetId && resolvedStyleImages.length === 0) {
        try {
          const sets = await getImageSets();
          const targetSet = sets.find((s) => s.id === styleSetId);
          if (targetSet && targetSet.images) {
            assetPrompt = `${assetPrompt} (im Stil von ${targetSet.name})`;
            for (const item of targetSet.images.slice(0, 3)) {
              if (item.filename) {
                const buf = await getImageSetAsset(targetSet.id, item.filename);
                if (buf) {
                  resolvedStyleImages.push({
                    base64Data: buf.toString('base64'),
                    mimeType: item.filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Error loading style set assets:', err);
        }
      }

      const genResult = await generateChibiImage(assetPrompt, targetBg, undefined, resolvedStyleImages.length > 0 ? resolvedStyleImages : undefined);

      if (!genResult.success || !genResult.base64Data) {
        return NextResponse.json(
          { error: genResult.error || 'Bildgenerierung fehlgeschlagen.' },
          { status: 500 }
        );
      }

      imageBuffer = Buffer.from(genResult.base64Data, 'base64');
    }

    // Save with unique timestamp filename so previous images are NEVER overwritten
    const timestamp = Date.now();
    const filename = `gen_${timestamp}.png`;
    await saveGalleryAsset(id, filename, imageBuffer);

    const newAsset: GalleryAsset = {
      id: `asset_${timestamp}`,
      filename,
      url: `/api/posts/${id}/gallery/${filename}`,
      prompt: assetPrompt,
      createdAt: new Date().toISOString(),
      isAiGenerated: isAi,
    };

    // Append to post's gallery array
    if (!post.gallery) post.gallery = [];
    post.gallery.unshift(newAsset); // Newest first

    // Also update character.png as active fallback
    await savePostMeta(post);

    return NextResponse.json({
      success: true,
      asset: newAsset,
      gallery: post.gallery,
    });
  } catch (error: any) {
    console.error('Error in gallery route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
