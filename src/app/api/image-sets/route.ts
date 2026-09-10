import { NextRequest, NextResponse } from 'next/server';
import { getImageSets, saveImageSet, saveImageSetAsset, setDefaultImageSet } from '@/lib/storage';
import { ImageSet, ImageSetItem } from '@/types/image-set';

export async function GET() {
  try {
    const sets = await getImageSets();
    return NextResponse.json({ success: true, imageSets: sets, sets });
  } catch (error: any) {
    console.error('Error getting image sets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, setId, name, description, filename, base64Data } = body as {
      action: 'create_set' | 'upload_image' | 'set_default';
      setId?: string;
      name?: string;
      description?: string;
      filename?: string;
      base64Data?: string;
    };

    if (action === 'set_default') {
      if (!setId) {
        return NextResponse.json({ error: 'setId ist erforderlich.' }, { status: 400 });
      }
      const sets = await setDefaultImageSet(setId);
      return NextResponse.json({ success: true, imageSets: sets, sets });
    }

    if (action === 'create_set') {
      if (!name) {
        return NextResponse.json({ error: 'Name für das Bilderset ist erforderlich.' }, { status: 400 });
      }

      const newSet: ImageSet = {
        id: `set_${Date.now()}`,
        name,
        description: description || '',
        images: [],
        createdAt: new Date().toISOString(),
      };

      await saveImageSet(newSet);
      const sets = await getImageSets();
      return NextResponse.json({ success: true, imageSet: newSet, imageSets: sets, sets });
    }

    if (action === 'upload_image') {
      if (!setId || !base64Data) {
        return NextResponse.json({ error: 'setId und base64Data sind erforderlich.' }, { status: 400 });
      }

      const sets = await getImageSets();
      const targetSet = sets.find((s) => s.id === setId);
      if (!targetSet) {
        return NextResponse.json({ error: 'Bilderset nicht gefunden.' }, { status: 404 });
      }

      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const timestamp = Date.now();
      const safeFilename = `${timestamp}_${(filename || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      await saveImageSetAsset(setId, safeFilename, buffer);

      const newItem: ImageSetItem = {
        id: `img_${timestamp}`,
        filename: safeFilename,
        url: `/api/image-sets/${setId}/assets/${safeFilename}`,
        name: filename?.replace(/\.[^/.]+$/, '') || 'Bild',
        createdAt: new Date().toISOString(),
      };

      targetSet.images.push(newItem);
      await saveImageSet(targetSet);

      const updatedSets = await getImageSets();
      return NextResponse.json({ success: true, item: newItem, imageSet: targetSet, imageSets: updatedSets });
    }

    return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in image-sets API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
