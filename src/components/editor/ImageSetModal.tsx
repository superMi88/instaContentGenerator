'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ImageSet, ImageSetItem } from '@/types/image-set';
import { 
  X, 
  Plus, 
  Upload, 
  Trash2, 
  Check, 
  Layers, 
  Sparkles, 
  FolderPlus,
  Image as ImageIcon,
  Download,
  Star
} from 'lucide-react';

interface ImageSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSets: ImageSet[];
  activeSetId: string;
  onSelectActiveSet: (setId: string) => void;
  onRefreshSets: () => Promise<any>;
}

export const ImageSetModal: React.FC<ImageSetModalProps> = ({
  isOpen,
  onClose,
  imageSets,
  activeSetId,
  onSelectActiveSet,
  onRefreshSets,
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>(
    imageSets.find((s) => s.isDefault)?.id || activeSetId || imageSets[0]?.id || ''
  );
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [isSubmittingSet, setIsSubmittingSet] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imageSets.length > 0) {
      const defaultSet = imageSets.find((s) => s.isDefault);
      if (!selectedSetId || !imageSets.some((s) => s.id === selectedSetId)) {
        setSelectedSetId(defaultSet?.id || activeSetId || imageSets[0].id);
      }
    }
  }, [imageSets, activeSetId, selectedSetId]);

  useEffect(() => {
    if (isOpen && imageSets.length > 0) {
      const defaultSet = imageSets.find((s) => s.isDefault);
      const targetId = defaultSet ? defaultSet.id : (activeSetId && imageSets.some((s) => s.id === activeSetId) ? activeSetId : imageSets[0].id);
      setSelectedSetId(targetId);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSet = imageSets.find((s) => s.id === selectedSetId) || imageSets[0];

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) {
      setNameError('Bitte gib einen Set-Namen ein.');
      return;
    }

    setNameError(null);
    setIsSubmittingSet(true);
    try {
      const res = await fetch('/api/image-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_set',
          name: newSetName.trim(),
          description: newSetDescription.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.imageSet) {
          setSelectedSetId(data.imageSet.id);
        }
        await onRefreshSets();
        setIsCreatingSet(false);
        setNewSetName('');
        setNewSetDescription('');
      } else {
        alert(data.error || 'Fehler beim Erstellen des Bildersets');
      }
    } catch (err: any) {
      alert(err.message || 'Fehler beim Erstellen');
    } finally {
      setIsSubmittingSet(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSet) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/image-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_image',
            setId: currentSet.id,
            filename: file.name,
            base64Data,
          }),
        });

        const data = await res.json();
        if (data.success) {
          await onRefreshSets();
        } else {
          alert(data.error || 'Fehler beim Hochladen des Bildes');
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      alert(err.message || 'Upload-Fehler');
    }
  };

  const handleSetDefault = async (setId: string) => {
    try {
      const res = await fetch('/api/image-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_default',
          setId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSelectActiveSet(setId);
        setSelectedSetId(setId);
        await onRefreshSets();
      } else {
        alert(data.error || 'Fehler beim Festlegen des Standard-Sets');
      }
    } catch (err: any) {
      alert(err.message || 'Fehler beim Festlegen');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!confirm('Möchtest du dieses Bilderset wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/image-sets/${setId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const remaining: ImageSet[] = data.imageSets || [];
        const nextDefault = remaining.find((s) => s.isDefault) || remaining[0];
        if (nextDefault) {
          setSelectedSetId(nextDefault.id);
          onSelectActiveSet(nextDefault.id);
        } else {
          setSelectedSetId('');
          onSelectActiveSet('');
        }
        await onRefreshSets();
      } else {
        alert(data.error || 'Fehler beim Löschen des Bildersets');
      }
    } catch (err: any) {
      alert(err.message || 'Fehler beim Löschen');
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
      const cleanFilename = filename || url.split('/').pop()?.split('?')[0] || 'set_bild.png';
      a.download = cleanFilename.endsWith('.png') || cleanFilename.endsWith('.jpg') ? cleanFilename : `${cleanFilename}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0F1422] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Projektunabhängige Bildersets
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Global
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lade Bilder hoch und erstelle Bildersets für konsistente Styles in all deinen Projekten.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout (Sidebar + Main Area) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Sidebar: Sets List */}
          <div className="md:col-span-4 border-r border-slate-800 p-4 space-y-3 bg-slate-950/40 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deine Sets</span>
              <button
                type="button"
                onClick={() => setIsCreatingSet(true)}
                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1 transition"
                title="Neues Set anlegen"
              >
                <Plus className="w-3 h-3" />
                <span>Neues Set</span>
              </button>
            </div>

            {/* Create Set Inline Form */}
            {isCreatingSet && (
              <form onSubmit={handleCreateSet} className="p-3 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-2">
                <span className="text-xs font-bold text-white block">Neues Bilderset anlegen</span>
                <div>
                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => {
                      setNewSetName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Set-Name (z.B. Anime Retro)..."
                    className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition ${
                      nameError ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800'
                    }`}
                    autoFocus
                  />
                  {nameError && (
                    <span className="text-[10px] text-rose-400 mt-1 block font-medium">{nameError}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  placeholder="Beschreibung (optional)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingSet(false);
                      setNameError(null);
                    }}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSet}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                  >
                    {isSubmittingSet ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Erstelle...</span>
                      </>
                    ) : (
                      <span>Erstellen</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Sets list */}
            <div className="space-y-1.5">
              {imageSets.map((set) => {
                const isSelected = selectedSetId === set.id;
                const isActive = activeSetId === set.id;
                const isDefault = !!set.isDefault;
                return (
                  <div
                    key={set.id}
                    onClick={() => setSelectedSetId(set.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-sm'
                        : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">{set.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {set.images?.length || 0} {set.images?.length === 1 ? 'Bild' : 'Bilder'}
                      </span>
                    </div>

                    {/* Quick Star Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(set.id);
                      }}
                      className={`p-1.5 rounded-lg transition shrink-0 ${
                        isDefault
                          ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                          : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/80'
                      }`}
                      title={isDefault ? 'Dieses Set ist als Standard vorausgewählt' : 'Als Standard-Set festlegen (Stern vergeben)'}
                    >
                      <Star className={`w-4 h-4 ${isDefault ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Area: Set Details & Images Grid */}
          <div className="md:col-span-8 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            {currentSet ? (
              <div className="space-y-5">
                {/* Set Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{currentSet.name}</h3>

                      {/* Star Status / Action */}
                      {currentSet.isDefault ? (
                        <div title="Vorausgewähltes Standard-Set">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(currentSet.id)}
                          className="text-xs px-2 py-1 rounded-xl bg-slate-800 hover:bg-amber-500/20 border border-slate-700 text-slate-300 hover:text-amber-300 font-medium flex items-center gap-1.5 transition shadow-sm"
                          title="Als vorausgewähltes Standard-Set markieren"
                        >
                          <Star className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
                          <span>Stern vergeben</span>
                        </button>
                      )}

                      {activeSetId !== currentSet.id && (
                        <button
                          type="button"
                          onClick={() => onSelectActiveSet(currentSet.id)}
                          className="text-xs px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Für Post aktivieren</span>
                        </button>
                      )}
                    </div>
                    {currentSet.description && (
                      <p className="text-xs text-slate-400 mt-1">{currentSet.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Lädt hoch...' : 'Bild zum Set hinzufügen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSet(currentSet.id)}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                      title="Set löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Images Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">
                      Bilder in diesem Set ({currentSet.images?.length || 0})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Diese Bilder werden als Stil- und Charakter-Vorlagen verwendet
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(currentSet.images || []).map((img) => (
                      <div
                        key={img.id}
                        className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 p-1 flex flex-col items-center justify-center hover:border-indigo-500 transition-all shadow-md"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {/* Download button on hover */}
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, img.url, img.filename || `${img.name}.png`)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-indigo-600 text-slate-200 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg backdrop-blur-sm active:scale-90"
                          title="Bild herunterladen"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute inset-x-1 bottom-1 p-1 bg-slate-950/80 backdrop-blur-sm rounded-lg text-[10px] text-slate-300 truncate opacity-0 group-hover:opacity-100 transition-opacity text-center pointer-events-none">
                          {img.name}
                        </div>
                      </div>
                    ))}

                    {(!currentSet.images || currentSet.images.length === 0) && (
                      <div className="col-span-full py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                        <ImageIcon className="w-8 h-8 text-slate-600" />
                        <span>Noch keine Bilder in diesem Set. Klicke oben auf &quot;Bild zum Set hinzufügen&quot;.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Wähle ein Bilderset aus oder erstelle ein neues.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
