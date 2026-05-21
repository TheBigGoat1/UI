import React, { useMemo, useState } from 'react';

const CandleStickChart = ({ data, height = 160, width = "100%" }) => {
  const [hoverData, setHoverData] = useState(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const prices = data.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      // Invert Y because SVG 0 is top
      const getPercent = (val) => 100 - ((val - minPrice) / priceRange) * 80 - 10;
      
      return {
        ...d,
        x,
        yHigh: getPercent(d.high),
        yLow: getPercent(d.low),
        yOpen: getPercent(d.open),
        yClose: getPercent(d.close),
        color: d.close >= d.open ? '#10b981' : '#ef4444', // Emerald vs Red
        isGreen: d.close >= d.open
      };
    });
  }, [data]);

  if (processedData.length === 0) return <div className="h-full w-full flex items-center justify-center text-[10px] text-text-muted">No Chart Data</div>;

  return (
    <div className="relative w-full h-full" onMouseLeave={() => setHoverData(null)}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
        {processedData.map((candle, i) => (
          <g key={i} className="transition-opacity hover:opacity-80">
            <line 
              x1={candle.x} y1={candle.yHigh} 
              x2={candle.x} y2={candle.yLow} 
              stroke={candle.color} strokeWidth="0.5" vectorEffect="non-scaling-stroke"
            />
            <line 
              x1={candle.x} y1={Math.min(candle.yOpen, candle.yClose)}
              x2={candle.x} y2={Math.max(candle.yOpen, candle.yClose)}
              stroke={candle.color} strokeWidth="3" vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        {hoverData && (
          <line 
            x1={0} y1={hoverData.yClose} x2={100} y2={hoverData.yClose} 
            stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
};

export default CandleStickChart;