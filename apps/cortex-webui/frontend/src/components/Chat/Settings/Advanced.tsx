'use client';

import { useEffect, useId, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

// =========================
// Types
// =========================
type AdvancedSettingsShape = {
	enableCommunitySharing: boolean;
	hideSuggestedPrompts: boolean;
	playgroundEnabled: boolean;
	archiveChats: boolean;
	featureFlags: {
		audio: boolean;
		webSearch: boolean;
		images: boolean;
		codeExecution: boolean;
	};
};

interface AdvancedSettingsProps {
	saveSettings: (settings: AdvancedSettingsShape) => void;
}

type PartialAdvancedSettings = Partial<AdvancedSettingsShape> & {
	featureFlags?: Partial<AdvancedSettingsShape['featureFlags']>;
};

// =========================
// Helpers
// =========================
function extractAdvancedSettings(
	adv: PartialAdvancedSettings | undefined,
): AdvancedSettingsShape {
	return {
		enableCommunitySharing: adv?.enableCommunitySharing ?? false,
		hideSuggestedPrompts: adv?.hideSuggestedPrompts ?? false,
		playgroundEnabled: adv?.playgroundEnabled ?? false,
		archiveChats: adv?.archiveChats ?? false,
		featureFlags: {
			audio: adv?.featureFlags?.audio ?? false,
			webSearch: adv?.featureFlags?.webSearch ?? false,
			images: adv?.featureFlags?.images ?? false,
			codeExecution: adv?.featureFlags?.codeExecution ?? false,
		},
	};
}

// =========================
// Presentational Building Blocks
// =========================
interface SettingsSwitchProps {
	checked: boolean;
	onToggle: () => void;
	ariaLabel: string;
}

function SettingsSwitch({
	checked,
	onToggle,
	ariaLabel,
}: Readonly<SettingsSwitchProps>) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
			onClick={onToggle}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
				checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
			}`}
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
					checked ? 'translate-x-6' : 'translate-x-1'
				}`}
			/>
		</button>
	);
}

interface ToggleRowProps {
	label: string;
	description: string;
	checked: boolean;
	onToggle: () => void;
	ariaLabel?: string;
}

function ToggleRow({
	label,
	description,
	checked,
	onToggle,
	ariaLabel,
}: Readonly<ToggleRowProps>) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<div className="font-medium">{label}</div>
				<div className="text-xs text-gray-500 mt-0.5">{description}</div>
			</div>
			<SettingsSwitch
				checked={checked}
				onToggle={onToggle}
				ariaLabel={ariaLabel ?? label}
			/>
		</div>
	);
}

interface SectionProps {
	title: string;
	children: React.ReactNode;
}

function Section({ title, children }: Readonly<SectionProps>) {
	return (
		<div>
			<div className="text-base font-medium mb-2">{title}</div>
			{children}
		</div>
	);
}

// =========================
// Specific Sections
// =========================
interface BasicToggleSectionProps {
	settings: AdvancedSettingsShape;
	onToggle: (key: keyof Omit<AdvancedSettingsShape, 'featureFlags'>) => void;
}

function CommunitySharingSection({
	settings,
	onToggle,
}: Readonly<BasicToggleSectionProps>) {
	return (
		<Section title="Community Sharing">
			<ToggleRow
				label="Enable Community Sharing"
				description="Allow sharing of your prompts and templates with the community"
				checked={settings.enableCommunitySharing}
				onToggle={() => onToggle('enableCommunitySharing')}
				ariaLabel="Enable Community Sharing"
			/>
		</Section>
	);
}

function InterfaceSection({
	settings,
	onToggle,
}: Readonly<BasicToggleSectionProps>) {
	return (
		<Section title="Interface">
			<ToggleRow
				label="Hide Suggested Prompts"
				description="Hide suggested prompts in the chat input"
				checked={settings.hideSuggestedPrompts}
				onToggle={() => onToggle('hideSuggestedPrompts')}
			/>
		</Section>
	);
}

