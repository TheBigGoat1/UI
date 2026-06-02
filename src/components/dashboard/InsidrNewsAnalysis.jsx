import React, { useEffect, useState, useMemo } from 'react';
import { X, Brain, Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { api } from '../../services/api/api.js';
import MrktInfinityLoader from './MrktInfinityLoader.jsx';
import { formatAssetPct } from '../../utils/newsAssets.js';

/**
 * Insidr Analysis — headline-grounded desk note (bias = story implication, not live tick).
 */
const InsidrNewsAnalysis = ({
  article,
  asset,
  prices = {},
  marketContext,
  onClose,
  onSelectAsset,
  variant = 'desk',
}) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState('');
  const [assets, setAssets] = useState([]);
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');

  const articleKey = useMemo(() => {
    const id = article?.id || article?.guid || article?.url;
    if (id) return String(id);
    return `${article?.title || ''}|${article?.publishedAt || article?.time || ''}`;
  }, [article?.id, article?.guid, article?.url, article?.title, article?.publishedAt, article?.time]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setAnalysis('');
    setAssets([]);
    setProvider('');

    const title = article?.title?.trim();
    if (!title || title.length < 4) {
      setError('Headline too short for Insidr Analysis.');
      setLoading(false);
      return undefined;
    }

    api.chat
      .newsInsight({
        title,
        summary: article?.description || article?.summary || '',
        asset,
        symbols: article?.symbols || article?.assets || [],
        marketContext,
        articleId: article?.id || article?.guid || article?.url || articleKey,
        source: article?.source,
        publishedAt: article?.publishedAt || article?.time,
        impact: article?.impact || article?.category,
        sentimentScore: article?.sentiment_score ?? article?.sentimentScore,
      })
      .then((res) => {
        if (!active) return;
        if (!res?.success && res?.code === 'capability_required') {
          setError(res.error || 'Upgrade to Pro for Insidr Analysis.');
          return;
        }
        const data = res?.data || {};
        setAnalysis(data.analysis || data.reply || res?.error || 'Analysis unavailable.');
        setAssets(Array.isArray(data.assets) ? data.assets : []);
        setProvider(data.provider || '');
      })
      .catch((e) => {
        if (active) setError(e.error || 'Insidr Analysis unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [articleKey, asset, marketContext]);

  const displayAssets = useMemo(() => {
    return assets.map((a) => {
      const sym = a.symbol || a.label;
      const live = formatAssetPct(sym, prices);
      return {
        ...a,
        symbol: sym,
        bias: a.bias || 'neutral',
        pctLabel: live.label,
        liveHint: live.label !== '—' ? `Session ${live.label}` : null,
      };
    });
  }, [assets, prices]);

  return (
    <div
      className={`insidr-analysis insidr-analysis--desk ${
        variant === 'feed' ? 'insidr-analysis--feed' : ''
      }`}
      role="region"
      aria-label="Insidr Analysis"
    >
      <div className="insidr-analysis__head">
        <span className="insidr-analysis__brand">
          <Brain size={14} className="insidr-analysis__icon" />
          Insidr Analysis
          {provider && provider !== 'anthropic' && (
            <span className="insidr-analysis__provider" title="Headline rules engine">
              grounded
            </span>
          )}
        </span>
        <button type="button" className="insidr-analysis__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <MrktInfinityLoader label="Reading headline & building market transmission…" />
      ) : error ? (
        <p className="insidr-analysis__error">{error}</p>
      ) : (
        <>
          <div className="insidr-analysis__body">{analysis}</div>
          {displayAssets.length > 0 && (
            <div className="insidr-analysis__assets-row">
              {displayAssets.map((a) => (
                <button
                  key={a.symbol}
                  type="button"
                  className={`insidr-analysis__asset-pill insidr-analysis__asset-pill--${a.bias}`}
                  title={
                    [a.rationale, a.liveHint].filter(Boolean).join(' · ') ||
                    `${a.symbol} — click for chart`
                  }
                  onClick={() => onSelectAsset?.(a.symbol)}
                >
                  {a.bias === 'down' && <TrendingDown size={11} className="shrink-0" />}
                  {a.bias === 'up' && <TrendingUp size={11} className="shrink-0" />}
                  {a.bias === 'neutral' && <Minus size={11} className="shrink-0" />}
                  <span>{a.symbol}</span>
                  <Info size={9} className="insidr-analysis__info" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InsidrNewsAnalysis;
