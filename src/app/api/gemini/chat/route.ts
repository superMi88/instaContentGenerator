import { NextRequest, NextResponse } from 'next/server';
import { generateCarouselContent } from '@/lib/gemini';
import { ChatMessage } from '@/types/post';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history = [] } = body as {
      prompt: string;
      history?: ChatMessage[];
    };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Ein gültiger Prompt oder ein Thema ist erforderlich.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        {
          error:
            'GOOGLE_API_KEY oder GEMINI_API_KEY ist nicht in den Umgebungsvariablen konfiguriert.',
        },
        { status: 500 }
      );
    }

    const structuredPost = await generateCarouselContent(prompt, history);

    return NextResponse.json({
      success: true,
      data: structuredPost,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Fehler bei der Kommunikation mit dem Gemini Modell.',
      },
      { status: 500 }
    );
  }
}
