'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface PostSettingsProps {
  caption: string;
  onCaptionChange: (caption: string) => void;
  isReadOnly?: boolean;
}

export const PostSettings: React.FC<PostSettingsProps> = ({
  caption,
  onCaptionChange,
  isReadOnly = false,
}) => {
  if (isReadOnly) {
    return (
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 bg-slate-900/40 shadow-xl">
        <div className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed select-text font-normal">
          {caption ? caption : <span className="text-slate-500 italic">Keine Caption hinterlegt.</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
      {/* Instagram Caption */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instagram Caption & Hashtags</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {caption.length} Zeichen
          </span>
        </div>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl p-2.5 text-xs leading-relaxed outline-none resize-none transition bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-300"
          placeholder="Instagram Bildbeschreibung mit Aufruf zum Kommentieren..."
        />
      </div>
    </div>
  );
};
