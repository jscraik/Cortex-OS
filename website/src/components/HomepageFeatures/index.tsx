import Heading from '@theme/Heading';
import clsx from 'clsx';
import type React from 'react';
import styles from './styles.module.css';

type FeatureItem = {
	title: string;
	Svg: React.ComponentType<React.ComponentProps<'svg'>>;
	description: React.JSX.Element;
};

const FeatureList: FeatureItem[] = [
	{
		title: 'Multi-Modal AI Orchestration',
		Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
		description: (
			<>
				Cortex-OS orchestrates multiple AI models and modalities seamlessly, providing a unified
				interface for complex AI workflows.
			</>
		),
	},
	{
		title: 'Enterprise-Grade Security',
		Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
		description: (
			<>
				Built with security-first principles, including comprehensive audit trails, secure memory
				management, and compliance frameworks.
			</>
		),
	},
	{
		title: 'Agent-Driven Architecture',
		Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
		description: (
			<>
				Leverages autonomous agents for intelligent task orchestration, with built-in memory systems
				and event-driven communication.
			</>
		),
	},
];

function Feature({ title, Svg, description }: FeatureItem) {
	return (
		<div className={clsx('col col--4')}>
			<div className="text--center">
				<Svg className={styles.featureImage} role="img" />
			</div>
			<div className="text--center padding-horiz--md">
				<Heading as="h3">{title}</Heading>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures(): React.JSX.Element {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props) => (
						<Feature key={props.title} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
