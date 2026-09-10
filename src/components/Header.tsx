'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderArchive, 
  Calendar, 
  Save, 
  Instagram, 
  PlusCircle, 
  Layers,
  CheckCircle2,
  Unlink,
  ExternalLink,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { PostStatus } from '@/types/post';

interface HeaderProps {
  postCount: number;
  status: PostStatus;
  isSaving: boolean;
  onSave: () => void;
  onOpenDrawer?: () => void;
  onOpenScheduler: () => void;
  onNewPost: () => void;
  currentView?: 'archive' | 'editor';
  onNavigateToArchive?: () => void;
  onToggleAiDrawer?: () => void;
  postTopic?: string;
}

interface IgAuthStatus {
  connected: boolean;
  username?: string;
  userId?: string;
  pageName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  postCount,
  status,
  isSaving,
  onSave,
  onOpenDrawer,
  onOpenScheduler,
  onNewPost,
  currentView = 'editor',
  onNavigateToArchive,
  onToggleAiDrawer,
  postTopic,
}) => {
  const [authStatus, setAuthStatus] = useState<IgAuthStatus>({ connected: false });
  const [showAuthMenu, setShowAuthMenu] = useState(false);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/instagram/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ connected: false });
    }
  };

  useEffect(() => {
    fetchAuthStatus();
    // Check for auth callback param in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth') === 'success') {
        fetchAuthStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleDisconnect = async () => {
    if (confirm('Instagram-Verbindung wirklich trennen?')) {
      await fetch('/api/auth/instagram/status', { method: 'DELETE' });
      setAuthStatus({ connected: false });
      setShowAuthMenu(false);
    }
  };

  return (
    <header className="w-full glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo or Back Button */}
        <div className="flex items-center gap-3 min-w-0">
          {currentView === 'editor' && onNavigateToArchive ? (
            <button
              onClick={onNavigateToArchive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition active:scale-95 shrink-0"
              title="Zurück zum Karussell-Archiv"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Übersicht</span>
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {currentView === 'editor' && postTopic ? postTopic : 'InstaCarousel Studio'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1 shrink-0">
                <Instagram className="w-2.5 h-2.5" /> 2-Slide Format
              </span>
            </div>
            {currentView !== 'editor' && (
              <p className="text-xs text-slate-400 hidden sm:block truncate">
                Vollautomatisiertes Karussell mit Gemini, 1080x1350 Rendering & IG Graph API
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Instagram Connect / Account Indicator */}
          <div className="relative">
            {authStatus.connected ? (
              <button
                onClick={() => setShowAuthMenu(!showAuthMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition"
                title="Instagram Account Einstellungen"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <span className="hidden sm:inline">@{authStatus.username || 'Verbunden'}</span>
              </button>
            ) : (
              <a
                href="/api/auth/instagram/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-pink-600/20 transition"
                title="Mit Facebook / Instagram einloggen"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mit Instagram verbinden</span>
                <span className="sm:hidden">Login</span>
              </a>
            )}

            {/* Auth Dropdown Menu */}
            {showAuthMenu && authStatus.connected && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>@{authStatus.username}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    {authStatus.userId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {authStatus.userId}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <a
                    href="/api/auth/instagram/login"
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition"
                  >
                    <span>Neu verbinden / wechseln</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <span>Verbindung trennen</span>
                    <Unlink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentView === 'editor' ? (
            <>
              {/* AI Assistant Drawer Trigger Button */}
              {onToggleAiDrawer && (
                <button
                  type="button"
                  onClick={onToggleAiDrawer}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
                  title="KI Content Assistent öffnen"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>KI-Assistent</span>
                </button>
              )}

              {/* Save Post Button */}
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                title="Im Dateisystem speichern"
              >
                {isSaving ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>{isSaving ? 'Speichert...' : 'Speichern'}</span>
              </button>
            </>
          ) : (
            /* Archive view CTA */
            <button
              type="button"
              onClick={onNewPost}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Neuer Post</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
