'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Send, CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles } from 'lucide-react';
import { PostStatus } from '@/types/post';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: PostStatus;
  scheduledAt: string | null;
  onSchedule: (dateTimeIso: string) => Promise<void>;
  onPublishNow: () => Promise<void>;
  isPublishing: boolean;
  publishedAt?: string | null;
  instagramPostId?: string | null;
  errorMessage?: string | null;
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  status,
  scheduledAt,
  onSchedule,
  onPublishNow,
  isPublishing,
  publishedAt,
  instagramPostId,
  errorMessage,
}) => {
  if (!isOpen) return null;

  // Format initial date/time for input (YYYY-MM-DDTHH:mm)
  const defaultDate = scheduledAt
    ? new Date(scheduledAt).toISOString().slice(0, 16)
    : new Date(Date.now() + 3600 * 1000 * 4).toISOString().slice(0, 16);

  const [selectedDateTime, setSelectedDateTime] = useState(defaultDate);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateTime) return;
    await onSchedule(new Date(selectedDateTime).toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 text-white shadow-md">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Instagram Veröffentlichung & Planung
              </h3>
              <p className="text-xs text-slate-400">
                2-Slide Karussell über Instagram Graph API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Connected Account Display */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400">Verbundener Account:</span>
            <div className="flex items-center gap-2">
              <a
                href="/api/auth/instagram/login"
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 transition flex items-center gap-1.5"
                title="Account wechseln oder verbinden"
              >
                <span>Instagram Login / Status</span>
              </a>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400">Aktueller Post-Status:</span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                status === 'published'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : status === 'scheduled'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : status === 'failed'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {status === 'published'
                ? 'Veröffentlicht'
                : status === 'scheduled'
                ? 'Geplant'
                : status === 'failed'
                ? 'Fehlgeschlagen'
                : 'Entwurf'}
            </span>
          </div>

          {/* Success details if published */}
          {status === 'published' && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Erfolgreich auf Instagram gepostet!</span>
              </div>
              {publishedAt && (
                <p className="text-slate-400 text-[11px]">
                  Veröffentlicht am: {new Date(publishedAt).toLocaleString('de-DE')}
                </p>
              )}
              {instagramPostId && (
                <p className="font-mono text-[10px] text-emerald-400/80">
                  Instagram ID: {instagramPostId}
                </p>
              )}
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Fehlerhinweis:</span>
                <span className="text-[11px] text-rose-300/90">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Scheduling form */}
          <form onSubmit={handleScheduleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Datum & Uhrzeit für automatische Veröffentlichung
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
              <button
                type="submit"
                disabled={isPublishing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                Planen
              </button>
            </div>
            {scheduledAt && (
              <p className="text-[11px] text-indigo-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Aktuell geplant für: {new Date(scheduledAt).toLocaleString('de-DE')}
              </p>
            )}
          </form>

          {/* Direct Publish Option */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400">
              Möchtest du das Karussell jetzt sofort auf Instagram hochladen?
            </div>
            <button
              type="button"
              onClick={onPublishNow}
              disabled={isPublishing}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-pink-600/20 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <Send className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />
              <span>{isPublishing ? 'Wird übertragen...' : 'Jetzt veröffentlichen'}</span>
            </button>
          </div>

          {/* Graph API Note */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-500 leading-relaxed">
            💡 <strong>Hinweis zur Graph API:</strong> Für die Veröffentlichung muss die App öffentlich erreichbar sein (z. B. via <code className="text-indigo-400">NEXT_PUBLIC_APP_URL</code> mit ngrok), damit Meta die Bilddateien (<code className="text-slate-400">slide_1.png</code> & <code className="text-slate-400">slide_2.png</code>) abrufen kann.
          </div>
        </div>
      </div>
    </div>
  );
};
