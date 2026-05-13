import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export const ChartComponent = () => {
    const chartContainerRef = useRef();
    const chartRef = useRef();

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Ensure container has some size
        const width = chartContainerRef.current.clientWidth || 300;
        const height = chartContainerRef.current.clientHeight || 400;

        try {
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { color: '#131722' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                },
                rightPriceScale: {
                    borderColor: 'rgba(197, 203, 206, 0.1)',
                },
                timeScale: {
                    borderColor: 'rgba(197, 203, 206, 0.1)',
                    timeVisible: true,
                    secondsVisible: false,
                },
                width: width,
                height: height,
            });

            const candlestickSeries = chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            const mockData = [
                { time: '2026-05-10', open: 62000, high: 63000, low: 61500, close: 62500 },
                { time: '2026-05-11', open: 62500, high: 64000, low: 62000, close: 63500 },
                { time: '2026-05-12', open: 63500, high: 63800, low: 62800, close: 63200 },
                { time: '2026-05-13', open: 63200, high: 64500, low: 63000, close: 64200 },
            ];

            candlestickSeries.setData(mockData);
            chartRef.current = chart;

            const handleResize = () => {
                if (chartContainerRef.current && chartRef.current) {
                    chartRef.current.applyOptions({ 
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight 
                    });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                chart.remove();
            };
        } catch (error) {
            console.error("Chart creation failed:", error);
        }
    }, []);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
};
