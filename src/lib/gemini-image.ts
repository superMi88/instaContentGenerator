import fs from 'fs/promises';
import path from 'path';

export interface ReferenceImage {
  base64Data: string;
  mimeType?: string;
}

export interface GenerateImageResult {
  success: boolean;
  base64Data?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Generates or edits an AI character/artwork image using the native gemini-2.5-flash-image API.
 * Supports image-to-image editing when referenceImage is passed.
 */
export async function generateChibiImage(
  prompt: string,
  backgroundColorHex?: string,
  referenceImage?: ReferenceImage,
  styleReferenceImages?: ReferenceImage[]
): Promise<GenerateImageResult> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'GOOGLE_API_KEY oder GEMINI_API_KEY ist nicht in .env.local konfiguriert.',
    };
  }

  // Refine prompt for consistent, high-quality Chibi aesthetics with seamless background color
  const bgInstruction = backgroundColorHex
    ? `The entire background behind the character must be a solid, flat, uniform color with hex code ${backgroundColorHex}. Seamless solid flat background, zero gradients, zero shadows on the background edges, perfectly flat plain color so it blends invisibly into a web background of ${backgroundColorHex}.`
    : 'solid plain pastel background, completely flat uniform color, no vignette, no background patterns.';

  const refinedPrompt = `Cute high-resolution 3D Pixar-style anime chibi character, ${prompt}. Centered composition, colorful modern outfit, expressive emotion, soft studio lighting on the character only. ${bgInstruction}. Clean edges, sticker style, sharp details.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const parts: any[] = [];

    if (referenceImage?.base64Data) {
      // Multimodal Image Editing (Direct Image-to-Image with character consistency)
      const cleanBase64 = referenceImage.base64Data.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: referenceImage.mimeType || 'image/png',
          data: cleanBase64,
        },
      });

      const editInstruction = `You are directly editing the character / artwork in the reference image above.
Modification instruction: "${prompt}".
CRITICAL REQUIREMENTS:
- Preserve the EXACT identity, face, eyes, hair, art style, proportions, and overall look of the subject in the reference image.
- Only make the specific requested changes (e.g. if instructed "der soll keinen Hut tragen" / "remove hat", remove the hat while keeping the hairstyle and face identical).
- ${bgInstruction}
- Clean edges, high quality render.`;

      parts.push({ text: editInstruction });
    } else if (styleReferenceImages && styleReferenceImages.length > 0) {
      // Style reference images from Image Set
      for (const img of styleReferenceImages.slice(0, 3)) {
        const cleanBase64 = img.base64Data.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }

      const styleInstruction = `You are generating a brand new illustration that precisely follows the artistic style of the reference image(s) above.
CRITICAL REQUIREMENTS:
- Perfectly adopt and replicate the exact visual style, drawing technique, line work, shading, coloration, character design, and aesthetic from the style reference image(s) above.
- Scene / character to depict: "${prompt}".
- ${bgInstruction}
- Clean edges, centered composition, high quality render.`;

      parts.push({ text: styleInstruction });
    } else {
      // Standard generation from text prompt
      parts.push({ text: refinedPrompt });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || 'Fehler beim Aufruf von gemini-2.5-flash-image';
      console.error('Gemini image generation error:', data);
      return { success: false, error: errMsg };
    }

    const candidate = data.candidates?.[0];
    const responseParts = candidate?.content?.parts;

    // Locate inlineData part containing the generated image
    let inlineDataPart = responseParts?.find((p: any) => p.inlineData?.data);

    if (!inlineDataPart?.inlineData?.data) {
      // Fallback check: check if any part has inline_data (snake_case)
      inlineDataPart = responseParts?.find((p: any) => p.inline_data?.data);
    }

    if (inlineDataPart) {
      const rawData = inlineDataPart.inlineData?.data || inlineDataPart.inline_data?.data;
      const mimeType = inlineDataPart.inlineData?.mimeType || inlineDataPart.inline_data?.mime_type || 'image/png';

      return {
        success: true,
        base64Data: rawData,
        mimeType,
      };
    }

    return {
      success: false,
      error: 'Gemini hat keine Bilddaten zurückgegeben. Bitte versuche einen anderen Prompt.',
    };
  } catch (error: any) {
    console.error('Exception during AI image generation:', error);
    return {
      success: false,
      error: error?.message || 'Netzwerkfehler bei der Bildgenerierung.',
    };
  }
}
