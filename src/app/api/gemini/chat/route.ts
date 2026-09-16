import { NextRequest, NextResponse } from 'next/server';
import { runAgentConversation } from '@/lib/gemini-tools';
import { ChatMessage, PostMeta, ImageSet } from '@/types/post';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      prompt, 
      history = [], 
      currentPost, 
      imageSets = [] 
    } = body as {
      prompt: string;
      history?: ChatMessage[];
      currentPost?: PostMeta;
      imageSets?: ImageSet[];
    };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Ein gültiger Prompt oder eine Anweisung ist erforderlich.' },
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

    // Ensure a valid post structure exists even if none was passed
    const activePost: PostMeta = currentPost || {
      id: `post_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topic: '',
      category: 'Liebe & Beziehung',
      slide1_question: '',
      slide2_answer: '',
      character_prompt: '',
      instagram_caption: '',
      hashtags: [],
      colors: {
        topBg: '#FFF1F5',
        bottomBg: '#9D174D',
        textColor: '#FFFFFF',
        categoryColor: '#F43F5E',
      },
      chat_history: [],
      status: 'draft',
      scheduledAt: null,
      publishedAt: null,
      instagramPostId: null,
      error: null,
      slides: [
        {
          id: 'slide_1',
          slideNumber: 1,
          layoutType: 'bild_mit_text',
          category: 'Liebe & Beziehung',
          text: '',
          imageUrl: '/assets/characters/chibi_boy.jpg',
        },
        {
          id: 'slide_2',
          slideNumber: 2,
          layoutType: 'bild_mit_text',
          category: 'Liebe & Beziehung',
          text: '',
          imageUrl: '/assets/characters/chibi_boy.jpg',
        },
      ],
      gallery: [],
    };

    const result = await runAgentConversation(
      prompt,
      history,
      activePost,
      imageSets
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      toolExecutions: result.toolExecutions,
      updatedPost: result.hasModifications ? result.updatedPost : null,
      hasModifications: result.hasModifications,
      // Backward-compatibility fallback
      data: result.hasModifications ? result.updatedPost : null,
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
