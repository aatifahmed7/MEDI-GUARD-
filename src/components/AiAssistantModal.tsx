import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  User,
  Bot,
  RefreshCw,
  Pill,
  ShieldCheck,
} from 'lucide-react';
import { sendChatMessage } from '../utils/api.js';
import { PatientProfile, Medicine, AdherenceMetrics } from '../types.js';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientProfile | null;
  medicines: Medicine[];
  metrics: AdherenceMetrics | null;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  patient,
  medicines,
  metrics,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello! I am MediGuard AI, your clinical adherence assistant. I'm actively monitoring your medication schedule (Adherence Score: ${
        metrics?.overallScore ?? 92
      }%, Risk Level: ${
        metrics?.riskLevel ?? 'LOW'
      }). How can I support your medication routine today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend !== undefined ? messageToSend : inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (messageToSend === undefined) setInputText('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));

      const res = await sendChatMessage(historyPayload, text);

      const botMsg: ChatMessage = {
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        sender: 'assistant',
        text: 'I encountered a temporary connection issue. Please consult your physician or pharmacist for urgent medication instructions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'What should I do if I missed my evening Metformin dose?',
    'Why is my adherence risk level currently calculated as Moderate?',
    'Can Lisinopril and Metformin be taken at the same time?',
    'Tips to improve my evening medication consistency',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full h-[620px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 px-6 bg-[#0B1F33] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">MediGuard AI Assistant</h3>
              <p className="text-xs text-slate-300">
                Patient: {patient?.name || 'Eleanor Vance'} • Score: {metrics?.overallScore ?? 92}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Messages */}
        <div
          ref={scrollRef}
          className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-3.5 bg-slate-50/50"
        >
          {messages.map((m, idx) => {
            const isBot = m.sender === 'assistant';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-full bg-[#0B1F33] text-teal-400 flex items-center justify-center shrink-0 border border-slate-700">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                    isBot
                      ? 'bg-white border border-slate-200 text-slate-800'
                      : 'bg-blue-600 text-white font-medium'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block text-[10px] mt-1.5 font-mono ${
                      isBot ? 'text-slate-400' : 'text-blue-100'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
                {!isBot && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-[#0B1F33] text-teal-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-500 shadow-2xs">
                Reviewing your current medication schedule...
              </div>
            </div>
          )}
        </div>

        {/* Sample Prompt Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSend(p)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-[11px] font-medium text-slate-700 border border-slate-200 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything about medicines, missed doses, or routines..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
