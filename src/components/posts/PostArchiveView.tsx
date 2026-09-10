'use client';

import React, { useState } from 'react';
import { PostSummary } from '@/types/post';
import { 
  FolderArchive, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  Instagram, 
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

interface PostArchiveViewProps {
  posts: PostSummary[];
  onSelectPost: (id: string) => void;
  onNewPost: () => void;
  onDuplicatePost: (id: string) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  authStatus?: {
    connected: boolean;
    username?: string;
    userId?: string;
  } | null;
}

export const PostArchiveView: React.FC<PostArchiveViewProps> = ({
  posts,
  onSelectPost,
  onNewPost,
  onDuplicatePost,
  onDeletePost,
  authStatus,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  const filteredPosts = posts.filter((post) => {
    // Status filter
    if (activeFilter !== 'all' && post.status !== activeFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = (post.topic || '').toLowerCase().includes(q);
      const matchQuestion = (post.slide1_question || '').toLowerCase().includes(q);
      const matchCategory = (post.category || '').toLowerCase().includes(q);
      return matchTopic || matchQuestion || matchCategory;
    }
    return true;
  });

  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDuplicating(id);
    try {
      await onDuplicatePost(id);
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Möchtest du diesen Post wirklich löschen?')) {
      await onDeletePost(id);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 shadow-lg shadow-purple-600/30 text-white">
              <FolderArchive className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Karussell-Archiv & Dashboard
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Übersicht all deiner geplanten, veröffentlichten und in Bearbeitung befindlichen Instagram-Karussells.
          </p>
        </div>

        {/* Primary CTA Button */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={onNewPost}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Neuen Post erstellen</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Alle</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{counts.all}</span>
          </button>

          <button
            onClick={() => setActiveFilter('draft')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'draft'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Entwürfe</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{counts.draft}</span>
          </button>

          <button
            onClick={() => setActiveFilter('scheduled')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'scheduled'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Geplant</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{counts.scheduled}</span>
          </button>

          <button
            onClick={() => setActiveFilter('published')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'published'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Veröffentlicht</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{counts.published}</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Post suchen..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500 border border-slate-700">
            <FolderArchive className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Keine Posts in dieser Ansicht</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Kein Post entspricht deinen Suchkriterien.'
                : activeFilter !== 'all'
                ? `Es gibt aktuell keine Posts mit dem Status "${activeFilter}".`
                : 'Erstelle jetzt deinen ersten 2-Slide Karussell-Post!'}
            </p>
          </div>
          <button
            onClick={onNewPost}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Jetzt Post anlegen</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isDraft = post.status === 'draft';
            const isScheduled = post.status === 'scheduled';
            const isPublished = post.status === 'published';

            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className="group relative glass-panel rounded-3xl p-5 border border-slate-800/80 hover:border-indigo-500/60 transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
              >
                {/* Header: Category + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                    {post.category || 'Allgemein'}
                  </span>

                  {/* Status Indicator */}
                  {isPublished && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Gesendet</span>
                    </span>
                  )}
                  {isScheduled && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 animate-pulse" />
                      <span>Geplant</span>
                    </span>
                  )}
                  {isDraft && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                      Entwurf
                    </span>
                  )}
                </div>

                {/* Body Content */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                    {post.slide1_question || post.topic}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {post.topic !== post.slide1_question ? post.topic : 'Klicke, um den Inhalt im Editor zu bearbeiten.'}
                  </p>
                </div>

                {/* Timestamps Info */}
                <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  {isScheduled && post.scheduledAt && (
                    <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>Geplant für: {new Date(post.scheduledAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {isPublished && post.publishedAt && (
                    <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Veröffentlicht am: {new Date(post.publishedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Erstellt: {new Date(post.createdAt).toLocaleDateString('de-DE')}</span>
                    <span className="font-mono text-[10px]">ID: {post.id.slice(-6)}</span>
                  </div>
                </div>

                {/* Card Actions Bar */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPost(post.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Bearbeiten</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(e, post.id)}
                    disabled={isDuplicating === post.id}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 text-xs transition disabled:opacity-50"
                    title="Diesen Post kopieren / duplizieren"
                  >
                    <Copy className={`w-3.5 h-3.5 ${isDuplicating === post.id ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, post.id)}
                    className="p-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 text-xs transition"
                    title="Diesen Post löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
