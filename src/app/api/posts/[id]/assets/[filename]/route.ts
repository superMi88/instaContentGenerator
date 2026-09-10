import { NextRequest, NextResponse } from 'next/server';
import { getPostAsset } from '@/lib/storage';

interface RouteParams {
  params: { id: string; filename: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, filename } = params;

    // Security check: Only allow slide_N.png and character.png
    const isValidSlide = /^slide_\d+\.png$/.test(filename);
    const isCharacter = filename === 'character.png';

    if (!isValidSlide && !isCharacter) {
      return NextResponse.json({ error: 'Ungültiger Dateiname.' }, { status: 400 });
    }

    const buffer = await getPostAsset(id, filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Datei nicht gefunden.' }, { status: 404 });
    }

    const contentType = filename.endsWith('.jpg') || filename.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png';

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Laden des Assets.' },
      { status: 500 }
    );
  }
}
