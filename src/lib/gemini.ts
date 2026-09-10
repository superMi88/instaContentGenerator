import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GeminiStructuredPost, ChatMessage, PostColors } from '@/types/post';

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY oder GEMINI_API_KEY ist in der Umgebung (.env.local) nicht definiert.');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Predefined cheerful, vibrant color palettes for the 3 core categories
export const PRESET_THEMES: Record<string, PostColors> = {
  'Meine Suche': {
    topBg: '#F0FDF4',      // Fresh Mint & Apple Pastel
    bottomBg: '#065F46',   // Vibrant Emerald Green
    textColor: '#FFFFFF',
    categoryColor: '#10B981', // Radiant Mint Accent
  },
  'Über mich': {
    topBg: '#F0F9FF',      // Bright Sky & Ice Pastel
    bottomBg: '#1E40AF',   // Optimistic Royal Blue
    textColor: '#FFFFFF',
    categoryColor: '#38BDF8', // Luminous Cyan Accent
  },
  'Liebe & Beziehung': {
    topBg: '#FFF1F5',      // Gentle Powder Rose Pastel
    bottomBg: '#9D174D',   // Cheerful Vibrant Raspberry Rose (warm & joyful)
    textColor: '#FFFFFF',
    categoryColor: '#F43F5E', // Sparkling Coral Pink
  },
};

const SYSTEM_INSTRUCTION = `
Du bist ein erfahrener Social-Media-Stratege und Content Creator für Instagram.
Deine Aufgabe ist es, virale, nachdenkliche und engagement-starke 2-Slide Karussell-Posts zu konzipieren.

Layout-Struktur der Slides:
- Slide 1: Enthält eine packende, emotional aktivierende Frage oder These an die Community (z. B. "Sollte man dem Ex nach 2 Jahren noch gratulieren?").
- Slide 2: Enthält die persönliche, differenzierte oder pointierte Meinung / Antwort darauf (z. B. "Nein. Wenn kein echter Kontakt mehr besteht, ist es meistens nur ein Vorwand, die Tür wieder einen Spalt zu öffnen.").
- Beide Slide-Texte müssen prägnant, kraftvoll und nicht zu lang sein (ideal: 10 bis 35 Wörter pro Slide), damit sie im quadratischen/vertikalen Bereich zentriert und perfekt lesbar sind.
- category: Wähle GENAU EINE der folgenden 3 Kategorien:
  1. "Meine Suche" (Themen rund um Beziehungsziele, was gesucht wird, Wünsche, No-Gos, Must-Haves)
  2. "Über mich" (Persönlichkeit, Werte, Alltag, Humor, Gedanken, Macken, Einblicke ins eigene Leben)
  3. "Liebe & Beziehung" (Dating-Fragen, Beziehungsdynamiken, Psychologie, Liebe, Trennung, Diskussionen)
- character_prompt: Eine detaillierte englische Bildbeschreibung für einen zentrierten, sympathischen Chibi-Charakter im Chibi/Anime-Illustrationsstil mit passender Mimik/Geste zum Thema. WICHTIG: Erwähne, dass der Hintergrund eine vollkommen einheitliche, flache Pastellfarbe haben soll (z.B. "on a completely solid, flat soft pastel background without gradients"), damit der Übergang zum Kartenhintergrund vollkommen nahtlos und unsichtbar ist.
- instagram_caption: Ein vollständiger, ansprechender deutscher Begleittext für Instagram mit Frage an die Community, Call-to-Action ("Was denkst du? Schreib es in die Kommentare 👇") und 5-10 passenden Hashtags.

Berücksichtige bei Folgeanfragen immer die bisherige Chat-Historie und passe die Inhalte präzise an das Feedback des Nutzers an.
`;

export async function generateCarouselContent(
  currentPrompt: string,
  history: ChatMessage[] = []
): Promise<GeminiStructuredPost> {
  const genAI = getGeminiClient();

  // Use gemini-2.5-flash for speed and accurate structured outputs
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          category: {
            type: SchemaType.STRING,
            description: 'Kategorie des Posts: "Meine Suche", "Über mich" oder "Liebe & Beziehung"',
          },
          slide1_question: {
            type: SchemaType.STRING,
            description: 'Frage an die Community für Slide 1 (prägnant, diskussionsanregend)',
          },
          slide2_answer: {
            type: SchemaType.STRING,
            description: 'Persönliche Meinung / Antwort für Slide 2',
          },
          character_prompt: {
            type: SchemaType.STRING,
            description: 'English prompt for chibi character illustration reflecting the emotion',
          },
          instagram_caption: {
            type: SchemaType.STRING,
            description: 'Fertiger Instagram Caption-Text inklusive Emojis, CTA und Hashtags',
          },
        },
        required: [
          'category',
          'slide1_question',
          'slide2_answer',
          'character_prompt',
          'instagram_caption',
        ],
      },
    },
  });

  // Build history contents
  const contents = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Append latest user prompt
  contents.push({
    role: 'user',
    parts: [{ text: currentPrompt }],
  });

  const result = await model.generateContent({ contents });
  const text = result.response.text();

  try {
    const parsed: GeminiStructuredPost = JSON.parse(text);
    
    // Match one of the 3 themes or fallback to 'Liebe & Beziehung'
    const categoryKey = Object.keys(PRESET_THEMES).find(
      (k) => parsed.category.toLowerCase().includes(k.toLowerCase())
    ) || 'Liebe & Beziehung';
    
    parsed.suggested_colors = PRESET_THEMES[categoryKey] || PRESET_THEMES['Liebe & Beziehung'];
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', text, err);
    throw new Error('Gemini hat kein gültiges JSON zurückgegeben.');
  }
}