function PlaygroundSection({
	settings,
	onToggle,
}: Readonly<BasicToggleSectionProps>) {
	return (
		<Section title="Playground">
			<ToggleRow
				label="Enable Playground"
				description="Enable the playground for testing models and prompts"
				checked={settings.playgroundEnabled}
				onToggle={() => onToggle('playgroundEnabled')}
			/>
		</Section>
	);
}

function ChatsSection({
	settings,
	onToggle,
}: Readonly<BasicToggleSectionProps>) {
	return (
		<Section title="Chats">
			<ToggleRow
				label="Archive Chats"
				description="Automatically archive old chats to save space"
				checked={settings.archiveChats}
				onToggle={() => onToggle('archiveChats')}
			/>
		</Section>
	);
}

interface FeatureFlagsSectionProps {
	flags: AdvancedSettingsShape['featureFlags'];
	onToggleFlag: (flag: keyof AdvancedSettingsShape['featureFlags']) => void;
}

const featureFlagMetadata: Array<{
	key: keyof AdvancedSettingsShape['featureFlags'];
	label: string;
	description: string;
}> = [
	{
		key: 'audio',
		label: 'Audio',
		description: 'Enable audio features like voice input and output',
	},
	{
		key: 'webSearch',
		label: 'Web Search',
		description: 'Enable web search capabilities in chats',
	},
	{
		key: 'images',
		label: 'Images',
		description: 'Enable image processing and generation features',
	},
	{
		key: 'codeExecution',
		label: 'Code Execution',
		description: 'Enable code execution in chats',
	},
];

function FeatureFlagsSection({
	flags,
	onToggleFlag,
}: Readonly<FeatureFlagsSectionProps>) {
	return (
		<Section title="Feature Flags">
			<div className="space-y-3">
				{featureFlagMetadata.map(({ key, label, description }) => (
					<ToggleRow
						key={key}
						label={label}
						description={description}
						checked={flags[key]}
						onToggle={() => onToggleFlag(key)}
					/>
				))}
			</div>
		</Section>
	);
}

// =========================
// Container Component
// =========================
function AdvancedSettings({
	saveSettings,
}: Readonly<AdvancedSettingsProps>): React.ReactElement {
	const settings = useSettingsStore();
	const [loaded, setLoaded] = useState(false);
	const [advancedState, setAdvancedState] = useState<AdvancedSettingsShape>({
		enableCommunitySharing: false,
		hideSuggestedPrompts: false,
		playgroundEnabled: false,
		archiveChats: false,
		featureFlags: {
			audio: false,
			webSearch: false,
			images: false,
			codeExecution: false,
		},
	});

	useEffect(() => {
		setAdvancedState(extractAdvancedSettings(settings?.advanced));
		setLoaded(true);
	}, [settings]);

	const toggleFeatureFlag = (
		flag: keyof AdvancedSettingsShape['featureFlags'],
	) => {
		setAdvancedState((prev) => ({
			...prev,
			featureFlags: { ...prev.featureFlags, [flag]: !prev.featureFlags[flag] },
		}));
	};

	const handleToggle = (
		key: keyof Omit<AdvancedSettingsShape, 'featureFlags'>,
	) => {
		setAdvancedState((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const handleSubmit = () => {
		saveSettings(advancedState);
	};

	const id = useId();

	if (!loaded) {
		return <output aria-live="polite">Loading...</output>;
	}

	return (
		<section
			id={id}
			className="flex flex-col h-full justify-between text-sm"
			aria-label="Advanced Settings"
		>
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-4">
				<CommunitySharingSection
					settings={advancedState}
					onToggle={handleToggle}
				/>
				<InterfaceSection settings={advancedState} onToggle={handleToggle} />
				<PlaygroundSection settings={advancedState} onToggle={handleToggle} />
				<ChatsSection settings={advancedState} onToggle={handleToggle} />
				<FeatureFlagsSection
					flags={advancedState.featureFlags}
					onToggleFlag={toggleFeatureFlag}
				/>
			</div>
			<div className="mt-4 flex justify-end">
				<button
					type="button"
					onClick={handleSubmit}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Save Changes
				</button>
			</div>
		</section>
	);
}

export { AdvancedSettings };
