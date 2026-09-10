'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Bot, User, RefreshCw, Lightbulb } from 'lucide-react';
import { ChatMessage } from '@/types/post';

interface ChatContainerProps {
  chatHistory: ChatMessage[];
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

const INSPIRATION_CHIPS = [
  '💔 Sollte man dem Ex zum Geburtstag gratulieren?',
  '💼 Warum 80% Fleiß und 20% Strategie besser sind als 100% Überstunden',
  '🧘‍♂️ Warum Einsamkeit manchmal das beste Geschenk ist',
  '💸 Sollte man beim ersten Date getrennt zahlen?',
  '🛑 Wann ist der richtige Zeitpunkt, einen Job zu kündigen?',
];

export const ChatContainer: React.FC<ChatContainerProps> = ({
  chatHistory,
  onGenerate,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

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

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Gemini AI Content Agent
            </h2>
            <p className="text-xs text-slate-400">
              Konzipiere & iteriere dein Karussell
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          gemini-2.5-flash
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-white font-medium text-sm">
                Kein Thema vorgegeben
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gib unten ein Thema ein oder wähle einen der Vorschläge, um das Karussell zu generieren.
              </p>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="w-full pt-3 text-left space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                Vorschläge zum Start:
              </div>
              <div className="flex flex-col gap-1.5">
                {INSPIRATION_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(chip);
                    }}
                    className="text-left text-xs px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-indigo-950/40 hover:text-indigo-200 border border-slate-700/50 hover:border-indigo-500/40 transition-all text-slate-300"
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
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-900/20'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-indigo-400 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Gemini generiert Texte & strukturiert das Karussell...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-slate-900/80 border-t border-slate-800/80"
      >
        <div className="relative flex items-end bg-slate-950 rounded-xl border border-slate-800 focus-within:border-indigo-500 transition-colors p-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatHistory.length === 0
                ? 'Gib ein Thema ein (z. B. "Warum Red Flags oft ignoriert werden")...'
                : 'Feedback oder Änderungswunsch (z. B. "Mache Slide 2 provokanter")...'
            }
            rows={2}
            className="w-full bg-transparent resize-none outline-none text-xs text-slate-200 placeholder:text-slate-500 px-2 py-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="shrink-0 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all ml-2"
            title="Senden (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 px-1 flex items-center justify-between">
          <span>Drücke Enter zum Senden, Umschalt+Enter für neue Zeile</span>
          <span>Bezugnahme auf frühere Nachrichten möglich</span>
        </p>
      </form>
    </div>
  );
};
