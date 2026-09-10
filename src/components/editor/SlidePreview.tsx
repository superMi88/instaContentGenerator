'use client';

import React, { useState } from 'react';
import { PostColors, SlideItem, SlideLayoutType, GalleryAsset, ImageSet } from '@/types/post';
import { PRESET_THEMES } from '@/lib/gemini';
import { GalleryBox } from './GalleryBox';
import { 
  Download, 
  Sparkles, 
  Layers, 
  Edit3, 
  Eye, 
  Camera, 
  Image as ImageIcon, 
  Type, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronLeft,
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2, 
  RefreshCw, 
  ZoomIn,
  Palette,
  Sliders,
  Calendar
} from 'lucide-react';

interface SlidePreviewProps {
  postId: string;
  category: string;
  slides: SlideItem[];
  colors: PostColors;
  gallery: GalleryAsset[];
  characterPrompt: string;
  isRendering: boolean;
  renderedSlideUrls: string[];
  onUpdateSlide: (index: number, updated: Partial<SlideItem>) => void;
  onAddSlide: () => void;
  onDeleteSlide: (index: number) => void;
  onSelectImageForSlide: (slideIndex: number, asset: GalleryAsset) => void;
  onGenerateImage: (prompt: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  onLinkAssetToChat?: (asset: GalleryAsset) => void;
  onEditImage?: (asset: GalleryAsset, instruction: string) => Promise<void>;
  onGenerateWithSetStyle?: (prompt: string, setId: string) => Promise<void>;
  onOpenImageSetModal?: () => void;
  activeImageSet?: ImageSet;
  activeImageSetName?: string;
  isGeneratingImage: boolean;
  isEditingImage?: boolean;
  onRenderPngs: () => Promise<void>;
  onColorsChange?: (colors: PostColors) => void;
  onCategoryChange?: (category: string) => void;
  onThemeSelect?: (category: string, colors: PostColors) => void;
  onOpenScheduler?: () => void;
  previewMode?: 'live' | 'rendered';
  onPreviewModeChange?: (mode: 'live' | 'rendered') => void;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  postId,
  category,
  slides,
  colors,
  gallery,
  characterPrompt,
  isRendering,
  renderedSlideUrls,
  onUpdateSlide,
  onAddSlide,
  onDeleteSlide,
  onSelectImageForSlide,
  onGenerateImage,
  onUploadImage,
  onLinkAssetToChat,
  onEditImage,
  onGenerateWithSetStyle,
  onOpenImageSetModal,
  activeImageSet,
  activeImageSetName,
  isGeneratingImage,
  isEditingImage = false,
  onRenderPngs,
  onColorsChange,
  onCategoryChange,
  onThemeSelect,
  onOpenScheduler,
  previewMode: controlledPreviewMode,
  onPreviewModeChange,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [internalPreviewMode, setInternalPreviewMode] = useState<'live' | 'rendered'>('live');
  const previewMode = controlledPreviewMode ?? internalPreviewMode;
  const setPreviewMode = (mode: 'live' | 'rendered') => {
    setInternalPreviewMode(mode);
    onPreviewModeChange?.(mode);
  };
  const [showColorDetails, setShowColorDetails] = useState<boolean>(false);

  // Keep index within bounds if a slide was deleted
  const safeSlideIndex = Math.min(currentSlideIndex, Math.max(0, slides.length - 1));

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSwitchToRendered = async () => {
    setPreviewMode('rendered');
    await onRenderPngs();
  };

  // Determine currently selected image for GalleryBox based on safeSlideIndex
  const currentSlideForImage = slides[safeSlideIndex] || slides[0];
  const currentSelectedImageUrl = currentSlideForImage?.imageUrl;

  const handleSelectAsset = (asset: GalleryAsset) => {
    onSelectImageForSlide(safeSlideIndex, asset);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 3-Step Workflow Pipeline & Live Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-2.5 rounded-2xl border border-slate-800">
        {/* Step-by-Step Navigation Bar */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
          {/* Step 1: Live-Editor */}
          <button
            onClick={() => setPreviewMode('live')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              previewMode === 'live'
                ? 'bg-indigo-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">1</span>
            <Edit3 className="w-3.5 h-3.5" />
            <span>Live-Editor</span>
          </button>

          {/* Step 2: Gerenderte PNGs */}
          <button
            onClick={handleSwitchToRendered}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              previewMode === 'rendered'
                ? 'bg-indigo-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">2</span>
            <Eye className="w-3.5 h-3.5" />
            <span>Gerenderte PNGs</span>
            {isRendering && <Camera className="w-3 h-3 animate-spin ml-1 text-indigo-200" />}
          </button>

          {/* Step 3: Planen / Posten */}
          {onOpenScheduler && (
            <button
              onClick={onOpenScheduler}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold transition-all shadow-md shadow-purple-600/20 active:scale-95 ml-1"
              title="Schritt 3: Beitrag terminieren oder direkt auf Instagram posten"
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">3</span>
              <Calendar className="w-3.5 h-3.5" />
              <span>Planen / Posten</span>
            </button>
          )}
        </div>

        {/* Live Slides Indicator */}
        <div className="text-xs text-slate-400 font-medium px-2 py-1 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>{slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}</span>
        </div>
      </div>

      {/* Color Selection & Expandable Color Codes Bar */}
      {previewMode === 'live' && (
        <div className="glass-panel p-3 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Theme Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                Farben:
              </span>
              {Object.entries(PRESET_THEMES).map(([themeName, themeColors]) => {
                const isSelected = category === themeName;
                return (
                  <button
                    key={themeName}
                    type="button"
                    onClick={() => {
                      if (onThemeSelect) {
                        onThemeSelect(themeName, themeColors);
                      } else {
                        if (onColorsChange) onColorsChange(themeColors);
                        if (onCategoryChange) onCategoryChange(themeName);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-sm ring-1 ring-indigo-500/40'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex overflow-hidden shrink-0">
                      <div className="w-1/2 h-full" style={{ backgroundColor: themeColors.topBg }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: themeColors.bottomBg }} />
                    </div>
                    <span>{themeName}</span>
                  </button>
                );
              })}
            </div>

            {/* Toggle Detailed Color Codes */}
            <button
              type="button"
              onClick={() => setShowColorDetails(!showColorDetails)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition ml-auto"
              title="Genaue Farbcodes anzeigen oder ausblenden"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showColorDetails ? 'Farbcodes verbergen' : 'Farbcodes anpassen'}</span>
              {showColorDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expandable Color Pickers */}
          {showColorDetails && (
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Oberer Hintergrund
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={colors.topBg}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, topBg: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={colors.topBg}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, topBg: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-200 font-mono outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Unterer Hintergrund
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={colors.bottomBg}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, bottomBg: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={colors.bottomBg}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, bottomBg: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-200 font-mono outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Kategorie-Farbe
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={colors.categoryColor}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, categoryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={colors.categoryColor}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, categoryColor: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-200 font-mono outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Textfarbe
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={colors.textColor || '#FFFFFF'}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, textColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={colors.textColor || '#FFFFFF'}
                    onChange={(e) => onColorsChange && onColorsChange({ ...colors, textColor: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-200 font-mono outline-none uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Slides Content: Centered Carousel with Left/Right Arrows */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {previewMode === 'rendered' ? (
          /* Rendered PNGs View (Centered Carousel) */
          isRendering ? (
            <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-center glass-panel rounded-2xl border border-slate-800 p-8">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Pixelgenaues 1080x1350 Rendering aller {slides.length} Slides läuft...</p>
                <p className="text-xs text-slate-400">Satori & Resvg erzeugen deine druckreifen PNGs</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-[530px] sm:h-[570px] flex items-center justify-center overflow-hidden py-3">
              {/* Left Navigation Arrow */}
              <button
                type="button"
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                disabled={safeSlideIndex === 0}
                className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white border border-slate-700 shadow-2xl transition-all duration-200 active:scale-95 ${
                  safeSlideIndex === 0 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:scale-110 cursor-pointer'
                }`}
                title="Vorheriger Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Centered Rendered Slides Stack */}
              <div className="relative w-full h-full flex items-center justify-center">
                {slides.map((_, idx) => {
                  const offset = idx - safeSlideIndex;
                  if (Math.abs(offset) > 1) return null;

                  const isActive = offset === 0;
                  const url = renderedSlideUrls[idx] || `/api/posts/${postId}/assets/slide_${idx + 1}.png`;

                  let transform = 'translate(-50%, -50%) scale(1)';
                  let zIndex = 20;
                  let opacity = 1;

                  if (offset === -1) {
                    transform = 'translate(calc(-50% - clamp(90px, 16vw, 145px)), -50%) scale(0.88)';
                    zIndex = 10;
                    opacity = 0.42;
                  } else if (offset === 1) {
                    transform = 'translate(calc(-50% + clamp(90px, 16vw, 145px)), -50%) scale(0.88)';
                    zIndex = 10;
                    opacity = 0.42;
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => !isActive && setCurrentSlideIndex(idx)}
                      style={{
                        transform,
                        opacity,
                        transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease, box-shadow 350ms ease',
                      }}
                      className={`absolute top-1/2 left-1/2 flex flex-col items-center shrink-0 w-[290px] sm:w-[340px] md:w-[370px] ${
                        isActive
                          ? 'z-20 shadow-2xl shadow-black/80 pointer-events-auto'
                          : 'z-10 cursor-pointer hover:opacity-75 transition-opacity'
                      }`}
                    >
                      {isActive ? (
                        <div className="flex items-center justify-between w-full mb-2 px-1">
                          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Slide {idx + 1} / {slides.length} (1080x1350 PNG)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={onRenderPngs}
                              disabled={isRendering}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition active:scale-95"
                              title="Bilder neu rendern"
                            >
                              <RefreshCw className={`w-3 h-3 text-indigo-400 ${isRendering ? 'animate-spin' : ''}`} />
                              <span>Neu rendern</span>
                            </button>
                            <button
                              onClick={() => downloadImage(url, `slide_${idx + 1}.png`)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-[11px] text-indigo-300 border border-indigo-500/30 font-medium flex items-center gap-1.5 transition"
                            >
                              <Download className="w-3 h-3" /> Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-7 mb-2 flex items-center justify-center opacity-50 text-[11px] font-semibold text-slate-400">
                          Slide {idx + 1}
                        </div>
                      )}
                      <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center relative">
                        <img
                          src={url}
                          alt={`Slide ${idx + 1} gerendert`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/assets/characters/chibi_boy.jpg';
                          }}
                        />
                        {isRendering && isActive && (
                          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 z-30 animate-fadeIn">
                            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                            <span className="text-xs font-semibold text-white tracking-wide">
                              Slides werden in 1080x1350 gerendert...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Navigation Arrow */}
              <button
                type="button"
                onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                disabled={safeSlideIndex === slides.length - 1}
                className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white border border-slate-700 shadow-2xl transition-all duration-200 active:scale-95 ${
                  safeSlideIndex === slides.length - 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:scale-110 cursor-pointer'
                }`}
                title="Nächster Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )
        ) : (
          /* Live Interactive Editable Slides (Centered Carousel) */
          <div className="relative w-full h-[540px] sm:h-[580px] flex items-center justify-center overflow-hidden py-3">
            {/* Left Navigation Arrow */}
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={safeSlideIndex === 0}
              className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white border border-slate-700 shadow-2xl transition-all duration-200 active:scale-95 ${
                safeSlideIndex === 0 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:scale-110 cursor-pointer'
              }`}
              title="Vorheriger Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Centered Live Slides Stack */}
            <div className="relative w-full h-full flex items-center justify-center">
              {slides.map((slide, idx) => {
                const offset = idx - safeSlideIndex;
                if (Math.abs(offset) > 1) return null;

                const isActive = offset === 0;
                const slideImage = slide.imageUrl || gallery[0]?.url || '/assets/characters/chibi_boy.jpg';
                const layoutType = slide.layoutType || 'bild_mit_text';

                let transform = 'translate(-50%, -50%) scale(1)';
                let zIndex = 20;
                let opacity = 1;

                if (offset === -1) {
                  transform = 'translate(calc(-50% - clamp(90px, 16vw, 145px)), -50%) scale(0.88)';
                  zIndex = 10;
                  opacity = 0.42;
                } else if (offset === 1) {
                  transform = 'translate(calc(-50% + clamp(90px, 16vw, 145px)), -50%) scale(0.88)';
                  zIndex = 10;
                  opacity = 0.42;
                }

                return (
                  <div
                    key={slide.id || idx}
                    onClick={() => !isActive && setCurrentSlideIndex(idx)}
                    style={{
                      transform,
                      opacity,
                      transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease, box-shadow 350ms ease',
                    }}
                    className={`absolute top-1/2 left-1/2 flex flex-col items-center shrink-0 w-[290px] sm:w-[340px] md:w-[370px] ${
                      isActive
                        ? 'z-20 shadow-2xl shadow-black/80 pointer-events-auto'
                        : 'z-10 cursor-pointer hover:opacity-75 transition-opacity'
                    }`}
                  >
                    {/* Top Bar for active slide: Icon-only Layout Switcher & Trash */}
                    {isActive ? (
                      <div className="w-full flex items-center justify-between mb-2 px-1 gap-2">
                        {/* Layout switcher (Icon-only) */}
                        <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => onUpdateSlide(idx, { layoutType: 'bild_mit_text' })}
                            className={`p-1.5 rounded-lg flex items-center transition ${
                              layoutType === 'bild_mit_text'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Bild & Text"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateSlide(idx, { layoutType: 'nur_text' })}
                            className={`p-1.5 rounded-lg flex items-center transition ${
                              layoutType === 'nur_text'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Nur Text"
                          >
                            <Type className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateSlide(idx, { layoutType: 'nur_bild' })}
                            className={`p-1.5 rounded-lg flex items-center transition ${
                              layoutType === 'nur_bild'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Nur Bild"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Delete button (if more than 1 slide) */}
                        {slides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSlide(idx);
                              if (safeSlideIndex >= slides.length - 1) {
                                setCurrentSlideIndex(Math.max(0, slides.length - 2));
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                            title="Diesen Slide löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-8 mb-2 flex items-center justify-center opacity-50 text-[11px] font-semibold text-slate-400">
                        Slide {idx + 1}
                      </div>
                    )}

                    {/* 4:5 Aspect Ratio Card */}
                    <div
                      className={`w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border transition-all flex flex-col relative select-none ${
                        isActive
                          ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-500/20 pointer-events-auto'
                          : 'border-slate-800 pointer-events-none'
                      }`}
                      style={{
                        backgroundColor: layoutType === 'nur_bild' ? colors.topBg : colors.bottomBg,
                      }}
                    >
                      {/* Instagram-style Slide Counter (Top Right: e.g. 1/3, 2/3) */}
                      <div className="absolute top-2.5 right-2.5 z-30 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] font-semibold text-white/90 shadow-md pointer-events-none">
                        {idx + 1}/{slides.length}
                      </div>

                      {/* LAYOUT 1: BILD MIT TEXT */}
                      {layoutType === 'bild_mit_text' && (
                        <>
                          {/* TOP HALF: Pastel Bg + Artwork */}
                          <div
                            className="w-full h-1/2 flex items-center justify-center relative overflow-hidden transition-colors group"
                            style={{ backgroundColor: colors.topBg }}
                          >
                            {/* Floating Zoom Control (Top Center) */}
                            {isActive && (
                              <div 
                                className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-lg text-slate-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ZoomIn className="w-3 h-3 text-indigo-400 shrink-0" />
                                <input
                                  type="range"
                                  min="0.6"
                                  max="3.0"
                                  step="0.05"
                                  value={slide.imageZoom ?? 1}
                                  onChange={(e) => onUpdateSlide(idx, { imageZoom: parseFloat(e.target.value) })}
                                  className="w-14 sm:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                  title="Bild-Zoomfaktor einstellen"
                                />
                                <span className="font-mono text-[9px] text-indigo-300 w-6 text-right">
                                  {Math.round((slide.imageZoom ?? 1) * 100)}%
                                </span>
                              </div>
                            )}

                            {/* Centered Image */}
                            <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
                              <img
                                src={slideImage}
                                alt="Slide Artwork"
                                className="object-cover transition-transform duration-75 ease-out select-none pointer-events-none"
                                style={{
                                  width: `${Math.round(320 * (slide.imageZoom ?? 1))}px`,
                                  height: `${Math.round(320 * (slide.imageZoom ?? 1))}px`,
                                  maxWidth: 'none',
                                  maxHeight: 'none',
                                  flexShrink: 0,
                                }}
                              />
                            </div>
                          </div>

                          {/* BOTTOM HALF: Accent Bg + Category + Text */}
                          <div
                            className="w-full h-1/2 flex flex-col items-center justify-between p-6 sm:p-7 relative transition-colors"
                            style={{ backgroundColor: colors.bottomBg }}
                          >
                            {/* Category Badge */}
                            <input
                              type="text"
                              value={slide.category || category}
                              onChange={(e) => onUpdateSlide(idx, { category: e.target.value })}
                              disabled={!isActive}
                              className="text-center font-bold tracking-widest text-[11px] uppercase rounded-full px-3 py-1 outline-none border transition-all"
                              style={{
                                color: colors.categoryColor,
                                backgroundColor: `${colors.categoryColor}20`,
                                borderColor: `${colors.categoryColor}50`,
                              }}
                            />

                            {/* Main Textarea */}
                            <div className="w-full flex-1 flex items-center justify-center py-2 px-1">
                              <textarea
                                value={slide.text}
                                onChange={(e) => onUpdateSlide(idx, { text: e.target.value })}
                                disabled={!isActive}
                                rows={3}
                                className="w-full bg-transparent text-center font-bold resize-none outline-none border border-transparent hover:border-slate-700/60 focus:border-indigo-500/80 rounded-xl p-2 transition leading-snug tracking-tight"
                                style={{
                                  color: colors.textColor || '#FFFFFF',
                                  fontSize:
                                    slide.text.length < 70
                                      ? '1.22rem'
                                      : slide.text.length < 130
                                      ? '1.04rem'
                                      : '0.90rem',
                                }}
                                placeholder="Text für diesen Slide eingeben..."
                              />
                            </div>

                            {/* Footer Hint */}
                            <div className="flex items-center justify-center gap-1 w-full max-w-[280px]">
                              <input
                                type="text"
                                value={
                                  slide.footerText !== undefined
                                    ? slide.footerText
                                    : idx === slides.length - 1
                                    ? 'Deine Meinung? Kommentiere'
                                    : 'Wische nach links'
                                }
                                onChange={(e) => onUpdateSlide(idx, { footerText: e.target.value })}
                                disabled={!isActive}
                                className="w-full bg-transparent text-center text-[10px] sm:text-[11px] uppercase font-bold tracking-wider outline-none border border-transparent hover:border-slate-700/60 focus:border-indigo-500/80 rounded px-1 py-0.5 transition"
                                style={{ color: colors.textColor || '#FFFFFF', opacity: 0.8 }}
                                placeholder="Wische nach links..."
                                title="Klicke zum Bearbeiten des Hinweises"
                              />
                              {idx === slides.length - 1 ? (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" style={{ color: colors.textColor || '#FFFFFF' }} />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" style={{ color: colors.textColor || '#FFFFFF' }} />
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* LAYOUT 2: NUR TEXT */}
                      {layoutType === 'nur_text' && (
                        <div
                          className="w-full h-full flex flex-col items-center justify-between p-8 sm:p-10 relative transition-colors"
                          style={{ backgroundColor: colors.bottomBg }}
                        >
                          <div className="pt-2">
                            <input
                              type="text"
                              value={slide.category || category}
                              onChange={(e) => onUpdateSlide(idx, { category: e.target.value })}
                              disabled={!isActive}
                              className="text-center font-bold tracking-widest text-[11px] uppercase rounded-full px-3 py-1 outline-none border transition-all"
                              style={{
                                color: colors.categoryColor,
                                backgroundColor: `${colors.categoryColor}20`,
                                borderColor: `${colors.categoryColor}50`,
                              }}
                            />
                          </div>

                          <div className="w-full flex-1 flex items-center justify-center px-2 py-6">
                            <textarea
                              value={slide.text}
                              onChange={(e) => onUpdateSlide(idx, { text: e.target.value })}
                              disabled={!isActive}
                              rows={6}
                              className="w-full bg-transparent text-center font-extrabold resize-none outline-none border border-transparent hover:border-slate-700/60 focus:border-indigo-500/80 rounded-xl p-3 transition leading-relaxed tracking-tight"
                              style={{
                                color: colors.textColor || '#FFFFFF',
                                fontSize:
                                  slide.text.length < 60
                                    ? '1.5rem'
                                    : slide.text.length < 120
                                    ? '1.25rem'
                                    : '1.05rem',
                              }}
                              placeholder="Aussagekräftigen Text eintragen..."
                            />
                          </div>

                          <div className="flex items-center justify-center gap-1 w-full max-w-[280px]">
                            <input
                              type="text"
                              value={
                                slide.footerText !== undefined
                                  ? slide.footerText
                                  : idx === slides.length - 1
                                  ? 'Deine Meinung? Kommentiere'
                                  : 'Wische nach links'
                              }
                              onChange={(e) => onUpdateSlide(idx, { footerText: e.target.value })}
                              disabled={!isActive}
                              className="w-full bg-transparent text-center text-[10px] sm:text-[11px] uppercase font-bold tracking-wider outline-none border border-transparent hover:border-slate-700/60 focus:border-indigo-500/80 rounded px-1 py-0.5 transition"
                              style={{ color: colors.textColor || '#FFFFFF', opacity: 0.8 }}
                              placeholder="Wische nach links..."
                            />
                            {idx === slides.length - 1 ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" style={{ color: colors.textColor || '#FFFFFF' }} />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" style={{ color: colors.textColor || '#FFFFFF' }} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* LAYOUT 3: NUR BILD */}
                      {layoutType === 'nur_bild' && (
                        <div
                          className="w-full h-full flex items-center justify-center relative overflow-hidden transition-colors"
                          style={{ backgroundColor: colors.topBg }}
                        >
                          {isActive && (
                            <div 
                              className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-lg text-slate-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ZoomIn className="w-3 h-3 text-indigo-400 shrink-0" />
                              <input
                                type="range"
                                min="0.6"
                                max="3.0"
                                step="0.05"
                                value={slide.imageZoom ?? 1}
                                onChange={(e) => onUpdateSlide(idx, { imageZoom: parseFloat(e.target.value) })}
                                className="w-14 sm:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                title="Bild-Zoomfaktor einstellen"
                              />
                              <span className="font-mono text-[9px] text-indigo-300 w-6 text-right">
                                {Math.round((slide.imageZoom ?? 1) * 100)}%
                              </span>
                            </div>
                          )}

                          <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
                            <img
                              src={slideImage}
                              alt="Full Slide Artwork"
                              className="object-cover transition-transform duration-75 ease-out select-none pointer-events-none"
                              style={{
                                width: `${Math.round(500 * (slide.imageZoom ?? 1))}px`,
                                height: `${Math.round(500 * (slide.imageZoom ?? 1))}px`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                                flexShrink: 0,
                              }}
                            />
                          </div>

                          <div className="absolute bottom-4 inset-x-4 flex items-center justify-center z-20 pointer-events-auto">
                            <div className="flex items-center gap-1 bg-white/90 shadow-lg px-3 py-1 rounded-full backdrop-blur-sm max-w-[280px]">
                              <input
                                type="text"
                                value={
                                  slide.footerText !== undefined
                                    ? slide.footerText
                                    : idx === slides.length - 1
                                    ? 'Deine Meinung? Kommentiere'
                                    : 'Wische weiter'
                                }
                                onChange={(e) => onUpdateSlide(idx, { footerText: e.target.value })}
                                disabled={!isActive}
                                className="bg-transparent text-center text-[10px] uppercase font-bold tracking-wider text-slate-900 outline-none w-full"
                                placeholder="Hinweis bearbeiten..."
                              />
                              {idx === slides.length - 1 ? (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-900" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-900" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Navigation Arrow */}
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={safeSlideIndex === slides.length - 1}
              className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white border border-slate-700 shadow-2xl transition-all duration-200 active:scale-95 ${
                safeSlideIndex === slides.length - 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:scale-110 cursor-pointer'
              }`}
              title="Nächster Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dots Pagination Bar with Plus at the end (hidden in rendered PNG view) */}
        <div className="flex items-center justify-center gap-2 py-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 cursor-pointer ${
                safeSlideIndex === idx
                  ? 'bg-indigo-500 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#090D16] shadow-sm shadow-indigo-500/50'
                  : 'bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Zu Slide ${idx + 1} wechseln`}
            />
          ))}

          {/* Plus dot button: only in Live-Editor view, adds a slide and makes it active immediately */}
          {previewMode === 'live' && (
            <button
              type="button"
              onClick={() => {
                onAddSlide();
                setCurrentSlideIndex(slides.length);
              }}
              className="w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition hover:scale-110 ml-1 cursor-pointer"
              title="Neuen Slide hinzufügen und aktivieren"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Embedded Asset & Gallery Box */}
      {previewMode === 'live' && (
        <GalleryBox
          gallery={gallery}
          selectedImageUrl={currentSelectedImageUrl}
          selectedSlideIndex={safeSlideIndex}
          onSelectImage={handleSelectAsset}
          onGenerateImage={onGenerateImage}
          onUploadImage={onUploadImage}
          onEditImage={onEditImage}
          onGenerateWithSetStyle={onGenerateWithSetStyle}
          onOpenImageSetModal={onOpenImageSetModal}
          activeImageSet={activeImageSet}
          activeImageSetName={activeImageSetName}
          isGenerating={isGeneratingImage}
          isEditingImage={isEditingImage}
          currentPrompt={characterPrompt}
          topBgColor={colors.topBg}
        />
      )}
    </div>
  );
};
