import { NextRequest, NextResponse } from 'next/server';
import { getImageSetAsset } from '@/lib/storage';

interface RouteParams {
  params: { id: string; filename: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, filename } = params;
    const buffer = await getImageSetAsset(id, filename);

    if (!buffer) {
      return new NextResponse('Asset nicht gefunden', { status: 404 });
    }

    const contentType = filename.endsWith('.jpg') || filename.endsWith('.jpeg')
      ? 'image/jpeg'
      : filename.endsWith('.webp')
      ? 'image/webp'
      : 'image/png';

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    return new NextResponse('Fehler beim Laden des Assets', { status: 500 });
  }
}
