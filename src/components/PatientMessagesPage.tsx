import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Send, UserRound } from 'lucide-react';
import { CaregiverLink, Message } from '../types.js';
import { fetchConversationLinks, fetchMessages, sendMessage } from '../utils/api.js';

export const PatientMessagesPage: React.FC = () => {
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selectedLink = useMemo(
    () => links.find((link) => link.id === selectedLinkId) || null,
    [links, selectedLinkId]
  );

  const loadLinks = async () => {
    try {
      const nextLinks = await fetchConversationLinks();
      setLinks(nextLinks);
      if (!nextLinks.length) {
        setSelectedLinkId(null);
        setMessages([]);
        return;
      }
      setSelectedLinkId((current) => current && nextLinks.some((link) => link.id === current) ? current : nextLinks[0].id);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setLinks([]);
      setSelectedLinkId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
  }, []);

  useEffect(() => {
    if (!selectedLinkId) return;
    const fetchThread = async () => {
      try {
        const nextMessages = await fetchMessages(selectedLinkId);
        setMessages(nextMessages);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        setMessages([]);
      }
    };
    void fetchThread();
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

  if (loading) {
    return <div className="p-8 rounded-2xl bg-white border border-slate-200 text-sm text-slate-500">Loading messages…</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 min-h-[560px]">
      <aside className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareText className="w-5 h-5 text-[#0B1F33]" />
          <h2 className="font-black text-lg text-slate-900">Messages</h2>
        </div>

        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No connected caregiver yet. Accept a caregiver request in settings to begin messaging.
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => setSelectedLinkId(link.id)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selectedLinkId === link.id
                    ? 'border-[#0D6EFD] bg-[#0D6EFD]/5'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0B1F33] text-white text-xs font-bold grid place-items-center">
                    {link.caregiverName?.slice(0, 1).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{link.caregiverName || 'Caregiver'}</div>
                    <div className="text-[11px] text-slate-500">{link.relationship || 'Caregiver'}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="bg-white rounded-2xl border border-slate-200 flex flex-col min-h-[560px] overflow-hidden">
        {!selectedLink ? (
          <div className="flex-1 grid place-items-center text-slate-500 p-8 text-center">
            Select a caregiver to view the conversation.
          </div>
        ) : (
          <>
            <header className="border-b border-slate-200 px-5 py-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#20C997] text-slate-950 font-black grid place-items-center">
                  {selectedLink.caregiverName?.slice(0, 1).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedLink.caregiverName || 'Caregiver'}</h3>
                  <p className="text-xs text-slate-500">Connected caregiver</p>
                </div>
              </div>
            </header>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-[#F8FAFC]">
              {messages.length === 0 ? (
                <div className="text-sm text-slate-500 text-center mt-10">No messages yet. Start the conversation.</div>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderUid === selectedLink.caregiverUid ? false : true;
                  return (
                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                        isMine ? 'bg-[#0B1F33] text-white' : 'bg-white text-slate-800 border border-slate-200'
                      }`}>
                        <p className="text-xs font-semibold mb-1 opacity-80">{message.senderName}</p>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-slate-300' : 'text-slate-500'}`}>
                          {new Date(message.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-200 p-3 bg-white flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type a message…"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0D6EFD]"
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
      </section>
    </div>
  );
};
