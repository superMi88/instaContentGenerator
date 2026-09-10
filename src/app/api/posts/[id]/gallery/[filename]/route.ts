import { NextRequest, NextResponse } from 'next/server';
import { getGalleryAsset } from '@/lib/storage';

interface RouteParams {
  params: { id: string; filename: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, filename } = params;

    // Sanitize filename to avoid directory traversal
    const safeFilename = pathSafe(filename);
    const buffer = await getGalleryAsset(id, safeFilename);

    if (!buffer) {
      return NextResponse.json({ error: 'Asset nicht gefunden.' }, { status: 404 });
    }

    const contentType =
      safeFilename.endsWith('.jpg') || safeFilename.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function pathSafe(file: string): string {
  return file.replace(/[^a-zA-Z0-9._-]/g, '');
}
