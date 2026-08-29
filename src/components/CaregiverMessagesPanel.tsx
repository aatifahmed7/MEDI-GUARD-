import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { CaregiverLink, Message } from '../types.js';
import { fetchMessages, sendMessage } from '../utils/api.js';

interface CaregiverMessagesPanelProps {
  links: CaregiverLink[];
}

export const CaregiverMessagesPanel: React.FC<CaregiverMessagesPanelProps> = ({ links }) => {
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const selectedLink = useMemo(() => links.find((link) => link.id === selectedLinkId) || null, [links, selectedLinkId]);

  useEffect(() => {
    if (!links.length) {
      setSelectedLinkId(null);
      setMessages([]);
      return;
    }
    if (!selectedLinkId || !links.some((link) => link.id === selectedLinkId)) {
      setSelectedLinkId(links[0].id);
    }
  }, [links, selectedLinkId]);

  useEffect(() => {
    if (!selectedLinkId) return;
    const loadThread = async () => {
      try {
        const nextMessages = await fetchMessages(selectedLinkId);
        setMessages(nextMessages);
      } catch (error) {
        console.error('Failed to load caregiver conversation:', error);
        setMessages([]);
      }
    };
    void loadThread();
  }, [selectedLinkId]);

  const handleSend = async () => {
    if (!selectedLinkId || !draft.trim()) return;
    setSending(true);
    try {
      const sent = await sendMessage({ linkId: selectedLinkId, text: draft.trim() });
      setMessages((current) => [...current, sent]);
      setDraft('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!links.length) {
    return <div className="p-6 bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">No connected patients yet. Accepted patient links will appear here for messaging.</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-3">
        <h2 className="font-black text-lg mb-3">Connected patients</h2>
        <div className="space-y-2">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => setSelectedLinkId(link.id)}
              className={`w-full text-left p-3 rounded-xl border ${
                selectedLinkId === link.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="font-bold text-sm text-slate-900">{link.patientName || 'Patient'}</div>
              <div className="text-[11px] text-slate-500">{link.relationship || 'Connected care link'}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {selectedLink && (
          <>
            <header className="border-b border-slate-200 px-4 py-3 bg-slate-50">
              <h3 className="font-bold text-slate-900">{selectedLink.patientName || 'Patient'}</h3>
            </header>
            <div className="p-4 space-y-3 min-h-[320px] bg-[#F8FAFC]">
              {messages.length === 0 ? (
                <div className="text-sm text-slate-500 text-center mt-12">No messages yet for this patient.</div>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderRole === 'Caregiver';
                  return (
                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMine ? 'bg-[#0B1F33] text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
                        <div className="text-[10px] opacity-80 font-semibold mb-1">{message.senderName}</div>
                        <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-slate-300' : 'text-slate-500'}`}>
                          {new Date(message.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-slate-200 p-3 flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Send a message…"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                className="inline-flex items-center gap-2 bg-[#0B1F33] text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
