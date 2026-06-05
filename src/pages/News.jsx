import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MrktLiveNews from '../components/dashboard/MrktLiveNews.jsx';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import { useTerminalRealtime } from '../hooks/useTerminalRealtime.js';
import { useNavigate } from 'react-router-dom';

const News = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const access = useFeatureAccess();
  const assetParam = searchParams.get('asset');
  const deskAsset = useMemo(() => {
    const raw = assetParam || 'XAUUSD';
    return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'XAUUSD';
  }, [assetParam]);

  const { prices, headlineNews, newsLoading, newsError, reloadNews } = useTerminalRealtime(deskAsset);

  const defaultSearch = searchParams.get('q') || '';

  const handleUpgrade = (cap) => {
    navigate('/dashboard/pricing', { state: { feature: cap } });
  };

  const handleSelectAsset = (sym) => {
    if (!sym) return;
    navigate(`/dashboard?asset=${encodeURIComponent(sym)}`);
  };

  useEffect(() => {
    document.title = 'Live News — Insidr';
  }, []);

  return (
    <div className="dash-page mrkt-news-page h-full flex flex-col min-h-0">
      <MrktLiveNews
        variant="page"
        asset={deskAsset}
        wireItems={headlineNews}
        wireLoading={newsLoading}
        onWireSync={reloadNews}
        onNewsRefresh={reloadNews}
        canAiInsight={access.canNewsAi}
        onUpgrade={handleUpgrade}
        onSelectAsset={handleSelectAsset}
        prices={prices}
        newsError={newsError}
        defaultSearch={defaultSearch}
      />
    </div>
  );
};

export default News;
