import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { 
  PostMeta, 
  SlideItem, 
  GalleryAsset, 
  ChatMessage, 
  ToolExecution, 
  ImageSet, 
  SlideLayoutType 
} from '@/types/post';
import { listPosts, getPostMeta, saveGalleryAsset, getGalleryAsset, getImageSetAsset, getImageSets } from './storage';
import { generateChibiImage } from './gemini-image';
import { PRESET_THEMES } from './gemini';

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY oder GEMINI_API_KEY ist in der Umgebung (.env) nicht definiert.');
  }
  return new GoogleGenerativeAI(apiKey);
}

// 1. Tool Declarations for Gemini
const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_previous_posts',
    description: 'Liest vorherige Instagram-Karussell-Posts aus der Datenbank aus, um den Stil, typische Fragen, Antworten, Farbschemata und Tonalität zu analysieren. Nutze dieses Tool, wenn der Nutzer nach alten Posts fragt oder das Karussell an den bisherigen Stil anpassen möchte.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.INTEGER,
          description: 'Anzahl der vorherigen Posts, die analysiert werden sollen (Standard: 4, maximal: 10)',
        },
      },
    },
  },
  {
    name: 'update_slide',
    description: 'Passt gezielt einen einzelnen Slide im aktuellen Karussell an (z. B. Text ändern, Layout anpassen, Zoom oder Position ändern). Lässt alle anderen Slides vollkommen unberührt.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slideNumber: {
          type: SchemaType.INTEGER,
          description: '1-basierte Nummer des Slides (z. B. 1 für Slide 1, 2 für Slide 2)',
        },
        text: {
          type: SchemaType.STRING,
          description: 'Neuer Haupttext für diesen Slide',
        },
        subText: {
          type: SchemaType.STRING,
          description: 'Optionaler Untertitel oder zusätzliche Erläuterung',
        },
        category: {
          type: SchemaType.STRING,
          description: 'Kategorie für den Slide-Header ("Meine Suche", "Über mich", "Liebe & Beziehung")',
        },
        layoutType: {
          type: SchemaType.STRING,
          description: 'Layout des Slides: "bild_mit_text", "nur_text" oder "nur_bild"',
        },
        footerText: {
          type: SchemaType.STRING,
          description: 'Fußzeilentext (z. B. "Wische nach links 👈", "Deine Meinung?")',
        },
        imageZoom: {
          type: SchemaType.NUMBER,
          description: 'Zoomfaktor des Bildes (z. B. 0.6 bis 2.5)',
        },
        imageOffsetX: {
          type: SchemaType.NUMBER,
          description: 'Horizontale Positionierung des Bildes in Prozent (-75 bis 75)',
        },
        imageOffsetY: {
          type: SchemaType.NUMBER,
          description: 'Vertikale Positionierung des Bildes in Prozent (-75 bis 75)',
        },
      },
      required: ['slideNumber'],
    },
  },
  {
    name: 'update_carousel',
    description: 'Erstellt oder überschreibt das gesamte Karussell (Thema, Kategorie, Slide 1 Frage, Slide 2 Antwort, Caption und Farbpalette). Nutze dieses Tool NUR, wenn der Nutzer explizit ein neues Thema generieren oder das gesamte Karussell neu aufsetzen möchte.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: {
          type: SchemaType.STRING,
          description: 'Thema oder Kurztitel des Posts',
        },
        category: {
          type: SchemaType.STRING,
          description: 'Hauptkategorie: "Meine Suche", "Über mich" oder "Liebe & Beziehung"',
        },
        slide1_question: {
          type: SchemaType.STRING,
          description: 'Frage oder These an die Community für Slide 1',
        },
        slide2_answer: {
          type: SchemaType.STRING,
          description: 'Persönliche, pointierte Antwort / Meinung für Slide 2',
        },
        character_prompt: {
          type: SchemaType.STRING,
          description: 'Englischer Bildprompt für den Chibi-Charakter inklusive einheitlicher Hintergrundfarbe',
        },
        instagram_caption: {
          type: SchemaType.STRING,
          description: 'Vollständiger Instagram Caption-Text mit Begleittext, Emojis, Call-to-Action und Hashtags',
        },
      },
      required: ['category', 'slide1_question', 'slide2_answer', 'instagram_caption'],
    },
  },
  {
    name: 'add_slide',
    description: 'Fügt dem aktuellen Karussell einen weiteren neuen Slide hinzu.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        text: {
          type: SchemaType.STRING,
          description: 'Textinhalt des neuen Slides',
        },
        layoutType: {
          type: SchemaType.STRING,
          description: 'Layout-Typ ("bild_mit_text", "nur_text", "nur_bild")',
        },
        category: {
          type: SchemaType.STRING,
          description: 'Kategorie des Slides',
        },
        subText: {
          type: SchemaType.STRING,
          description: 'Optionaler Untertitel',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'delete_slide',
    description: 'Entfernt einen Slide anhand seiner Slide-Nummer aus dem Karussell.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slideNumber: {
          type: SchemaType.INTEGER,
          description: '1-basierte Nummer des zu entfernenden Slides',
        },
      },
      required: ['slideNumber'],
    },
  },
  {
    name: 'update_instagram_caption',
    description: 'Aktualisiert die Instagram Caption (Begleittext, Call-to-Action und Hashtags) des Beitrags.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        caption: {
          type: SchemaType.STRING,
          description: 'Der neue vollständige Caption-Text für Instagram',
        },
      },
      required: ['caption'],
    },
  },
  {
    name: 'generate_image_for_slide',
    description: 'Generiert ein neues KI-Bild (Chibi/Anime-Stil) für einen bestimmten Slide und platziert es darauf. Beachtet die Hintergrundfarbe des Oberen Bereichs.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slideNumber: {
          type: SchemaType.INTEGER,
          description: 'Nummer des Slides, für den das Bild bestimmt ist (z. B. 1 oder 2)',
        },
        prompt: {
          type: SchemaType.STRING,
          description: 'Detaillierter englischer Bildprompt für den Chibi-Charakter (z. B. "cute chibi girl drinking matcha latte, smiling, vector art, flat background")',
        },
        styleSetId: {
          type: SchemaType.STRING,
          description: 'Optionale ID des Bildersets, dessen Stil als Referenz genutzt werden soll',
        },
      },
      required: ['slideNumber', 'prompt'],
    },
  },
  {
    name: 'edit_image_for_slide',
    description: 'Bearbeitet das bestehende Bild eines Slides multimodal per Bild-zu-Bild (z. B. Mimik ändern, Kleidung anpassen, Accessoires hinzufügen/entfernen), während der Charakterstil und die Identität erhalten bleiben.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slideNumber: {
          type: SchemaType.INTEGER,
          description: 'Nummer des Slides, dessen Bild bearbeitet werden soll',
        },
        instruction: {
          type: SchemaType.STRING,
          description: 'Konkrete Änderungsanweisung (z. B. "Figur soll lächeln und einen Einkaufskorb halten", "Hintergrundfarbe auf Oberen Hintergrund anpassen")',
        },
      },
      required: ['slideNumber', 'instruction'],
    },
  },
];

