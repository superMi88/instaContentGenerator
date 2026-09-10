import fs from 'fs/promises';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import React from 'react';
import { PostColors, SlideLayoutType, PostMeta, SlideItem } from '@/types/post';
import { savePostAsset, getPostAsset, getGalleryAsset, getImageSetAsset } from '@/lib/storage';

export interface RenderSlideOptions {
  slideNumber: number;
  totalSlides: number;
  layoutType: SlideLayoutType;
  category?: string;
  text?: string;
  colors: PostColors;
  characterBase64?: string;
  imageZoom?: number;
  footerText?: string;
}

let cachedBoldFont: Buffer | null = null;
let cachedMediumFont: Buffer | null = null;

async function getFonts() {
  if (!cachedBoldFont) {
    const boldPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
    cachedBoldFont = await fs.readFile(boldPath);
  }
  if (!cachedMediumFont) {
    const mediumPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Medium.ttf');
    cachedMediumFont = await fs.readFile(mediumPath);
  }
  return [
    {
      name: 'Inter',
      data: cachedBoldFont,
      weight: 700 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: cachedMediumFont,
      weight: 500 as const,
      style: 'normal' as const,
    },
  ];
}

async function getDefaultCharacterBase64(slideNumber: number): Promise<string> {
  const filename = slideNumber % 2 === 1 ? 'chibi_boy.jpg' : 'chibi_girl.jpg';
  const filePath = path.join(process.cwd(), 'public', 'assets', 'characters', filename);
  try {
    const buf = await fs.readFile(filePath);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

const emojiCache = new Map<string, string>();

function getEmojiCodePoint(emoji: string): string {
  const cleaned = emoji.indexOf('\u200D') < 0 ? emoji.replace(/\uFE0F/g, '') : emoji;
  return Array.from(cleaned).map((c) => c.codePointAt(0)?.toString(16) || '').join('-');
}

async function loadEmojiSvg(segment: string): Promise<string | undefined> {
  if (emojiCache.has(segment)) {
    return emojiCache.get(segment);
  }
  const codePoint = getEmojiCodePoint(segment);
  if (!codePoint) return undefined;

  const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoint}.svg`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const svgText = await res.text();
      const base64 = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`;
      emojiCache.set(segment, base64);
      return base64;
    }
  } catch (err) {
    console.warn(`[renderSlideToPng] Failed to fetch emoji SVG for "${segment}" (${codePoint}):`, err);
  }
  return undefined;
}

function calculateFontSize(text: string, isFullSlide: boolean = false): { fontSize: number; lineHeight: number } {
  const len = (text || '').trim().length;
  if (isFullSlide) {
    if (len < 60) return { fontSize: 72, lineHeight: 1.4 };
    if (len < 120) return { fontSize: 60, lineHeight: 1.45 };
    if (len < 220) return { fontSize: 50, lineHeight: 1.48 };
    return { fontSize: 42, lineHeight: 1.5 };
  } else {
    if (len < 70) return { fontSize: 60, lineHeight: 1.35 };
    if (len < 130) return { fontSize: 52, lineHeight: 1.38 };
    if (len < 220) return { fontSize: 44, lineHeight: 1.4 };
    return { fontSize: 38, lineHeight: 1.42 };
  }
}

/**
 * Renders a single 1080x1350 px Instagram slide based on its layout type.
 */
