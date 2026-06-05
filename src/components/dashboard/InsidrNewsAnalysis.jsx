import React, { useEffect, useState, useMemo } from 'react';
import { X, Brain, Info, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { api } from '../../services/api/api.js';
import MrktInfinityLoader from './MrktInfinityLoader.jsx';
import BrainClaudeBadge from '../brain/BrainClaudeBadge.jsx';
import { marketContextKey } from '../../utils/marketContextKey.js';
import { formatAssetPct } from '../../utils/newsAssets.js';
import { isClaudeProvider, providerLabel, splitAnalysisParagraphs } from '../../utils/brainAnalysis.js';

/**
 * Insidr Analysis — headline-grounded Claude desk note (bias = story implication, not live tick).
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
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [assets, setAssets] = useState([]);
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');

  const articleKey = useMemo(() => {
    const id = article?.id || article?.guid || article?.url;
    if (id) return String(id);
    return `${article?.title || ''}|${article?.publishedAt || article?.time || ''}`;
  }, [article?.id, article?.guid, article?.url, article?.title, article?.publishedAt, article?.time]);

  const ctxKey = marketContextKey(marketContext);
  const headline = article?.title?.trim() || '';

  useEffect(() => {
    let active = true;
    if (!headline || headline.length < 4) {
      setError('Headline too short for Insidr Analysis.');
      setLoading(false);
      setEnhancing(false);
      return undefined;
    }

    const seed =
      article?.description?.trim() ||
      article?.summary?.trim() ||
      `Desk transmission read for ${asset}: ${headline}`;
    setAnalysis(seed);
    setLoading(false);
    setEnhancing(true);
    setError('');
    setAssets([]);
    setProvider('');

    api.chat
      .newsInsight({
        title: headline,
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
        if (active) setEnhancing(false);
      });

    return () => {
      active = false;
    };
  }, [articleKey, asset, ctxKey]);

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

  const paragraphs = useMemo(() => splitAnalysisParagraphs(analysis), [analysis]);

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
          <BrainClaudeBadge provider={provider} aiEnabled={provider === 'anthropic'} compact />
          {provider && !isClaudeProvider(provider) && (
            <span className="insidr-analysis__provider" title="Headline rules engine">
              {providerLabel(provider)}
            </span>
          )}
        </span>
        <button type="button" className="insidr-analysis__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {headline && (
        <p className="insidr-analysis__headline-context">{headline}</p>
      )}

      {loading ? (
        <MrktInfinityLoader label="Opening Insidr Analysis…" />
      ) : error ? (
        <p className="insidr-analysis__error">{error}</p>
      ) : (
        <>
          {enhancing && (
            <p className="insidr-analysis__enhancing" role="status">
              <Loader2 size={12} className="animate-spin" aria-hidden />
              Claude is deepening this desk read…
            </p>
          )}
          <div className="insidr-analysis__body">
            {paragraphs.length > 1
              ? paragraphs.map((p, i) => <p key={i} className="insidr-analysis__para">{p}</p>)
              : analysis}
          </div>
          {displayAssets.length > 0 && (
            <div className="insidr-analysis__assets-row">
              <span className="insidr-analysis__assets-label">Assets from this headline</span>
              <div className="insidr-analysis__assets-pills">
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
            </div>
          )}
          {!enhancing && provider && (
            <p className="insidr-analysis__foot">
              {isClaudeProvider(provider)
                ? 'Powered by Claude · headline-grounded desk read'
                : `${providerLabel(provider)} · upgrade to Pro for Claude when API key is configured`}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default InsidrNewsAnalysis;