export interface AgentChatResult {
  message: string;
  toolExecutions: ToolExecution[];
  updatedPost: PostMeta;
  hasModifications: boolean;
}

/**
 * Helper to resolve image buffer from various image URLs in the system
 */
async function resolveImageBuffer(imageUrl: string, postId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    if (imageUrl.includes('/gallery/')) {
      const filename = imageUrl.split('/gallery/').pop()?.split('?')[0];
      if (filename) {
        const buf = await getGalleryAsset(postId, filename);
        if (buf) return { buffer: buf, mimeType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg' };
      }
    } else if (imageUrl.includes('/api/image-sets/')) {
      const match = imageUrl.match(/\/api\/image-sets\/([^/]+)\/assets\/([^/?#]+)/);
      if (match) {
        const [, setId, filename] = match;
        const buf = await getImageSetAsset(setId, filename);
        if (buf) return { buffer: buf, mimeType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg' };
      }
    } else if (imageUrl.startsWith('/assets/')) {
      const relPath = path.join(process.cwd(), 'public', imageUrl);
      const buf = await fs.readFile(relPath);
      if (buf) return { buffer: buf, mimeType: imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg' };
    }
  } catch (err) {
    console.error('Error resolving image buffer for URL:', imageUrl, err);
  }
  return null;
}

/**
 * Executes a conversational turn with tool calling for the KI-Content Assistant.
 */
export async function runAgentConversation(
  userPrompt: string,
  history: ChatMessage[],
  currentPost: PostMeta,
  availableImageSets: ImageSet[] = []
): Promise<AgentChatResult> {
  const genAI = getGeminiClient();

  // Create mutable working copy of current post
  let workingPost: PostMeta = JSON.parse(JSON.stringify(currentPost));
  let hasModifications = false;
  const executedTools: ToolExecution[] = [];

  // Build descriptive system instruction including current project state
  const slidesSummary = workingPost.slides
    .map(
      (s) =>
        `- Slide ${s.slideNumber}: [Layout: ${s.layoutType}] [Kategorie: ${s.category || 'keine'}] [Text: "${s.text}"] [Bild: ${s.imageUrl ? 'vorhanden' : 'keins'}] [Zoom: ${s.imageZoom ?? 1.0}, OffsetX: ${s.imageOffsetX ?? 0}%, OffsetY: ${s.imageOffsetY ?? 0}%]`
    )
    .join('\n');

  const imageSetsSummary = availableImageSets.length > 0
    ? availableImageSets.map((s) => `- Set "${s.name}" (ID: ${s.id}, ${s.images?.length || 0} Bilder)`).join('\n')
    : 'Keine Bildersets verfügbar.';

  const systemInstruction = `
Du bist der persönliche KI-Content-Assistent und Social-Media-Stratege für Instagram-Karussell-Posts.
Du hilfst dem Nutzer, hochwertige, virale und emotional ansprechende Karussells zu erstellen und zu optimieren.

AKTUELLES PROJEKT:
- ID: ${workingPost.id}
- Thema: ${workingPost.topic || 'Noch kein Thema festgelegt'}
- Hauptkategorie: ${workingPost.category || 'Liebe & Beziehung'}
- Farben: Oberer Hintergrund (topBg): ${workingPost.colors?.topBg || '#F0FDF4'}, Unterer Hintergrund (bottomBg): ${workingPost.colors?.bottomBg || '#065F46'}
- Instagram Caption: ${workingPost.instagram_caption || 'Noch keine Caption'}

AKTUELLE SLIDES IM KARUSSELL:
${slidesSummary}

VERFÜGBARE BILDERSETS:
${imageSetsSummary}

VERHALTENSREGELN:
1. FREIES CHATTEN & BERATEN:
   - Wenn der Nutzer einfach mit dir schreibt, dich begrüßt, Fragen stellt, nach Feedback fragt oder Ideen diskutiert: Antworte freundlich, sympathisch und professionell auf Deutsch, OHNE ein Tool aufzurufen!
   - Verändere das Karussell NIEMALS automatisch, wenn der Nutzer nur schreibt oder brainstormt.

2. GEZIELTE SLIDE-ÄNDERUNGEN:
   - Wenn der Nutzer sagt: "Bei Slide 1 soll xy anders sein", "kürze Slide 2", "ändere die Kategorie von Slide 1", rufe das Tool 'update_slide' auf.
   - Ändere NUR den angegebenen Slide. Die anderen Slides bleiben 100% unverändert!

3. ALTE POSTS ANALYSIEREN:
   - Wenn der Nutzer nach deinen früheren Posts fragt oder wissen möchte, wie der Stil vorher war: Rufe 'get_previous_posts' auf. Nutze die Antwort, um dem Nutzer fundiert über bisherige Themen, Formulierungen und Stile zu berichten.

4. BILDER GENERIEREN & BEARBEITEN:
   - Wenn der Nutzer ein neues Bild für einen Slide möchte: Rufe 'generate_image_for_slide' auf.
   - Wenn der Nutzer ein bestehendes Bild auf einem Slide anpassen möchte (z. B. Mimik ändern, Korb in die Hand geben, Hintergrundfarbe korrigieren): Rufe 'edit_image_for_slide' auf.

5. GANZES KARUSSELL NEU KONZIPIEREN:
   - Rufe 'update_carousel' NUR auf, wenn der Nutzer explizit ein neues Thema generieren möchte oder das Karussell komplett von Grund auf neu erstellen lassen will.

Antworte immer auf Deutsch, klar strukturiert und sympathisch.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    systemInstruction,
    generationConfig: {
      temperature: 0.7,
    },
  });

  // Prepare chat history
  const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

  // Filter and map existing history (keeping text contents)
  for (const msg of history) {
    if (msg.content && msg.content.trim()) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  const chat = model.startChat({ history: contents });
  let response = await chat.sendMessage(userPrompt);

  // Multi-turn tool loop (up to 5 turns to prevent infinite execution)
  let loopCount = 0;
  const MAX_TURNS = 5;

  while (loopCount < MAX_TURNS) {
    loopCount++;
    const functionCalls = response.response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) {
      break;
    }

    const functionResponses: any[] = [];

    for (const call of functionCalls) {
      const name = call.name;
      const args = (call.args || {}) as Record<string, any>;

      try {
        if (name === 'get_previous_posts') {
          const limit = (args.limit as number) || 4;
          const allSummaries = await listPosts();
          const pastPosts = [];

          for (const item of allSummaries.slice(0, limit + 2)) {
            if (item.id !== workingPost.id) {
              const full = await getPostMeta(item.id);
              if (full) {
                pastPosts.push({
                  id: full.id,
                  topic: full.topic,
                  category: full.category,
                  colors: full.colors,
                  slide1_question: full.slide1_question,
                  slide2_answer: full.slide2_answer,
                  slides: full.slides.map((s) => ({
                    slideNumber: s.slideNumber,
                    text: s.text,
                    layoutType: s.layoutType,
                  })),
                  instagram_caption: full.instagram_caption,
                  createdAt: full.createdAt,
                });
                if (pastPosts.length >= limit) break;
              }
            }
          }

          executedTools.push({
            toolName: 'get_previous_posts',
            label: `${pastPosts.length} ältere Posts analysiert`,
            details: { count: pastPosts.length },
          });

          functionResponses.push({
            functionResponse: {
              name,
              response: {
                count: pastPosts.length,
                posts: pastPosts,
              },
            },
          });
        } else if (name === 'update_slide') {
          const slideNumber = Number(args.slideNumber) || 1;
          const slideIdx = slideNumber - 1;

          if (slideIdx >= 0 && slideIdx < workingPost.slides.length) {
            const targetSlide = { ...workingPost.slides[slideIdx] };

            if (args.text !== undefined) targetSlide.text = String(args.text);
            if (args.subText !== undefined) targetSlide.subText = String(args.subText);
            if (args.category !== undefined) targetSlide.category = String(args.category);
            if (args.layoutType !== undefined) targetSlide.layoutType = args.layoutType as SlideLayoutType;
            if (args.footerText !== undefined) targetSlide.footerText = String(args.footerText);
            if (args.imageZoom !== undefined) targetSlide.imageZoom = Number(args.imageZoom);
            if (args.imageOffsetX !== undefined) targetSlide.imageOffsetX = Number(args.imageOffsetX);
            if (args.imageOffsetY !== undefined) targetSlide.imageOffsetY = Number(args.imageOffsetY);

            workingPost.slides[slideIdx] = targetSlide;

            if (slideIdx === 0 && args.text !== undefined) {
              workingPost.slide1_question = String(args.text);
            }
            if (slideIdx === 1 && args.text !== undefined) {
              workingPost.slide2_answer = String(args.text);
            }

            hasModifications = true;

            executedTools.push({
              toolName: 'update_slide',
              label: `Slide ${slideNumber} angepasst`,
              details: { slideNumber, ...args },
            });

            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'success', message: `Slide ${slideNumber} erfolgreich aktualisiert.` },
              },
            });
          } else {
            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'error', message: `Slide ${slideNumber} existiert nicht.` },
              },
            });
          }
        } else if (name === 'update_carousel') {
          if (args.topic) workingPost.topic = String(args.topic);
          if (args.category) {
            workingPost.category = String(args.category);
            const preset = PRESET_THEMES[String(args.category)];
            if (preset) {
              workingPost.colors = { ...workingPost.colors, ...preset };
            }
          }
          if (args.slide1_question) {
            workingPost.slide1_question = String(args.slide1_question);
            if (workingPost.slides.length >= 1) {
              workingPost.slides[0] = {
                ...workingPost.slides[0],
                text: String(args.slide1_question),
                category: workingPost.category,
              };
            }
          }
          if (args.slide2_answer) {
            workingPost.slide2_answer = String(args.slide2_answer);
            if (workingPost.slides.length >= 2) {
              workingPost.slides[1] = {
                ...workingPost.slides[1],
                text: String(args.slide2_answer),
                category: workingPost.category,
              };
            }
          }
          if (args.character_prompt) {
            workingPost.character_prompt = String(args.character_prompt);
          }
          if (args.instagram_caption) {
            workingPost.instagram_caption = String(args.instagram_caption);
          }

          hasModifications = true;

          executedTools.push({
            toolName: 'update_carousel',
            label: 'Karussell-Konzept aktualisiert',
            details: { category: workingPost.category, topic: workingPost.topic },
          });

          functionResponses.push({
            functionResponse: {
              name,
              response: { status: 'success', message: 'Karussell erfolgreich aktualisiert.' },
            },
          });
        } else if (name === 'add_slide') {
          const nextNum = workingPost.slides.length + 1;
          const fallbackImage = workingPost.gallery[0]?.url || '/assets/characters/chibi_boy.jpg';
          const newSlide: SlideItem = {
            id: `slide_${Date.now()}_${nextNum}`,
            slideNumber: nextNum,
            layoutType: (args.layoutType as SlideLayoutType) || 'bild_mit_text',
            category: (args.category as string) || workingPost.category,
            text: String(args.text || ''),
            subText: args.subText ? String(args.subText) : undefined,
            imageUrl: fallbackImage,
          };

          workingPost.slides.push(newSlide);
          hasModifications = true;

          executedTools.push({
            toolName: 'add_slide',
            label: `Slide ${nextNum} hinzugefügt`,
            details: { slideNumber: nextNum, text: args.text },
          });

          functionResponses.push({
            functionResponse: {
              name,
              response: { status: 'success', slideNumber: nextNum },
            },
          });
        } else if (name === 'delete_slide') {
          const slideNumber = Number(args.slideNumber);
          const slideIdx = slideNumber - 1;

          if (workingPost.slides.length > 1 && slideIdx >= 0 && slideIdx < workingPost.slides.length) {
            workingPost.slides = workingPost.slides
              .filter((_, i) => i !== slideIdx)
              .map((s, i) => ({ ...s, slideNumber: i + 1 }));

            hasModifications = true;

            executedTools.push({
              toolName: 'delete_slide',
              label: `Slide ${slideNumber} gelöscht`,
              details: { slideNumber },
            });

            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'success', remainingSlides: workingPost.slides.length },
              },
            });
          } else {
            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'error', message: 'Slide kann nicht gelöscht werden.' },
              },
            });
          }
        } else if (name === 'update_instagram_caption') {
          workingPost.instagram_caption = String(args.caption || '');
          hasModifications = true;

          executedTools.push({
            toolName: 'update_instagram_caption',
            label: 'Instagram Caption angepasst',
          });

          functionResponses.push({
            functionResponse: {
              name,
              response: { status: 'success', message: 'Caption erfolgreich angepasst.' },
            },
          });
        } else if (name === 'generate_image_for_slide') {
          const slideNumber = Number(args.slideNumber) || 1;
          const slideIdx = slideNumber - 1;
          const prompt = String(args.prompt);
          const styleSetId = args.styleSetId ? String(args.styleSetId) : undefined;

          let styleImages: Array<{ base64Data: string; mimeType?: string }> = [];
          if (styleSetId) {
            const sets = await getImageSets();
            const targetSet = sets.find((s) => s.id === styleSetId);
            if (targetSet?.images) {
              for (const item of targetSet.images.slice(0, 3)) {
                const buf = await getImageSetAsset(targetSet.id, item.filename);
                if (buf) {
                  styleImages.push({
                    base64Data: buf.toString('base64'),
                    mimeType: item.filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
                  });
                }
              }
            }
          }

          const genResult = await generateChibiImage(
            prompt,
            workingPost.colors.topBg,
            undefined,
            styleImages.length > 0 ? styleImages : undefined
          );

          if (genResult.success && genResult.base64Data) {
            const filename = `gen_${Date.now()}.png`;
            const buffer = Buffer.from(genResult.base64Data, 'base64');
            await saveGalleryAsset(workingPost.id, filename, buffer);

            const newAsset: GalleryAsset = {
              id: `asset_${Date.now()}`,
              filename,
              url: `/api/posts/${workingPost.id}/gallery/${filename}`,
              prompt,
              createdAt: new Date().toISOString(),
              isAiGenerated: true,
            };

            workingPost.gallery = [newAsset, ...(workingPost.gallery || [])];

            if (slideIdx >= 0 && slideIdx < workingPost.slides.length) {
              workingPost.slides[slideIdx] = {
                ...workingPost.slides[slideIdx],
                imageUrl: newAsset.url,
              };
            }

            hasModifications = true;

            executedTools.push({
              toolName: 'generate_image_for_slide',
              label: `Bild für Slide ${slideNumber} generiert`,
              details: { slideNumber, prompt },
            });

            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'success', imageUrl: newAsset.url },
              },
            });
          } else {
            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'error', message: genResult.error || 'Bildgenerierung fehlgeschlagen.' },
              },
            });
          }
        } else if (name === 'edit_image_for_slide') {
          const slideNumber = Number(args.slideNumber) || 1;
          const slideIdx = slideNumber - 1;
          const instruction = String(args.instruction);

          if (slideIdx >= 0 && slideIdx < workingPost.slides.length) {
            const currentImgUrl = workingPost.slides[slideIdx].imageUrl;
            let refData: { buffer: Buffer; mimeType: string } | null = null;

            if (currentImgUrl) {
              refData = await resolveImageBuffer(currentImgUrl, workingPost.id);
            }

            if (!refData && workingPost.gallery?.length > 0) {
              refData = await resolveImageBuffer(workingPost.gallery[0].url, workingPost.id);
            }

            if (!refData) {
              refData = await resolveImageBuffer('/assets/characters/chibi_boy.jpg', workingPost.id);
            }

            if (refData) {
              const genResult = await generateChibiImage(
                instruction,
                workingPost.colors.topBg,
                { base64Data: refData.buffer.toString('base64'), mimeType: refData.mimeType }
              );

              if (genResult.success && genResult.base64Data) {
                const filename = `gen_edit_${Date.now()}.png`;
                const buffer = Buffer.from(genResult.base64Data, 'base64');
                await saveGalleryAsset(workingPost.id, filename, buffer);

                const newAsset: GalleryAsset = {
                  id: `asset_${Date.now()}`,
                  filename,
                  url: `/api/posts/${workingPost.id}/gallery/${filename}`,
                  prompt: `${instruction} (Slide ${slideNumber} angepasst)`,
                  createdAt: new Date().toISOString(),
                  isAiGenerated: true,
                };

                workingPost.gallery = [newAsset, ...(workingPost.gallery || [])];
                workingPost.slides[slideIdx] = {
                  ...workingPost.slides[slideIdx],
                  imageUrl: newAsset.url,
                };

                hasModifications = true;

                executedTools.push({
                  toolName: 'edit_image_for_slide',
                  label: `Bild auf Slide ${slideNumber} bearbeitet`,
                  details: { slideNumber, instruction },
                });

                functionResponses.push({
                  functionResponse: {
                    name,
                    response: { status: 'success', imageUrl: newAsset.url },
                  },
                });
              } else {
                functionResponses.push({
                  functionResponse: {
                    name,
                    response: { status: 'error', message: genResult.error || 'Bildbearbeitung fehlgeschlagen.' },
                  },
                });
              }
            } else {
              functionResponses.push({
                functionResponse: {
                  name,
                  response: { status: 'error', message: 'Kein Referenzbild auf Slide gefunden.' },
                },
              });
            }
          } else {
            functionResponses.push({
              functionResponse: {
                name,
                response: { status: 'error', message: `Slide ${slideNumber} existiert nicht.` },
              },
            });
          }
        }
      } catch (toolErr: any) {
        console.error(`Error executing tool ${name}:`, toolErr);
        functionResponses.push({
          functionResponse: {
            name,
            response: { status: 'error', message: toolErr.message },
          },
        });
      }
    }

    // Send function execution results back to Gemini
    response = await chat.sendMessage(functionResponses);
  }

  // Get final conversational text
  let finalMessageText = '';
  try {
    finalMessageText = response.response.text();
  } catch (err) {
    // If text was empty or had only function calls, provide friendly summary
    if (executedTools.length > 0) {
      finalMessageText = executedTools.map((t) => t.label).join(', ') + ' ausgeführt.';
    } else {
      finalMessageText = 'Ich habe deine Anfrage verarbeitet.';
    }
  }

  if (hasModifications) {
    workingPost.updatedAt = new Date().toISOString();
  }

  return {
    message: finalMessageText,
    toolExecutions: executedTools,
    updatedPost: workingPost,
    hasModifications,
  };
}
