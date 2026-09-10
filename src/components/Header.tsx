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
  Sparkles,
  User,
  LogOut
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/instagram/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ connected: false });
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setUserEmail(data.email);
      }
    } catch {
      setUserEmail(null);
    }
  };

  useEffect(() => {
    fetchAuthStatus();
    fetchCurrentUser();

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

  const handleLogout = async () => {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
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
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Instagram Connect / Account Indicator */}
          <div className="relative">
            {authStatus.connected ? (
              <button
                type="button"
                onClick={() => setShowAuthMenu(!showAuthMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition shadow-sm"
                title="Instagram Account Einstellungen"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-mono text-[11px] truncate max-w-[110px] sm:max-w-[140px]">
                  @{authStatus.username || 'Verbunden'}
                </span>
              </button>
            ) : (
              <a
                href="/api/auth/instagram/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-pink-600/20 transition active:scale-95 ring-1 ring-white/10"
                title="Mit Instagram / Facebook verbinden"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-200" />
                <span className="font-medium">Instagram verbinden</span>
              </a>
            )}

            {/* Auth Dropdown Menu */}
            {showAuthMenu && authStatus.connected && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span className="truncate">@{authStatus.username}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    {authStatus.pageName && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Seite: {authStatus.pageName}
                      </div>
                    )}
                    {authStatus.userId && (
                      <div className="text-[10px] text-slate-500 font-mono truncate">
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
                    type="button"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
                  title="KI Content Assistent öffnen"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden md:inline">KI-Assistent</span>
                </button>
              )}

              {/* Save Post Button */}
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Neuer Post</span>
            </button>
          )}

          {/* User Profile / Logout Button */}
          <div className="relative pl-1 border-l border-slate-800">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
              title={userEmail ? `Angemeldet als ${userEmail}` : 'Benutzerkonto'}
            >
              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                <User className="w-3.5 h-3.5" />
              </div>
              {userEmail && (
                <span className="hidden lg:inline text-[11px] font-medium text-slate-300 max-w-[120px] truncate">
                  {userEmail.split('@')[0]}
                </span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in">
                {userEmail && (
                  <div className="px-2 py-1.5 mb-1.5 border-b border-slate-800">
                    <div className="text-[10px] text-slate-500 font-medium">Angemeldet als</div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{userEmail}</div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Abmelden</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
