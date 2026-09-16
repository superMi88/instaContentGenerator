'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RefreshCw, 
  Lightbulb, 
  X, 
  Trash2, 
  MessageSquare,
  Layers,
  Sliders,
  BookOpen,
  Image as ImageIcon,
  Wand2,
  Plus,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { ChatMessage } from '@/types/post';

interface CurrentProjectContext {
  topic: string;
  category: string;
  slides: { slideNumber: number; text: string; layoutType?: string }[];
  activeSlideIndex?: number;
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
  onClearChat: () => void;
  projectContext?: CurrentProjectContext;
}

const INSPIRATION_CHIPS = [
  '📚 Wie waren meine alten Posts aufgebaut?',
  '✏️ Bei Slide 1 soll der Text prägnanter sein',
  '🎨 Mach das Bild auf Slide 1 freundlicher mit Lächeln',
  '💡 Gib mir 3 virale Themenideen für Liebeskummer',
  '💔 Sollte man dem Ex zum Geburtstag gratulieren?',
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  chatHistory,
  onGenerate,
  isLoading,
  onClearChat,
  projectContext,
}) => {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    const currentText = prompt;
    setPrompt('');
    onGenerate(currentText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'get_previous_posts':
        return <BookOpen className="w-3 h-3 text-amber-400" />;
      case 'update_slide':
        return <Sliders className="w-3 h-3 text-emerald-400" />;
      case 'update_carousel':
        return <Sparkles className="w-3 h-3 text-indigo-400" />;
      case 'generate_image_for_slide':
        return <ImageIcon className="w-3 h-3 text-pink-400" />;
      case 'edit_image_for_slide':
        return <Wand2 className="w-3 h-3 text-rose-400" />;
      case 'add_slide':
        return <Plus className="w-3 h-3 text-cyan-400" />;
      case 'delete_slide':
        return <Trash2 className="w-3 h-3 text-rose-400" />;
      case 'update_instagram_caption':
        return <FileText className="w-3 h-3 text-blue-400" />;
      default:
        return <CheckCircle2 className="w-3 h-3 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 shadow-md shadow-indigo-500/20 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  KI-Content Assistent
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Agent mit Tools
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chatten, Slides verfeinern, Bilder bearbeiten & alte Posts analysieren
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearChat}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Chat-Verlauf leeren"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Post Context Pill */}
        {projectContext && (
          <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-medium text-slate-300 truncate">
                Kontext: {projectContext.topic || 'Aktueller Post'} ({projectContext.category})
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-medium text-indigo-300 shrink-0 ml-2">
              {projectContext.slides.length} Slides aktiv
            </span>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="max-w-xs space-y-1">
                <h4 className="text-white font-semibold text-sm">
                  Wie kann ich dir helfen?
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Schreibe mir frei oder gib mir konkrete Aufgaben. Ich passe Slides nur an, wenn du es möchtest, und zeige dir immer an, welche Werkzeuge ich benutze.
                </p>
              </div>

              {/* Quick Inspiration Chips */}
              <div className="w-full pt-4 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  Beispiele zum Ausprobieren:
                </div>
                <div className="flex flex-col gap-1.5">
                  {INSPIRATION_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(chip.replace(/^[^\s]+\s/, ''))}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-indigo-950/40 hover:text-indigo-200 border border-slate-700/50 hover:border-indigo-500/40 transition text-slate-300"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            chatHistory.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-900/20'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
                    }`}
                  >
                    {/* Render Tool Badges if assistant executed tools */}
                    {!isUser && msg.toolExecutions && msg.toolExecutions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-slate-700/60">
                        {msg.toolExecutions.map((tool, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[10px] font-medium text-slate-300 shadow-sm"
                          >
                            {getToolIcon(tool.toolName)}
                            <span>{tool.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-indigo-400 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Assistent verarbeitet deine Anfrage...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-slate-950/80 border-t border-slate-800"
        >
          <div className="relative flex items-end bg-slate-900 rounded-2xl border border-slate-800 focus-within:border-indigo-500 transition-colors p-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatHistory.length === 0
                  ? 'Frag etwas, brainstorme oder gib eine Anweisung (z. B. "Ändere Slide 1")...'
                  : 'Nachricht oder Anweisung eingeben...'
              }
              rows={2}
              className="w-full bg-transparent resize-none outline-none text-xs text-slate-200 placeholder:text-slate-500 px-2 py-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="shrink-0 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition ml-2 shadow-md shadow-indigo-600/30"
              title="Senden (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>Enter zum Senden • Shift+Enter für Zeilenumbruch</span>
            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearChat}
                className="hover:text-rose-400 transition"
              >
                Chat leeren
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
