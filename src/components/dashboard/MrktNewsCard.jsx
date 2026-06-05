import React, { useState, useEffect } from 'react';
import { Bookmark, Brain, Camera, Copy, Download } from 'lucide-react';
import InsidrNewsAnalysis from './InsidrNewsAnalysis.jsx';
import { isBookmarked, toggleBookmark } from '../../utils/newsBookmarks.js';
import { copyArticle, downloadArticle } from '../../utils/newsExport.js';
import { formatNewsHeadline } from '../../utils/displayFormat.js';
import {
  formatNewsDisplayTime,
  inferWatchAssets,
  assetDirection,
  isBreakingItem,
} from '../../utils/newsAssets.js';

const MrktNewsCard = ({
  item,
  highlight = false,
  breaking = false,
  showAssets = false,
  selected = false,
  deskAsset,
  activeTab = 'all',
  prices,
  canAiInsight,
  onUpgrade,
  onToast,
  onSelectAsset,
  onNewsActivate,
  marketContext,
  wireHeadline = false,
}) => {
  const [saved, setSaved] = useState(() => isBookmarked(item));
  const [aiOpen, setAiOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!selected) setAiOpen(false);
  }, [selected]);

  useEffect(() => {
    if (!exportOpen) return undefined;
    const close = () => setExportOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [exportOpen]);

  const timeLabel = formatNewsDisplayTime(item.publishedAt || item.time);
  const summary = item.description || item.summary;
  const title = item.title || '';
  const showBreaking = breaking || isBreakingItem(item);
  const watchAssets = showAssets ? inferWatchAssets(item, deskAsset, activeTab) : [];

  const handleCardClick = () => {
    onNewsActivate?.(item);
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    const nowSaved = toggleBookmark(item);
    setSaved(nowSaved);
    onToast?.(nowSaved ? 'Saved to bookmarks' : 'Removed from bookmarks');
  };

  const handleBrain = (e) => {
    e.stopPropagation();
    if (!canAiInsight) {
      onUpgrade?.('news.ai_insight');
      return;
    }
    onNewsActivate?.(item);
    setAiOpen((v) => !v);
  };

  const handleAssetClick = (e, sym) => {
    e.stopPropagation();
    onNewsActivate?.(item);
    onSelectAsset?.(sym);
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await copyArticle(item, deskAsset);
      onToast?.('Copied to clipboard');
    } catch {
      onToast?.('Copy failed');
    }
    setExportOpen(false);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadArticle(item, deskAsset);
    onToast?.('Downloaded');
    setExportOpen(false);
  };

  const handleCamera = (e) => {
    e.stopPropagation();
    setExportOpen((v) => !v);
  };

  return (
    <article
      className={`mrkt-news__card mrkt-news__card--clickable ${
        highlight ? 'mrkt-news__card--highlight' : ''
      } ${selected ? 'mrkt-news__card--selected' : ''} ${aiOpen ? 'mrkt-news__card--ai-open' : ''}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Open ${title || 'headline'}`}
    >
      <div className="mrkt-news__card-body">
        <div className="mrkt-news__card-top">
          {showBreaking && (
            <span className="mrkt-news__badge">
              <span className="mrkt-news__badge-dot" aria-hidden />
              BREAKING NEWS
            </span>
          )}
          <span className="mrkt-news__time">{timeLabel}</span>
        </div>

        <h3 className={`mrkt-news__headline ${highlight ? 'mrkt-news__headline--featured' : ''}`}>
          {wireHeadline ? title : formatNewsHeadline(title)}
        </h3>

        {summary && <p className="mrkt-news__summary">{summary}</p>}

        {watchAssets.length > 0 && (
          <div className="mrkt-news__assets-block">
            <p className="mrkt-news__assets-label">ASSETS TO WATCH</p>
            <div className="mrkt-news__assets">
              {watchAssets.map((sym) => {
                const dir = assetDirection(sym, prices);
                return (
                  <button
                    key={sym}
                    type="button"
                    className={`mrkt-news__asset-chip mrkt-news__asset-chip--btn mrkt-news__asset-chip--${dir} ${
                      sym === deskAsset ? 'mrkt-news__asset-chip--desk' : ''
                    }`}
                    onClick={(e) => handleAssetClick(e, sym)}
                    title={`Chart ${sym}`}
                  >
                    {sym}
                    {dir === 'up' && <span aria-hidden> ↑</span>}
                    {dir === 'down' && <span aria-hidden> ↓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {aiOpen && (
          <div onClick={(e) => e.stopPropagation()} role="presentation" className="mrkt-news__inline-ai">
            <InsidrNewsAnalysis
              article={item}
              asset={deskAsset}
              prices={prices}
              marketContext={marketContext}
              onSelectAsset={onSelectAsset}
              onClose={() => setAiOpen(false)}
              variant="feed"
            />
          </div>
        )}
      </div>

      <div className="mrkt-news__card-actions" aria-label="Article actions">
        <button
          type="button"
          className={`mrkt-news__action-btn mrkt-news__action-btn--bookmark ${
            saved ? 'mrkt-news__action-btn--on' : ''
          }`}
          onClick={handleBookmark}
          title="Bookmark"
          aria-label="Bookmark"
          aria-pressed={saved}
        >
          <Bookmark size={15} strokeWidth={saved ? 2.5 : 2} />
        </button>
        <button
          type="button"
          className={`mrkt-news__action-btn mrkt-news__action-btn--brain ${
            aiOpen ? 'mrkt-news__action-btn--brain-on' : ''
          } ${!canAiInsight ? 'mrkt-news__action-btn--locked' : ''}`}
          onClick={handleBrain}
          title={canAiInsight ? 'Insidr Analysis' : 'Pro — Insidr Analysis'}
          aria-label="Insidr Analysis"
          aria-expanded={aiOpen}
        >
          <Brain size={15} />
        </button>
        <div className="mrkt-news__export-wrap">
          <button
            type="button"
            className={`mrkt-news__action-btn mrkt-news__action-btn--camera ${
              exportOpen ? 'mrkt-news__action-btn--on' : ''
            }`}
            onClick={handleCamera}
            title="Copy or download"
            aria-label="Export"
            aria-expanded={exportOpen}
          >
            <Camera size={15} />
          </button>
          {exportOpen && (
            <div className="mrkt-news__export-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <button type="button" role="menuitem" onClick={handleCopy}>
                <Copy size={12} /> Copy
              </button>
              <button type="button" role="menuitem" onClick={handleDownload}>
                <Download size={12} /> Download
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default MrktNewsCard;
