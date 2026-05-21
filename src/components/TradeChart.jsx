import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';

const TradeChart = ({ data, levels = [], height = 300, interactive = true }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || !chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: 'transparent' }, 
        textColor: '#a1a1aa' 
      },
      grid: { 
        vertLines: { visible: interactive, color: '#27272a' }, 
        horzLines: { visible: interactive, color: '#27272a' } 
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        visible: interactive, // Hide time scale on small cards
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        visible: interactive, // Hide price scale on small cards
      },
      handleScroll: interactive,
      handleScale: interactive,
      crosshair: {
        mode: interactive ? 1 : 0,
        vertLine: { visible: interactive },
        horzLine: { visible: interactive },
      }
    });

    chartRef.current = chart;

    // Create Series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', 
      downColor: '#ef4444', 
      borderVisible: false,
      wickUpColor: '#10b981', 
      wickDownColor: '#ef4444',
    });

    // Map Data
    const formattedData = data.map(d => ({
      time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
      open: parseFloat(d.open), 
      high: parseFloat(d.high), 
      low: parseFloat(d.low), 
      close: parseFloat(d.close),
    })).sort((a, b) => a.time - b.time);

    series.setData(formattedData);

    // Add Levels (Entry, Stop, Target)
    if (interactive) {
      levels.forEach(level => {
        if(!level.price || level.price === '-') return;
        series.createPriceLine({
          price: parseFloat(level.price),
          color: level.type === 'RESISTANCE' ? '#ef4444' : '#10b981',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: level.label || level.type,
        });
      });
    }

    // Fit Content
    chart.timeScale().fitContent();

    // Resize Handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, levels, height, interactive]);

  return <div ref={chartContainerRef} className="w-full" style={{ height }} />;
};

export default TradeChart;