import { NextRequest, NextResponse } from 'next/server';
import { getImageSets, saveImageSet, deleteImageSet, setDefaultImageSet } from '@/lib/storage';

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const sets = await getImageSets();
    const set = sets.find((s) => s.id === params.id);
    if (!set) {
      return NextResponse.json({ error: 'Bilderset nicht gefunden.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, imageSet: set });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    await deleteImageSet(id);
    const sets = await getImageSets();
    return NextResponse.json({ success: true, imageSets: sets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await req.json();

    if (body.isDefault === true) {
      const sets = await setDefaultImageSet(id);
      const target = sets.find((s) => s.id === id);
      return NextResponse.json({ success: true, imageSet: target, imageSets: sets });
    }

    const sets = await getImageSets();
    const targetSet = sets.find((s) => s.id === id);
    if (!targetSet) {
      return NextResponse.json({ error: 'Bilderset nicht gefunden.' }, { status: 404 });
    }

    if (body.name) targetSet.name = body.name;
    if (body.description !== undefined) targetSet.description = body.description;
    if (Array.isArray(body.images)) targetSet.images = body.images;

    await saveImageSet(targetSet);
    const updatedSets = await getImageSets();
    return NextResponse.json({ success: true, imageSet: targetSet, imageSets: updatedSets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
