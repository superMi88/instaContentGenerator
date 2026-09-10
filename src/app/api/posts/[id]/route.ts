import { NextRequest, NextResponse } from 'next/server';
import { getPostMeta, savePostMeta, deletePost } from '@/lib/storage';

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const post = await getPostMeta(params.id);
    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Laden des Beitrags.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const existing = await getPostMeta(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    const updates = await req.json();

    const updatedPost = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };

    await savePostMeta(updatedPost);

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Aktualisieren des Beitrags.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const deleted = await deletePost(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Beitrag erfolgreich gelöscht.' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Löschen des Beitrags.' },
      { status: 500 }
    );
  }
}
