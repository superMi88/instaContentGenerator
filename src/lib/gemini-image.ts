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
 * Converts a hex color string (#RRGGBB or #RGB) to RGB object.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  } else if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  }
  return null;
}

/**
 * Returns a rich, human-readable natural language color description for Gemini image models.
 */
export function getColorDescription(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r / 255: h = (g / 255 - b / 255) / d + (g < b ? 6 : 0); break;
      case g / 255: h = (b / 255 - r / 255) / d + 2; break;
      case b / 255: h = (r / 255 - g / 255) / d + 4; break;
    }
    h /= 6;
  }
  const hueDeg = Math.round(h * 360);
  const satPct = Math.round(s * 100);
  const lightPct = Math.round(l * 100);

  let tone = '';
  if (lightPct >= 95) tone = 'very light pale, near-white';
  else if (lightPct >= 85) tone = 'light pastel';
  else if (lightPct >= 70) tone = 'soft pastel';
  else if (lightPct <= 25) tone = 'deep dark';
  else if (lightPct <= 45) tone = 'dark rich';
  else tone = 'vibrant';

  let colorFamily = 'neutral';
  if (satPct < 12) {
    colorFamily = lightPct > 80 ? 'off-white' : lightPct < 30 ? 'charcoal black' : 'neutral gray';
  } else if (hueDeg >= 340 || hueDeg < 15) {
    colorFamily = 'powder rose pink';
  } else if (hueDeg >= 15 && hueDeg < 45) {
    colorFamily = 'warm peach / cream apricot';
  } else if (hueDeg >= 45 && hueDeg < 70) {
    colorFamily = 'soft cream yellow';
  } else if (hueDeg >= 70 && hueDeg < 165) {
    colorFamily = 'mint green / pale sage';
  } else if (hueDeg >= 165 && hueDeg < 200) {
    colorFamily = 'ice cyan / soft aqua';
  } else if (hueDeg >= 200 && hueDeg < 260) {
    colorFamily = 'sky blue';
  } else if (hueDeg >= 260 && hueDeg < 310) {
    colorFamily = 'lavender lilac';
  } else {
    colorFamily = 'magenta rose';
  }

  return `${tone} ${colorFamily}`;
}

/**
 * Extracts explicit hex code or color request from user prompt if specified.
 */
export function extractUserBackgroundColor(userPrompt: string): string | null {
  const hexMatch = userPrompt.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) return hexMatch[0];

  const lower = userPrompt.toLowerCase();
  if (lower.includes('hintergrund')) {
    if (lower.includes('weiß') || lower.includes('weiss') || lower.includes('white')) return '#FFFFFF';
    if (lower.includes('schwarz') || lower.includes('black')) return '#000000';
    if (lower.includes('hellblau') || lower.includes('sky blue')) return '#F0F9FF';
    if (lower.includes('hellgrün') || lower.includes('mint')) return '#F0FDF4';
    if (lower.includes('rosa') || lower.includes('pink') || lower.includes('puder')) return '#FFF1F5';
    if (lower.includes('gelb') || lower.includes('yellow')) return '#FEF9C3';
    if (lower.includes('grau') || lower.includes('grey')) return '#F3F4F6';
  }
  return null;
}

/**
 * Builds explicit background prompt instructions for Gemini vision models.
 */
export function buildBackgroundInstruction(backgroundColorHex?: string): {
  targetHex: string;
  colorName: string;
  rgb: { r: number; g: number; b: number };
} {
  const targetHex = backgroundColorHex && /^#?[0-9a-fA-F]{3,8}$/.test(backgroundColorHex)
    ? (backgroundColorHex.startsWith('#') ? backgroundColorHex : `#${backgroundColorHex}`)
    : '#F0FDF4';

  const rgb = hexToRgb(targetHex) || { r: 240, g: 253, b: 244 };
  const colorName = getColorDescription(targetHex);

  return { targetHex, colorName, rgb };
}

/**
 * Generates or edits an AI character/artwork image using gemini-3.1-flash-image (with fallback).
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

  // Detect if user instruction in prompt explicitly overrides the background color
  const userSpecifiedBg = extractUserBackgroundColor(prompt);
  const effectiveBgHex = userSpecifiedBg || backgroundColorHex || '#F0FDF4';
  const { targetHex, colorName, rgb } = buildBackgroundInstruction(effectiveBgHex);

  const parts: any[] = [];

  if (referenceImage?.base64Data) {
    // Multimodal Image Editing (Direct Image-to-Image with character consistency and background replacement)
    const cleanBase64 = referenceImage.base64Data.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: referenceImage.mimeType || 'image/png',
        data: cleanBase64,
      },
    });

    const editInstruction = `You are directly editing the character / artwork in the reference image above.
User's modification instruction: "${prompt}".

CRITICAL INSTRUCTIONS:
1. CHARACTER PRESERVATION:
   - Preserve the EXACT identity, face, eyes, hair, art style, proportions, and clothing details of the character in the reference image (unless the user specifically requested a change to them).
   - Only apply the specific requested modifications to the character.

2. MANDATORY BACKGROUND REPLACEMENT:
   - Completely REMOVE and REPLACE any existing background, room, floor, or backdrop from the reference image.
   - The entire background behind the character MUST be a 100% solid, completely flat, uniform ${colorName} color (hex: ${targetHex}, RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}).
   - There must be ZERO gradients, ZERO shadows on the background edges, ZERO floor/wall textures, and ZERO vignette.
   - Clean, sharp sticker-style edges so the character blends completely invisibly and seamlessly into a web card background of ${targetHex}.`;

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
Scene / character to depict: "${prompt}".

CRITICAL INSTRUCTIONS:
1. ART STYLE:
   - Perfectly adopt and replicate the exact visual style, drawing technique, linework, shading, coloration, and character design from the reference image(s).
2. DO NOT COPY REFERENCE BACKGROUND:
   - Do NOT copy the background colors, patterns, textures, or setting from the style reference images.
3. MANDATORY UNIFORM BACKGROUND:
   - The entire background behind the character MUST be a 100% solid, flat, uniform ${colorName} color (hex: ${targetHex}, RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}).
   - Absolutely ZERO gradients, ZERO shadows, ZERO patterns, ZERO borders.
   - Clean, sharp sticker-style edges so the character blends seamlessly into the card background of ${targetHex}.`;

    parts.push({ text: styleInstruction });
  } else {
    // Standard generation from text prompt
    const refinedPrompt = `Cute high-resolution 3D Pixar-style anime chibi character, ${prompt}. Centered composition, colorful modern outfit, expressive emotion, soft studio lighting on the character only. The entire background behind the character must be a 100% solid, flat, uniform ${colorName} color (hex: ${targetHex}, RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}), completely free of gradients, shadows, textures, or vignettes, so it blends seamlessly into a web card background of ${targetHex}. Clean edges, sharp sticker style, high detail.`;

    parts.push({ text: refinedPrompt });
  }

  // Model cascade: Use gemini-3.1-flash-image first for advanced multimodal editing, fallback to gemini-2.5-flash-image
  const candidateModels = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

  for (const modelName of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
        console.warn(`Model ${modelName} returned error:`, data?.error?.message || data);
        continue; // Try next model
      }

      const candidate = data.candidates?.[0];
      const responseParts = candidate?.content?.parts;

      let inlineDataPart = responseParts?.find((p: any) => p.inlineData?.data);
      if (!inlineDataPart?.inlineData?.data) {
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
    } catch (err: any) {
      console.warn(`Exception calling ${modelName}:`, err?.message);
    }
  }

  return {
    success: false,
    error: 'Bildgenerierung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
  };
}
