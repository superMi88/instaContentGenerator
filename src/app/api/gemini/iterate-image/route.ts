import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { basePrompt, userInstruction, targetBgColor } = body as {
      basePrompt: string;
      userInstruction: string;
      targetBgColor?: string;
    };

    if (!userInstruction || typeof userInstruction !== 'string') {
      return NextResponse.json(
        { error: 'Ein Änderungswunsch ist erforderlich.' },
        { status: 400 }
      );
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are an expert AI prompt engineer for anime chibi character illustrations.
Your goal is to modify an existing image prompt according to the user's specific feedback or change request (e.g. "remove hat", "make hair blonde", "change clothes to green jacket", "make them smile happily").

Rules:
1. Preserve the general character identity, chibi/anime style, and quality.
2. Accurately apply the user's requested modifications.
3. ALWAYS specify a solid, completely flat pastel background matching the color "${targetBgColor || 'soft pastel'}" without gradients or textures.
4. Output strict JSON with:
   - "updatedPrompt": The full updated English image prompt for image generation.
   - "explanation": A friendly, concise German explanation of what was modified (e.g. "Der Hut wurde entfernt und die Haare wurden angepasst.").`,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const userMessage = `Original prompt: "${basePrompt || 'Cute chibi character'}"
User instruction: "${userInstruction}"`;

    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json({
      success: true,
      updatedPrompt: parsed.updatedPrompt,
      explanation: parsed.explanation || 'Bild-Prompt erfolgreich angepasst.',
    });
  } catch (error: any) {
    console.error('Error iterating image prompt:', error);
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Anpassen des Bild-Prompts.' },
      { status: 500 }
    );
  }
}
