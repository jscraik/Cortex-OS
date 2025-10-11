import * as React from 'react';

import { loadHighcharts } from './sparkline/highchartsLoader';

type SparklineProps = {
	data: number[];
	color?: string;
	delay?: number;
	height?: number;
	className?: string;
	ariaLabel?: string;
};

export function Sparkline({
	data,
	color = '#4F46E5',
	delay = 0,
	height = 40,
	className,
	ariaLabel = 'Sparkline',
}: SparklineProps): React.ReactElement {
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const chartRef = React.useRef<any>(null);
	const mounted = React.useRef(false);

	React.useEffect(() => {
		mounted.current = true;
		const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
		let timeoutHandle: number | undefined;

		loadHighcharts().then((Highcharts) => {
			if (!mounted.current || !containerRef.current) {
				return;
			}

			const createChart = () => {
				if (!mounted.current || !containerRef.current) {
					return;
				}

				chartRef.current?.destroy?.();
				chartRef.current = Highcharts.chart(containerRef.current, {
					chart: {
						type: 'area',
						backgroundColor: 'transparent',
						margin: [2, 0, 2, 0],
						height,
						style: { overflow: 'visible' },
						animation: false,
					},
					title: { text: '' },
					xAxis: {
						labels: { enabled: false },
						title: { text: null },
						startOnTick: false,
						endOnTick: false,
						tickPositions: [],
						lineWidth: 0,
					},
					yAxis: {
						labels: { enabled: false },
						title: { text: null },
						gridLineWidth: 0,
						tickPositions: [0],
						startOnTick: false,
						endOnTick: false,
					},
					legend: { enabled: false },
					tooltip: { enabled: false },
					plotOptions: {
						series: {
							lineWidth: 2,
							marker: { enabled: false },
							states: { hover: { enabled: false } },
							shadow: false,
							animation: reduceMotion
								? false
								: {
										duration: 1200,
										easing: 'easeOutQuart',
								  },
						},
						area: {
							fillOpacity: 0.15,
						},
					},
					series: [
						{
							type: 'area',
							data,
							color,
						},
					],
				});
			};

			if (delay && !reduceMotion) {
				timeoutHandle = window.setTimeout(createChart, delay) as unknown as number;
			} else {
				createChart();
			}
		});

		const resizeObserver = new ResizeObserver(() => chartRef.current?.reflow?.());
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			mounted.current = false;
			if (timeoutHandle) {
				window.clearTimeout(timeoutHandle);
			}
			resizeObserver.disconnect();
			chartRef.current?.destroy?.();
			chartRef.current = null;
		};
	}, [color, data, delay, height]);

	return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} style={{ height }} />;
}