export async function renderSlideToPng(options: RenderSlideOptions): Promise<Buffer> {
  const {
    slideNumber,
    totalSlides,
    layoutType = 'bild_mit_text',
    category = 'COMMUNITY',
    text = '',
    colors,
    characterBase64: customChar,
    imageZoom = 1,
    footerText,
  } = options;

  const characterImage = customChar || (await getDefaultCharacterBase64(slideNumber));
  const fonts = await getFonts();

  let slideElement: React.ReactNode;

  // Category Badge element - Proportional to Live Editor text-[11px] uppercase (33px font, 12x36px padding)
  const categoryElement = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 36px',
        borderRadius: '999px',
        backgroundColor: `${colors.categoryColor}20`,
        border: `2px solid ${colors.categoryColor}50`,
      },
    },
    React.createElement(
      'span',
      {
        style: {
          fontSize: '33px',
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: colors.categoryColor,
        },
      },
      category || 'COMMUNITY'
    )
  );

  // Footer element with customizable text & crisp Vector SVG Chevron (matching Live Editor)
  const renderFooter = (custom?: string, isLast?: boolean, overrideColor?: string) => {
    const defaultText = isLast ? 'Deine Meinung? Kommentiere' : 'Wische nach links';
    const textToShow = (custom !== undefined && custom.trim().length > 0 ? custom : defaultText).trim();
    const iconColor = overrideColor || colors.textColor || '#FFFFFF';

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.85,
          fontSize: '32px',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: iconColor,
        },
      },
      React.createElement('span', null, textToShow),
      React.createElement(
        'svg',
        {
          width: '32',
          height: '32',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: iconColor,
          strokeWidth: '2.5',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { marginLeft: '10px' },
        },
        isLast
          ? React.createElement('path', { d: 'M6 9l6 6 6-6' })   // ChevronDown
          : React.createElement('path', { d: 'M9 18l6-6-6-6' }) // ChevronRight
      )
    );
  };

  // ==========================================
  // LAYOUT 1: Bild mit Text (50/50 Split)
  // ==========================================
  if (layoutType === 'bild_mit_text') {
    const { fontSize, lineHeight } = calculateFontSize(text, false);
    const zoomVal = Math.max(0.5, Math.min(4, imageZoom || 1));
    // Base size 864px (80% of 1080px width) fills the top half prominently with hero presence
    const imgSize = Math.round(864 * zoomVal);

    slideElement = React.createElement(
      'div',
      {
        style: {
          width: '1080px',
          height: '1350px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.bottomBg,
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
        },
      },
      // TOP HALF (1080 x 675 px) - Seamless pastel background with center-clipped zoom
      React.createElement(
        'div',
        {
          style: {
            width: '1080px',
            height: '675px',
            backgroundColor: colors.topBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          },
        },
        characterImage
          ? React.createElement('img', {
              src: characterImage,
              style: {
                width: `${imgSize}px`,
                height: `${imgSize}px`,
                maxWidth: `${imgSize}px`,
                maxHeight: `${imgSize}px`,
                flexShrink: 0,
                objectFit: 'cover',
                position: 'relative',
                zIndex: 10,
              },
            })
          : null
      ),
      // BOTTOM HALF (1080 x 675 px) - Proportions matching Live Editor
      React.createElement(
        'div',
        {
          style: {
            width: '1080px',
            height: '675px',
            backgroundColor: colors.bottomBg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '64px 80px 60px 80px',
            position: 'relative',
            boxSizing: 'border-box',
          },
        },
        categoryElement,
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: colors.textColor || '#FFFFFF',
              fontSize: `${fontSize}px`,
              fontWeight: 700,
              lineHeight,
              letterSpacing: '-1px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '16px 24px',
              boxSizing: 'border-box',
            },
          },
          text
        ),
        renderFooter(footerText, slideNumber === totalSlides)
      )
    );
  }

  // ==========================================
  // LAYOUT 2: Nur Text (Vollflächig 1080x1350)
  // ==========================================
  else if (layoutType === 'nur_text') {
    const { fontSize, lineHeight } = calculateFontSize(text, true);

    slideElement = React.createElement(
      'div',
      {
        style: {
          width: '1080px',
          height: '1350px',
          backgroundColor: colors.bottomBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '84px 96px 80px 96px',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        },
      },
      // Subtle background radial glow
      React.createElement('div', {
        style: {
          position: 'absolute',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          backgroundColor: `${colors.categoryColor}12`,
          filter: 'blur(80px)',
          display: 'flex',
        },
      }),
      categoryElement,
      // Large Centered Text
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: colors.textColor || '#FFFFFF',
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            lineHeight,
            letterSpacing: '-1px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            padding: '36px 24px',
            position: 'relative',
            zIndex: 10,
            boxSizing: 'border-box',
          },
        },
        text
      ),
      renderFooter(footerText, slideNumber === totalSlides)
    );
  }

  // ==========================================
  // LAYOUT 3: Nur Bild (Artwork 1080x1350)
  // ==========================================
  else {
    const zoomVal = Math.max(0.5, Math.min(4, imageZoom || 1));
    // Base size 1350px (100% of 1350px canvas height) covers full-bleed card artwork with zero empty top/bottom space
    const imgSize = Math.round(1350 * zoomVal);

    slideElement = React.createElement(
      'div',
      {
        style: {
          width: '1080px',
          height: '1350px',
          backgroundColor: colors.topBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        },
      },
      // Centered Large Artwork - Seamless blend with center-clipped zoom
      characterImage
        ? React.createElement('img', {
            src: characterImage,
            style: {
              width: `${imgSize}px`,
              height: `${imgSize}px`,
              maxWidth: `${imgSize}px`,
              maxHeight: `${imgSize}px`,
              flexShrink: 0,
              objectFit: 'cover',
              position: 'relative',
              zIndex: 10,
            },
          })
        : null,
      // Floating bottom pill with footer text
      React.createElement(
        'div',
        {
          style: {
            position: 'absolute',
            bottom: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            zIndex: 20,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              padding: '14px 40px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          renderFooter(footerText, slideNumber === totalSlides, '#0f172a')
        )
      )
    );
  }

  // Generate SVG from JSX using Satori with full Twemoji Unicode Emoji support
  const svg = await satori(slideElement, {
    width: 1080,
    height: 1350,
    fonts: fonts,
    loadAdditionalAsset: async (languageCode, segment) => {
      if (languageCode === 'emoji') {
        const res = await loadEmojiSvg(segment);
        return res || '';
      }
      return [];
    },
  });

  // Render SVG to sharp PNG via Resvg
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1080,
    },
  });

  return resvg.render().asPng();
}

