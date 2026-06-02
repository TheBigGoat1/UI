import React, { useEffect, useState } from 'react';
import { X, Brain, Send, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api/api.js';

const MrktNewsInsightPanel = ({ article, asset, onClose }) => {
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [followUp, setFollowUp] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [thread, setThread] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReply('');
    setThread([]);

    api.chat
      .newsInsight({
        title: article?.title,
        summary: article?.description || article?.summary,
        asset,
      })
      .then((res) => {
        if (!active) return;
        const text = res?.data?.reply || res?.error || 'Could not generate insight.';
        setReply(text);
        setThread([{ role: 'ai', text }]);
      })
      .catch((e) => {
        if (active) setReply(e.error || 'Insight unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [article?.title, asset]);

  const sendFollowUp = async (e) => {
    e.preventDefault();
    const q = followUp.trim();
    if (!q) return;
    setChatLoading(true);
    setThread((t) => [...t, { role: 'user', text: q }]);
    setFollowUp('');

    const prompt = `Original headline: ${article?.title}
Prior analysis: ${reply}
User follow-up: ${q}
Asset: ${asset}. Answer in 2-3 sentences.`;

    try {
      const res = await api.chat.send(prompt);
      const text = res?.data?.reply || 'No response.';
      setThread((t) => [...t, { role: 'ai', text }]);
    } catch {
      setThread((t) => [...t, { role: 'ai', text: 'Could not reach AI. Try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="mrkt-news-insight" role="dialog" aria-label="News AI insight">
      <div className="mrkt-news-insight__head">
        <span className="mrkt-news-insight__title">
          <Brain size={16} /> AI on this headline
        </span>
        <button type="button" onClick={onClose} className="mrkt-news-insight__close" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <p className="mrkt-news-insight__headline">{(article?.title || '').toUpperCase()}</p>

      <div className="mrkt-news-insight__scroll custom-scrollbar">
        {loading ? (
          <div className="mrkt-news-insight__loading">
            <Loader2 size={20} className="animate-spin text-[#8b5cf6]" />
            <span>Analyzing market impact…</span>
          </div>
        ) : (
          <>
            {thread.map((msg, i) => (
              <div
                key={i}
                className={`mrkt-news-insight__bubble ${
                  msg.role === 'user' ? 'mrkt-news-insight__bubble--user' : ''
                }`}
              >
                {msg.role === 'ai' && <Sparkles size={12} className="shrink-0 text-[#8b5cf6]" />}
                <p>{msg.text}</p>
              </div>
            ))}
          </>
        )}
      </div>

      <form onSubmit={sendFollowUp} className="mrkt-news-insight__input">
        <input
          type="text"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder="Ask a follow-up on this story…"
          disabled={loading || chatLoading}
        />
        <button type="submit" disabled={loading || chatLoading || !followUp.trim()}>
          {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};

export default MrktNewsInsightPanel;
