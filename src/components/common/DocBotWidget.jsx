import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, AlertTriangle, PhoneCall, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function DocBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '3aslema ! Je suis DocBot, l\'assistant médical IA de Maw2idi. Décrivez vos symptômes en français ou en derja tunisien (ex: *wji3a fel 9alb*, *dharsa*, *s5ana*, *mal de tête*).',
      time: 'À l\'instant'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const userMsg = { role: 'user', text: userText, time: 'À l\'instant' };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.queryDocBot(userText, messages);
      const botMsg = {
        role: 'assistant',
        text: res.reply || res.text || 'Je n\'ai pas bien compris votre requête.',
        action: res.action || null,
        redFlag: res.redFlag || false,
        time: 'À l\'instant'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Désolé, le service d\'assistance rencontre une difficulté momentanée.',
          time: 'À l\'instant'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action.type === 'EMERGENCY') {
      window.location.href = `tel:${action.tel || 190}`;
    } else if (action.type === 'FILTER') {
      setIsOpen(false);
      navigate(`/search?specialty=${action.filterKey}`);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-[#00b4b6] to-[#0086cd] hover:from-[#00a3a5] hover:to-[#0074b3] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer border-2 border-white/40 group"
          title="Consulter DocBot IA"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
          </div>
          <span className="hidden sm:inline font-black text-xs tracking-wide">
            DocBot IA Clinique
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[90vw] sm:w-96 bg-white dark:bg-[#0b132b] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[520px] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#00b4b6] to-[#0086cd] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>DocBot IA Clinique</span>
                  <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                </h3>
                <p className="text-[10px] text-teal-100 font-medium">Triage Derja Tunisien & Français</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs custom-scrollbar bg-slate-50 dark:bg-[#0d162e]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl shadow-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#0086cd] text-white rounded-br-none'
                      : m.redFlag
                      ? 'bg-rose-50 text-rose-900 border-2 border-rose-300 dark:bg-rose-950/60 dark:text-rose-100 rounded-bl-none'
                      : 'bg-white text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  
                  {/* Action buttons */}
                  {m.action && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                      {m.action.type === 'EMERGENCY' ? (
                        <button
                          onClick={() => handleAction(m.action)}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-2 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs animate-bounce"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>Appeler le {m.action.tel || 190} Immédiatement</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(m.action)}
                          className="w-full bg-[#00b4b6] hover:bg-teal-600 text-white font-extrabold py-1.5 px-3 rounded-xl text-center cursor-pointer shadow-xs text-xs"
                        >
                          {m.action.label || 'Voir les spécialistes ›'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                <span>DocBot analyse vos symptômes...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            {['wji3a fel 9alb', 'dharsa', 's5ana', 'mal de tête', 'grossesse'].map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(s);
                }}
                className="whitespace-nowrap px-2.5 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700 font-bold cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-[#0b132b] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez vos symptômes..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-teal-500 font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-[#00b4b6] hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