async function bufferToDataUrl(buf: Buffer): Promise<string> {
  try {
    // If it's already a standard PNG buffer, return directly
    const isStandardPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (isStandardPng) {
      return `data:image/png;base64,${buf.toString('base64')}`;
    }

    // Convert any JPEG (progressive/CMYK/etc), WebP, GIF, or EXIF-rotated image into clean, uncompressed PNG
    const pngBuf = await sharp(buf).rotate().png().toBuffer();
    return `data:image/png;base64,${pngBuf.toString('base64')}`;
  } catch (err) {
    console.warn('[renderer] sharp conversion fallback:', err);
    let mimeType = 'image/png';
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      mimeType = 'image/jpeg';
    } else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
      mimeType = 'image/webp';
    }
    return `data:${mimeType};base64,${buf.toString('base64')}`;
  }
}

/**
 * Resolves image base64 from a slide's imageUrl or fallback.
 */
async function resolveSlideImageBase64(postId: string, slide: SlideItem): Promise<string | undefined> {
  if (slide.imageUrl) {
    // 0. If it's already a data URL, normalize via sharp
    if (slide.imageUrl.startsWith('data:')) {
      try {
        const cleanBase64 = slide.imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(cleanBase64, 'base64');
        return await bufferToDataUrl(buf);
      } catch {
        return slide.imageUrl;
      }
    }

    // 1. Check if it references public character presets
    if (slide.imageUrl.includes('/assets/characters/')) {
      const filename = decodeURIComponent(slide.imageUrl.split('/assets/characters/').pop()?.split('?')[0] || '');
      if (filename) {
        try {
          const pubPath = path.join(process.cwd(), 'public', 'assets', 'characters', filename);
          const buf = await fs.readFile(pubPath);
          return await bufferToDataUrl(buf);
        } catch {}
      }
    }

    // 2. Check if it references global image-sets: /api/image-sets/:setId/(assets/)?filename
    if (slide.imageUrl.includes('/image-sets/')) {
      const match = slide.imageUrl.match(/\/image-sets\/([^/]+)\/(?:assets\/)?([^/?#]+)/);
      if (match) {
        const [, setId, rawFilename] = match;
        const filename = decodeURIComponent(rawFilename.split('?')[0]);
        const buf = await getImageSetAsset(setId, filename);
        if (buf) return await bufferToDataUrl(buf);
      }
    }

    // 3. Check if it references any post's gallery or assets: /api/posts/:targetPostId/(gallery|assets)/:filename
    const postMatch = slide.imageUrl.match(/\/posts\/([^/]+)\/(gallery|assets)\/([^/?#]+)/);
    if (postMatch) {
      const [, targetPostId, assetType, rawFilename] = postMatch;
      const filename = decodeURIComponent(rawFilename.split('?')[0]);
      if (assetType === 'gallery') {
        const buf = await getGalleryAsset(targetPostId, filename);
        if (buf) return await bufferToDataUrl(buf);
      } else {
        const buf = await getPostAsset(targetPostId, filename);
        if (buf) return await bufferToDataUrl(buf);
      }
    }

    // 4. Check if it references post gallery assets locally
    if (slide.imageUrl.includes('/gallery/')) {
      const filename = decodeURIComponent(slide.imageUrl.split('/gallery/').pop()?.split('?')[0] || '');
      if (filename) {
        const buf = await getGalleryAsset(postId, filename);
        if (buf) return await bufferToDataUrl(buf);
      }
    }

    // 5. Check if it references post-specific assets locally
    if (slide.imageUrl.includes('/assets/')) {
      const filename = decodeURIComponent(slide.imageUrl.split('/assets/').pop()?.split('?')[0] || '');
      if (filename && filename !== 'character.png') {
        const buf = await getPostAsset(postId, filename);
        if (buf) return await bufferToDataUrl(buf);
      }
    }

    // 6. Check if it is a public file in /public/
    if (slide.imageUrl.startsWith('/')) {
      try {
        const cleanPath = decodeURIComponent(slide.imageUrl.replace(/^\//, '').split('?')[0]);
        const pubPath = path.join(process.cwd(), 'public', cleanPath);
        const buf = await fs.readFile(pubPath);
        return await bufferToDataUrl(buf);
      } catch {}
    }

    // 7. Check if it is an external URL (http/https)
    if (slide.imageUrl.startsWith('http://') || slide.imageUrl.startsWith('https://')) {
      try {
        const res = await fetch(slide.imageUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuffer);
          return await bufferToDataUrl(buf);
        }
      } catch (err) {
        console.error('Failed to fetch external slide image in renderer:', err);
      }
    }
  }

  // Fallback to post's character.png
  const charBuf = await getPostAsset(postId, 'character.png');
  if (charBuf) {
    return await bufferToDataUrl(charBuf);
  }

  return getDefaultCharacterBase64(slide.slideNumber || 1);
}

/**
 * Renders all slides in a post and saves slide_1.png, slide_2.png, ... slide_N.png
 */
export async function renderAllPostSlides(post: PostMeta): Promise<string[]> {
  const slides = post.slides || [];
  const totalSlides = slides.length;
  const urls: string[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideNumber = i + 1;
    const filename = `slide_${slideNumber}.png` as const;

    const characterBase64 = await resolveSlideImageBase64(post.id, slide);

    const buffer = await renderSlideToPng({
      slideNumber,
      totalSlides,
      layoutType: slide.layoutType,
      category: slide.category || post.category,
      text: slide.text,
      colors: post.colors,
      characterBase64,
      imageZoom: slide.imageZoom || 1,
      footerText: slide.footerText,
    });

    await savePostAsset(post.id, filename as any, buffer);
    urls.push(`/api/posts/${post.id}/assets/${filename}?t=${timestamp}`);
  }

  return urls;
}
