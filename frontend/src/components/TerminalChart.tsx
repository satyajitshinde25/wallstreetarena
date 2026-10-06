/* ── TerminalChart — large real-time chart built on lightweight-charts ──
   All data comes from the backend (`/market/{ticker}/candles`) and is
   updated live from WebSocket prices. No client-side market data. */
import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts';
import type { CandleData } from '../types';
import './TerminalChart.css';

export type ChartStyle = 'candles' | 'area';

interface Props {
  ticker: string;
  candles: CandleData[];
  style?: ChartStyle;
  /** Live price from the WebSocket stream; repaints the last bar in real time */
  livePrice?: number | null;
  showLegend?: boolean;
}

const BASE_TIME = Math.floor(new Date('2024-01-01T09:30:00Z').getTime() / 1000);
const tickToTime = (tick: number) => (BASE_TIME + tick * 60) as UTCTimestamp;

export default function TerminalChart({
  ticker,
  candles,
  style = 'candles',
  livePrice = null,
  showLegend = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef(style);
  styleRef.current = style;
  const lastTickerRef = useRef<string | null>(null);

  // ── Create chart once ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b929c',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.035)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.035)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(201, 162, 39, 0.45)', width: 1, style: 2, labelBackgroundColor: '#1a1e23' },
        horzLine: { color: 'rgba(201, 162, 39, 0.45)', width: 1, style: 2, labelBackgroundColor: '#1a1e23' },
      },
    });
    chartRef.current = chart;

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#2dd4a0',
      downColor: '#f0506e',
      borderUpColor: '#2dd4a0',
      borderDownColor: '#f0506e',
      wickUpColor: 'rgba(45, 212, 160, 0.7)',
      wickDownColor: 'rgba(240, 80, 110, 0.7)',
    });

    areaSeriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: '#e8c558',
      topColor: 'rgba(201, 162, 39, 0.28)',
      bottomColor: 'rgba(201, 162, 39, 0.0)',
      lineWidth: 2,
    });

    const resize = new ResizeObserver(() => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
      }
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
    };
  }, []);

  const toBarData = () =>
    candles.map((c) => ({
      time: tickToTime(c.tick),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

  const toLineData = () =>
    candles.map((c) => ({ time: tickToTime(c.tick), value: c.close }));

  // ── Load candle history; fit view only when the instrument changes ──
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    if (!candleSeries || !areaSeries) return;

    const isNewInstrument = lastTickerRef.current !== ticker;
    lastTickerRef.current = ticker;

    candleSeries.setData(styleRef.current === 'candles' ? toBarData() : []);
    areaSeries.setData(styleRef.current === 'area' ? toLineData() : []);

    if (isNewInstrument) {
      chartRef.current?.timeScale().fitContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, ticker]);

  // ── Switch visible series when the style toggle changes ──
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    if (!candleSeries || !areaSeries) return;

    candleSeries.setData(style === 'candles' ? toBarData() : []);
    areaSeries.setData(style === 'area' ? toLineData() : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  // ── Live update: repaint the final bar from the WebSocket price ──
  useEffect(() => {
    if (livePrice == null || candles.length === 0) return;
    const last = candles[candles.length - 1];
    const t = tickToTime(last.tick);

    if (styleRef.current === 'candles' && candleSeriesRef.current) {
      candleSeriesRef.current.update({
        time: t,
        open: last.open,
        high: Math.max(last.high, livePrice),
        low: Math.min(last.low, livePrice),
        close: livePrice,
      });
    } else if (styleRef.current === 'area' && areaSeriesRef.current) {
      areaSeriesRef.current.update({ time: t, value: livePrice });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice, candles]);

  // ── Crosshair legend ──
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    const legendEl = legendRef.current;
    if (!chart || !candleSeries || !areaSeries || !legendEl) return;

    const render = (param?: MouseEventParams) => {
      const fmt = (v: number) => v.toFixed(2);
      if (!param || !param.time) {
        const last = candles[candles.length - 1];
        if (!last) { legendEl.innerHTML = ''; return; }
        legendEl.innerHTML =
          `<span class="tl-ohlc">O <b>${fmt(last.open)}</b> H <b>${fmt(last.high)}</b> L <b>${fmt(last.low)}</b> C <b>${fmt(last.close)}</b></span>`;
        return;
      }
      const d = param.seriesData.get(styleRef.current === 'candles' ? candleSeries : areaSeries) as any;
      if (!d) return;
      if (d.open != null) {
        legendEl.innerHTML =
          `<span class="tl-ohlc">O <b>${fmt(d.open)}</b> H <b>${fmt(d.high)}</b> L <b>${fmt(d.low)}</b> C <b>${fmt(d.close)}</b></span>`;
      } else if (d.value != null) {
        legendEl.innerHTML = `<span class="tl-ohlc">CLOSE <b>${fmt(d.value)}</b></span>`;
      }
    };

    chart.subscribeCrosshairMove(render);
    render();
    return () => { try { chart.unsubscribeCrosshairMove(render); } catch { /* disposed */ } };
  }, [candles]);

  return (
    <div className="terminal-chart">
      {showLegend && <div className="tl-legend mono" ref={legendRef} />}
      <div ref={containerRef} className="tl-canvas" />
    </div>
  );
}
