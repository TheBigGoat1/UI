import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Brain, Camera, ArrowRight, Copy, Download } from 'lucide-react';
import TradeChart from '../TradeChart.jsx';
import InsidrNewsAnalysis from './InsidrNewsAnalysis.jsx';
import {
  inferWatchAssets,
  formatAssetPct,
  formatNewsTime,
  newsImpactLabel,
} from '../../utils/newsAssets.js';
import { isBookmarked, toggleBookmark } from '../../utils/newsBookmarks.js';
import { copyArticle, downloadArticle } from '../../utils/newsExport.js';

const MrktNewsExpanded = ({
  item,
  deskAsset,
  activeTab,
  prices,
  marketContext,
  canAiInsight,
  onUpgrade,
  onToast,
  onSelectAsset,
}) => {
  const [saved, setSaved] = useState(() => isBookmarked(item));
  const [aiOpen, setAiOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState(
    () => (inferWatchAssets(item, deskAsset, activeTab)[0] || deskAsset),
  );

  const { ago } = formatNewsTime(item.publishedAt || item.time);
  const impact = newsImpactLabel(item);
  const watchAssets = inferWatchAssets(item, deskAsset, activeTab);
  const summary = item.description || item.summary;

  const pickAsset = (sym) => {
    setChartSymbol(sym);
    onSelectAsset?.(sym);
  };

  return (
    <div className="mrkt-news-expanded">
      <div className="mrkt-news-expanded__layout">
        <div className="mrkt-news-expanded__main">
          <div className="mrkt-news-expanded__meta">
            {impact && <span className="mrkt-news-impact">{impact}</span>}
            <span className="mrkt-news-expanded__ago">{ago}</span>
          </div>

          <h3 className="mrkt-news-expanded__headline">{(item.title || '').toUpperCase()}</h3>
          {summary && <p className="mrkt-news-expanded__summary">{summary}</p>}

          <div className="mrkt-news-expanded__asset-grid">
            {watchAssets.map((sym) => {
              const { changePct, label } = formatAssetPct(sym, prices);
              const up = changePct > 0.02;
              const down = changePct < -0.02;
              const active = sym === chartSymbol || sym === deskAsset;
              return (
                <button
                  key={sym}
                  type="button"
                  className={`mrkt-news-expanded__asset ${up ? 'up' : down ? 'down' : ''} ${
                    active ? 'active' : ''
                  }`}
                  onClick={() => pickAsset(sym)}
                >
                  {sym} {up ? '↑' : down ? '↓' : ''} {label}
                </button>
              );
            })}
            <span className="mrkt-news-expanded__asset mrkt-news-expanded__asset--more">+</span>
          </div>

          <div className="mrkt-news-expanded__chart">
            <TradeChart
              key={`mini-${chartSymbol}-1h`}
              symbol={chartSymbol}
              interval="1h"
              height={220}
              compact
              fill={false}
            />
            <span className="mrkt-news-expanded__headline-marker" aria-hidden>
              Headline
            </span>
          </div>

          {aiOpen && (
            <InsidrNewsAnalysis
              article={item}
              asset={chartSymbol}
              prices={prices}
              marketContext={marketContext}
              onSelectAsset={pickAsset}
              onClose={() => setAiOpen(false)}
            />
          )}

          <div className="mrkt-news-expanded__links">
            <Link to="/dashboard/ideas" className="mrkt-news__footer-link">
              View Market Recap <ArrowRight size={12} />
            </Link>
            <Link to="/dashboard/news" className="mrkt-news__footer-link">
              View Recent Headlines <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        <div className="mrkt-news-expanded__rail">
          <button
            type="button"
            className={`mrkt-news__action-btn ${saved ? 'mrkt-news__action-btn--on' : ''}`}
            onClick={() => {
              const now = toggleBookmark(item);
              setSaved(now);
              onToast?.(now ? 'Saved' : 'Removed');
            }}
            aria-label="Bookmark"
          >
            <Bookmark size={15} />
          </button>
          <button
            type="button"
            className={`mrkt-news__action-btn ${aiOpen ? 'mrkt-news__action-btn--brain-on' : ''}`}
            onClick={() => {
              if (!canAiInsight) {
                onUpgrade?.('news.ai_insight');
                return;
              }
              setAiOpen((v) => !v);
            }}
            aria-label="Insidr Analysis"
            aria-expanded={aiOpen}
          >
            <Brain size={15} />
          </button>
          <div className="mrkt-news-expanded__export-wrap">
            <button
              type="button"
              className="mrkt-news__action-btn"
              onClick={() => setExportOpen((v) => !v)}
              aria-label="Export"
            >
              <Camera size={15} />
            </button>
            {exportOpen && (
              <div className="mrkt-news__export-menu">
                <button
                  type="button"
                  onClick={async () => {
                    await copyArticle(item, deskAsset);
                    onToast?.('Copied');
                    setExportOpen(false);
                  }}
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadArticle(item, deskAsset);
                    onToast?.('Downloaded');
                    setExportOpen(false);
                  }}
                >
                  <Download size={12} /> Download
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MrktNewsExpanded;
