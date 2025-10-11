import * as React from 'react';

export function StickyFilterBar(): React.ReactElement {
	const [visible, setVisible] = React.useState(false);

	React.useEffect(() => {
		const strip = document.getElementById('metric-strip');
		const handleScroll = () => {
			if (!strip) {
				setVisible(false);
				return;
			}

			const threshold = strip.offsetTop + strip.offsetHeight;
			const y = window.scrollY + 64; // header height
			setVisible(y > threshold);
		};

		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<div
			className={`sticky top-16 bg-white border-b border-neutral-200 px-6 lg:px-8 py-4 z-10 shadow-sm transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
		>
			<div className="flex items-center gap-6 flex-wrap">
				<label className="flex items-center gap-2 text-sm text-neutral-600">
					<span className="font-medium">Time Range:</span>
					<select className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
						<option>Last 1 hour</option>
						<option>Last 6 hours</option>
						<option>Last 24 hours</option>
						<option>Last 7 days</option>
					</select>
				</label>
				<label className="flex items-center gap-2 text-sm text-neutral-600">
					<span className="font-medium">Severity:</span>
					<select className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
						<option>All Levels</option>
						<option>Critical</option>
						<option>Error</option>
						<option>Warning</option>
						<option>Info</option>
					</select>
				</label>
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm text-neutral-600 font-medium">Tags:</span>
					<Tag label="core" color="blue" />
					<Tag label="ingestion" color="emerald" />
					<Tag label="processing" color="purple" />
					<button className="text-xs text-neutral-500 hover:text-neutral-700 px-3 py-1 rounded-full border border-dashed border-neutral-300 hover:border-neutral-400">
						<i className="fa-solid fa-plus mr-1" aria-hidden="true" />
						Add Filter
					</button>
				</div>
				<button className="ml-auto text-xs text-neutral-500 hover:text-neutral-700 px-4 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50">
					<i className="fa-solid fa-rotate-left mr-1" aria-hidden="true" />
					Reset Filters
				</button>
			</div>
		</div>
	);
}

interface TagProps {
	label: string;
	color: 'blue' | 'emerald' | 'purple';
}

function Tag({ label, color }: TagProps): React.ReactElement {
	const styles: Record<TagProps['color'], string> = {
		blue: 'bg-blue-100 text-blue-800',
		emerald: 'bg-emerald-100 text-emerald-800',
		purple: 'bg-purple-100 text-purple-800',
	};

	return (
		<span className={`${styles[color]} text-xs font-medium px-3 py-1 rounded-full`}>{label}</span>
	);
}
