import React, { useEffect, useState } from 'react';
import { X, Brain, Info } from 'lucide-react';
import { api } from '../../services/api/api.js';
import MrktInfinityLoader from './MrktInfinityLoader.jsx';

function renderAnalysis(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const MrktNewsInsightInline = ({ article, asset, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState('');
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setAnalysis('');
    setAssets([]);

    api.chat
      .newsInsight({
        title: article?.title,
        summary: article?.description || article?.summary,
        asset,
        symbols: article?.symbols,
      })
      .then((res) => {
        if (!active) return;
        if (!res?.success && res?.code === 'capability_required') {
          setError(res.error || 'Upgrade to Pro for Insidr Analysis.');
          return;
        }
        const data = res?.data || {};
        setAnalysis(data.analysis || data.reply || res?.error || 'Could not generate analysis.');
        setAssets(Array.isArray(data.assets) ? data.assets : []);
      })
      .catch((e) => {
        if (active) setError(e.error || 'Analysis unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [article?.title, article?.description, article?.summary, asset]);

  return (
    <div className="mrkt-ai-panel" role="region" aria-label="Insidr Analysis">
      <div className="mrkt-ai-panel__head">
        <span className="mrkt-ai-panel__brand">
          <Brain size={14} /> Insidr Analysis
        </span>
        <button type="button" className="mrkt-ai-panel__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <MrktInfinityLoader />
      ) : error ? (
        <p className="mrkt-ai-panel__error">{error}</p>
      ) : (
        <>
          <div className="mrkt-ai-panel__body custom-scrollbar">{renderAnalysis(analysis)}</div>
          {assets.length > 0 && (
            <div className="mrkt-ai-panel__assets">
              {assets.map((a) => (
                <span
                  key={a.symbol}
                  className={`mrkt-ai-panel__asset mrkt-ai-panel__asset--${a.bias || 'neutral'}`}
                  title={a.rationale || a.label || a.symbol}
                >
                  {a.bias === 'up' && <span className="mrkt-ai-panel__arrow">↗</span>}
                  {a.bias === 'down' && <span className="mrkt-ai-panel__arrow">↘</span>}
                  <span>{a.label || a.symbol}</span>
                  <Info size={10} className="mrkt-ai-panel__info" aria-hidden />
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MrktNewsInsightInline;
