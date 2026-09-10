'use client';

import React from 'react';
import { PostSummary } from '@/types/post';
import { Plus, Trash2, Calendar, FolderArchive, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

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
              <p className="text-xs text-slate-400">Lokale Ablage unter /data/posts/</p>
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <FolderArchive className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Noch keine Posts im lokalen Dateisystem vorhanden.</p>
            </div>
          ) : (
            posts.map((post) => {
              const isActive = post.id === activePostId;
              return (
                <div
                  key={post.id}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-md'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  onClick={() => {
                    onSelectPost(post.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400">
                      {post.category || 'Kategorie'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          post.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : post.status === 'scheduled'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {post.status}
                      </span>
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
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                    {post.slide1_question || post.topic}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>{new Date(post.createdAt).toLocaleDateString('de-DE')}</span>
                    {post.scheduledAt && (
                      <span className="flex items-center gap-1 text-indigo-300">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(post.scheduledAt).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
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
