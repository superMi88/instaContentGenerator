'use client';

import React from 'react';
import { PostSummary } from '@/types/post';
import { sortPostSummaries } from '@/lib/post-sorting';
import { Plus, Trash2, Calendar, FolderArchive, ChevronRight, CheckCircle2, Clock, Layers } from 'lucide-react';

interface PostListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  posts: PostSummary[];
  activePostId?: string;
  onSelectPost: (id: string) => void;
  onNewPost: () => void;
  onDeletePost: (id: string) => Promise<void>;
}

export const PostListDrawer: React.FC<PostListDrawerProps> = ({
  isOpen,
  onClose,
  posts,
  activePostId,
  onSelectPost,
  onNewPost,
  onDeletePost,
}) => {
  if (!isOpen) return null;

  const sortedPosts = sortPostSummaries(posts);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Gespeicherte Karussell-Posts</h3>
              <p className="text-xs text-slate-400">Sortiert: Entwürfe zuerst • Geplant & Gesendet nach Datum</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Schließen
          </button>
        </div>

        {/* Action Button */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => {
              onNewPost();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Neuen Karussell-Post anlegen</span>
          </button>
        </div>

        {/* List with Slide 1 Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sortedPosts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <FolderArchive className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Noch keine Posts im lokalen Dateisystem vorhanden.</p>
            </div>
          ) : (
            sortedPosts.map((post) => {
              const isActive = post.id === activePostId;
              const isPublished = post.status === 'published';
              const isScheduled = post.status === 'scheduled';
              const isDraft = post.status === 'draft';

              return (
                <div
                  key={post.id}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-950/30'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  onClick={() => {
                    onSelectPost(post.id);
                    onClose();
                  }}
                >
                  {/* Compact Slide 1 Preview Thumbnail */}
                  <div className="w-14 h-[70px] rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800/80 relative shadow-sm">
                    <img
                      src={post.thumbnailUrl || `/api/posts/${post.id}/assets/slide_1.png`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Styled Fallback Representation */}
                    <div 
                      className="absolute inset-0 flex flex-col -z-10 pointer-events-none"
                      style={{ backgroundColor: post.colors?.bottomBg || '#0F172A' }}
                    >
                      <div 
                        className="h-1/2 w-full flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: post.colors?.topBg || '#F0FDF4' }}
                      >
                        {post.slide1?.imageUrl && (
                          <img
                            src={post.slide1.imageUrl}
                            alt=""
                            className="h-full w-auto object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 truncate max-w-[120px]">
                        {post.category || 'Kategorie'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPublished && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            Gesendet
                          </span>
                        )}
                        {isScheduled && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            Geplant
                          </span>
                        )}
                        {isDraft && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            Entwurf
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Diesen Beitrag wirklich löschen?')) {
                              onDeletePost(post.id);
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Löschen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 line-clamp-1 leading-snug">
                      {post.slide1_question || post.topic}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      {isScheduled && post.scheduledAt ? (
                        <span className="flex items-center gap-1 text-amber-300 font-medium">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(post.scheduledAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : isPublished && post.publishedAt ? (
                        <span className="flex items-center gap-1 text-emerald-300 font-medium">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {new Date(post.publishedAt).toLocaleDateString('de-DE')}
                        </span>
                      ) : (
                        <span>{new Date(post.createdAt).toLocaleDateString('de-DE')}</span>
                      )}
                      <span className="flex items-center gap-0.5 text-slate-500 text-[9px]">
                        <Layers className="w-2.5 h-2.5" />
                        {post.slideCount || 2} Slides
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
