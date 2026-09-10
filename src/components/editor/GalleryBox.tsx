'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GalleryAsset, ImageSet } from '@/types/post';
import { 
  Sparkles, 
  Upload, 
  Check, 
  RefreshCw, 
  Image as ImageIcon, 
  Layers,
  Wand2,
  FolderHeart,
  Download
} from 'lucide-react';

interface GalleryBoxProps {
  gallery: GalleryAsset[];
  selectedImageUrl?: string;
  selectedSlideIndex?: number;
  onSelectImage: (asset: GalleryAsset) => void;
  onGenerateImage: (prompt: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  onEditImage?: (asset: GalleryAsset, instruction: string) => Promise<void>;
  onGenerateWithSetStyle?: (prompt: string, setId: string) => Promise<void>;
  onOpenImageSetModal?: () => void;
  activeImageSet?: ImageSet;
  activeImageSetName?: string;
  isGenerating: boolean;
  isEditingImage?: boolean;
  currentPrompt?: string;
  topBgColor?: string;
}

export const GalleryBox: React.FC<GalleryBoxProps> = ({
  gallery,
  selectedImageUrl,
  selectedSlideIndex = 0,
  onSelectImage,
  onGenerateImage,
  onUploadImage,
  onEditImage,
  onGenerateWithSetStyle,
  onOpenImageSetModal,
  activeImageSet,
  activeImageSetName,
  isGenerating,
  isEditingImage = false,
  currentPrompt = '',
  topBgColor,
}) => {
  const [multimodalMode, setMultimodalMode] = useState<'edit_selected' | 'create_in_style'>('edit_selected');
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<GalleryAsset | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected image for edit with current slide image or first asset
  useEffect(() => {
    if (selectedImageUrl) {
      const match = gallery.find((a) => a.url === selectedImageUrl);
      if (match) setSelectedImageForEdit(match);
    } else if (gallery.length > 0 && !selectedImageForEdit) {
      setSelectedImageForEdit(gallery[0]);
    }
  }, [selectedImageUrl, gallery]);

  const handleThumbnailClick = (asset: GalleryAsset) => {
    onSelectImage(asset);
    setSelectedImageForEdit(asset);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadImage(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename?: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanFilename = filename || url.split('/').pop()?.split('?')[0] || 'chibi_bild.png';
      a.download = cleanFilename.endsWith('.png') || cleanFilename.endsWith('.jpg') ? cleanFilename : `${cleanFilename}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageForEdit || !editInstruction.trim() || isEditingImage || !onEditImage) return;
    const text = editInstruction.trim();
    setEditInstruction('');
    await onEditImage(selectedImageForEdit, text);
  };

  const handleStyleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stylePrompt.trim() || isGenerating || !onGenerateWithSetStyle) return;
    const text = stylePrompt.trim();
    setStylePrompt('');
    const targetSetId = activeImageSet?.id || '';
    await onGenerateWithSetStyle(text, targetSetId);
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4 bg-slate-950/40">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-2">
              Bilder-Galerie & Assets
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                {gallery.length} {gallery.length === 1 ? 'Bild' : 'Bilder'}
              </span>
            </h3>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bildersets Button */}
          {onOpenImageSetModal && (
            <button
              type="button"
              onClick={onOpenImageSetModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Projektunabhängige Bildersets verwalten"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bildersets ({activeImageSetName || 'Standard'})</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Eigenes Bild hochladen</span>
          </button>

          <button
            type="button"
            onClick={() => onGenerateImage(currentPrompt || 'Cute chibi character')}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            )}
            <span>{isGenerating ? 'Generiere...' : 'Neu generieren'}</span>
          </button>
        </div>
      </div>

      {/* Thumbnails Row / Grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-800">
        {gallery.map((asset) => {
          const isSlideAssigned = selectedImageUrl === asset.url;
          const isEditSelected = selectedImageForEdit?.id === asset.id;

          return (
            <div
              key={asset.id}
              onClick={() => handleThumbnailClick(asset)}
              title={asset.prompt || 'Klicke zum Auswählen und Bearbeiten'}
              className={`relative group shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 cursor-pointer transition-all p-1 bg-slate-900/80 flex flex-col items-center justify-center ${
                isEditSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 scale-100 shadow-lg shadow-indigo-500/25'
                  : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
              }`}
            >
              <img
                src={asset.url}
                alt={asset.prompt || 'Asset'}
                className="w-full h-full object-cover rounded-lg pointer-events-none"
              />

              {/* Badges */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-medium text-slate-300 flex items-center gap-1 pointer-events-none">
                {asset.isAiGenerated ? (
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                ) : (
                  <Upload className="w-2.5 h-2.5 text-emerald-400" />
                )}
                <span>{asset.isAiGenerated ? 'KI' : 'Upload'}</span>
              </div>

              {/* Assigned Checkmark overlay (bottom-right) */}
              {isSlideAssigned && (
                <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md z-10 pointer-events-none" title="Diesem Slide zugewiesen">
                  <Check className="w-3 h-3" />
                </div>
              )}

              {/* Edit indicator tag */}
              {isEditSelected && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-600/90 text-[8px] font-bold uppercase tracking-wider text-white shadow pointer-events-none">
                  Fokus
                </div>
              )}

              {/* Quick Download Button */}
              <button
                type="button"
                onClick={(e) => handleDownload(e, asset.url, asset.filename)}
                className={`absolute ${isEditSelected ? 'bottom-2 left-2' : 'top-2 right-2'} p-1.5 rounded-lg bg-black/80 hover:bg-indigo-600 text-slate-200 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg backdrop-blur-sm active:scale-90`}
                title="Bild herunterladen"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Hover Prompt tooltip / snippet */}
              <div className="absolute inset-x-1 bottom-1 p-1 bg-slate-950/90 backdrop-blur-sm rounded text-[9px] text-slate-300 truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                {asset.prompt || 'Bild auswählen'}
              </div>
            </div>
          );
        })}

        {gallery.length === 0 && (
          <div className="w-full py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Noch keine Bilder vorhanden. Klicke auf &quot;Neu generieren&quot; oder &quot;Eigenes Bild hochladen&quot;.
          </div>
        )}
      </div>

      {/* Extra-Bearbeitungsbox DIREKT unter den Bildern (Ohne Chatverlauf) */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800">
        {/* Header with Title & Mode Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              Bild gezielt anpassen (Multimodal)
            </span>
          </div>

          {/* Schalter: Bild anpassen vs Neues Bild im Set-Style */}
          <div className="flex items-center p-0.5 bg-slate-950/90 border border-slate-800 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setMultimodalMode('edit_selected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                multimodalMode === 'edit_selected'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Bild anpassen (Ausgewählt)</span>
            </button>
            <button
              type="button"
              onClick={() => setMultimodalMode('create_in_style')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                multimodalMode === 'create_in_style'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Neues Bild im Set-Style</span>
            </button>
          </div>
        </div>

        {/* Mode 1: Ausgewähltes Bild gezielt anpassen */}
        {multimodalMode === 'edit_selected' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {selectedImageForEdit ? (
                  <>Referenz: <strong className="text-indigo-300">{selectedImageForEdit.prompt ? selectedImageForEdit.prompt.slice(0, 30) + '...' : 'Ausgewähltes Bild'}</strong></>
                ) : (
                  'Wähle oben ein Bild aus, um es hier gezielt zu verändern.'
                )}
              </span>
              {selectedImageForEdit && (
                <button
                  type="button"
                  onClick={(e) => handleDownload(e, selectedImageForEdit.url, selectedImageForEdit.filename)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[10px] font-medium flex items-center gap-1 transition shadow-sm"
                  title="Ausgewähltes Bild herunterladen"
                >
                  <Download className="w-3 h-3" />
                  <span>Bild herunterladen</span>
                </button>
              )}
            </div>

            {selectedImageForEdit ? (
              <form onSubmit={handleEditSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative group/thumb shrink-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-500/50 bg-slate-900 shadow-md">
                    <img src={selectedImageForEdit.url} alt="Referenzbild" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedImageForEdit.url, selectedImageForEdit.filename)}
                    className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                    title="Herunterladen"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 w-full relative flex items-center bg-slate-950 rounded-xl border border-slate-800 focus-within:border-indigo-500 transition p-1">
                  <input
                    type="text"
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    placeholder="Änderung für dieses Bild (z.B. 'der soll keinen Hut tragen', 'blaue Haare', 'glücklich lächeln')..."
                    className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 px-3 py-1.5 outline-none"
                    disabled={isEditingImage}
                  />
                  <button
                    type="submit"
                    disabled={!editInstruction.trim() || isEditingImage}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ml-1 shadow-md shadow-indigo-600/30"
                  >
                    {isEditingImage ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isEditingImage ? 'Passe an...' : 'Bild anpassen'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                Klicke oben auf ein Bild, um es hier gezielt mit KI anzupassen.
              </div>
            )}
          </div>
        ) : (
          /* Mode 2: Neues Bild im Set-Style erstellen */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Stil-Vorlage:</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1 shadow-sm">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  {activeImageSetName || activeImageSet?.name || 'Standard'}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({activeImageSet?.images?.length || 0} {activeImageSet?.images?.length === 1 ? 'Bild im Set' : 'Bilder im Set'})
                </span>
              </div>
              {onOpenImageSetModal && (
                <button
                  type="button"
                  onClick={onOpenImageSetModal}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline transition"
                >
                  <Layers className="w-3 h-3" />
                  <span>Set wechseln</span>
                </button>
              )}
            </div>

            <form onSubmit={handleStyleSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-900 shadow-md flex items-center justify-center">
                  {activeImageSet?.images?.[0]?.url ? (
                    <img src={activeImageSet.images[0].url} alt="Set-Style Vorlage" className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
              </div>
              <div className="flex-1 w-full relative flex items-center bg-slate-950 rounded-xl border border-slate-800 focus-within:border-indigo-500 transition p-1">
                <input
                  type="text"
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder={`Neues Motiv im Stil von "${activeImageSetName || 'Bilderset'}" beschreiben (z.B. 'Charakter am Laptop', 'beim Kaffee trinken')...`}
                  className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 px-3 py-1.5 outline-none"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={!stylePrompt.trim() || isGenerating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ml-1 shadow-md shadow-indigo-600/30"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{isGenerating ? 'Generiere...' : 'Neues Bild erstellen'}</span>
                </button>
              </div>
            </form>

            <p className="text-[10px] text-slate-500 px-1">
              Erstellt ein brandneues Bild und übernimmt exakt Zeichentechnik, Schattierung und Farben des Bildersets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
