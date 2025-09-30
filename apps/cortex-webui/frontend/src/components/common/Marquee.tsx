'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

interface MarqueeProps {
	words?: string[];
	duration?: number;
	className?: string;
}

const Marquee: React.FC<MarqueeProps> = ({
	words = ['lorem', 'ipsum'],
	duration = 4000,
	className = '',
}) => {
	const [idx, setIdx] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIdx((prevIdx) => (prevIdx + 1) % words.length);
		}, duration);

		return () => clearInterval(interval);
	}, [words.length, duration]);

	return (
		<div className={className}>
			<div>
				<div
					key={idx}
					className="marquee-item"
					style={{
						animation: 'flyIn 1s ease-out forwards',
					}}
				>
					{words[idx]}
				</div>
			</div>

			<style>{`
        @keyframes flyIn {
          from {
            opacity: 0;
            transform: translateY(30%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
		</div>
	);
};

export default Marquee;
