import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { marked } from 'marked';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Tag from '@/components/icons/Tag';
import { WEBUI_BASE_URL } from '@/lib/constants';
import { copyToClipboard, sanitizeResponseContent } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';
import ModelItemMenu from './ModelItemMenu';

dayjs.extend(relativeTime);

interface ModelItemProps {
	selectedModelIdx: number;
	item: any;
	index: number;
	value: string;
	unloadModelHandler: (modelValue: string) => void;
	pinModelHandler: (modelId: string) => void;
	onClick: () => void;
}

const ModelItem: React.FC<ModelItemProps> = ({
	selectedModelIdx,
	item,
	index,
	value,
	unloadModelHandler,
	pinModelHandler,
	onClick,
}) => {
	const [showMenu, setShowMenu] = useState(false);
	const settings = useSettingsStore();
	const user = useUserStore();
	const itemRef = useRef<HTMLButtonElement>(null);

	const copyLinkHandler = async (model: any) => {
		const baseUrl = window.location.origin;
		const res = await copyToClipboard(
			`${baseUrl}/?model=${encodeURIComponent(model.id)}`,
		);

		if (res) {
			toast.success('Copied link to clipboard');
		} else {
			toast.error('Failed to copy link');
		}
	};

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	return (
		<button
			ref={itemRef}
			aria-roledescription="model-item"
			aria-label={item.label}
			className={`flex group/item w-full text-left font-medium line-clamp-1 select-none items-center rounded-button py-2 pl-3 pr-1.5 text-sm text-gray-700 dark:text-gray-100 outline-hidden transition-all duration-75 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer data-highlighted:bg-muted ${
				index === selectedModelIdx
					? 'bg-gray-100 dark:bg-gray-800 group-hover:bg-transparent'
					: ''
			}`}
			data-arrow-selected={index === selectedModelIdx}
			data-value={item.value}
			onClick={onClick}
		>
			<div className="flex flex-col flex-1 gap-1.5">
				<div className="flex items-center gap-2">
					<div className="flex items-center min-w-fit">
						<div
							className="relative"
							title={user?.role === 'admin' ? (item?.value ?? '') : ''}
						>
							<Image
								src={
									item.model?.info?.meta?.profile_image_url ??
									`${WEBUI_BASE_URL}/static/favicon.png`
								}
								alt="Model"
								width={20}
								height={20}
								className="rounded-full flex items-center"
							/>
						</div>
					</div>

					<div className="flex items-center">
						<div
							className="line-clamp-1"
							title={`${item.label} (${item.value})`}
						>
							{item.label}
						</div>
					</div>

					<div className="shrink-0 flex items-center gap-2">
						{item.model.owned_by === 'ollama' && (
							<>
								{item.model.ollama?.details?.parameter_size && (
									<div className="flex items-center translate-y-[0.5px]">
										<div
											className="self-end"
											title={`${
												item.model.ollama?.details?.quantization_level
													? item.model.ollama?.details?.quantization_level + ' '
													: ''
											}${
												item.model.ollama?.size
													? `(${(item.model.ollama?.size / 1024 ** 3).toFixed(1)}GB)`
													: ''
											}`}
										>
											<span className="text-xs font-medium text-gray-600 dark:text-gray-400 line-clamp-1">
												{item.model.ollama?.details?.parameter_size ?? ''}
											</span>
										</div>
									</div>
								)}
								{item.model.ollama?.expires_at &&
									new Date(item.model.ollama?.expires_at * 1000) >
										new Date() && (
										<div className="flex items-center translate-y-[0.5px] px-0.5">
											<div
												className="self-end"
												title={`Unloads ${dayjs(item.model.ollama?.expires_at * 1000).fromNow()}`}
											>
												<div className="flex items-center">
													<span className="relative flex size-2">
														<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
														<span className="relative inline-flex rounded-full size-2 bg-green-500" />
													</span>
												</div>
											</div>
										</div>
									)}
							</>
						)}

						{(item?.model?.tags ?? []).length > 0 && (
							<div className="translate-y-[1px]">
								<Tag />
							</div>
						)}

						{item.model?.direct ? (
							<div className="translate-y-[1px]" title="Direct">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="size-3"
								>
									<path
										fillRule="evenodd"
										d="M2 2.75A.75.75 0 0 1 2.75 2C8.963 2 14 7.037 14 13.25a.75.75 0 0 1-1.5 0c0-5.385-4.365-9.75-9.75-9.75A.75.75 0 0 1 2 2.75Zm0 4.5a.75.75 0 0 1 .75-.75 6.75 6.75 0 0 1 6.75 6.75.75.75 0 0 1-1.5 0C8 10.35 5.65 8 2.75 8A.75.75 0 0 1 2 7.25ZM3.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						) : item.model.connection_type === 'external' ? (
							<div className="translate-y-[1px]" title="External">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="size-3"
								>
									<path
										fillRule="evenodd"
										d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z"
										clipRule="evenodd"
									/>
									<path
										fillRule="evenodd"
										d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						) : null}

						{item.model?.info?.meta?.description && (
							<div
								className="translate-y-[1px]"
								title={`${marked.parse(
									sanitizeResponseContent(
										item.model?.info?.meta?.description,
									).replaceAll('\n', '<br>'),
								)}`}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="w-4 h-4"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
									/>
								</svg>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="ml-auto pl-2 pr-1 flex items-center gap-1.5 shrink-0">
				{user?.role === 'admin' &&
					item.model.owned_by === 'ollama' &&
					item.model.ollama?.expires_at &&
					new Date(item.model.ollama?.expires_at * 1000) > new Date() && (
						<button
							className="flex group-hover/item:opacity-100 opacity-0"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								unloadModelHandler(item.value);
							}}
							title="Eject"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								className="size-3"
							>
								<path d="M10.75 2.75a.75.75 0 0 0-1.5 0v6.5h-6.5a.75.75 0 0 0 0 1.5h6.5v6.5a.75.75 0 0 0 1.5 0v-6.5h6.5a.75.75 0 0 0 0-1.5h-6.5v-6.5Z" />
							</svg>
						</button>
					)}

				<ModelItemMenu
					show={showMenu}
					setShow={setShowMenu}
					model={item.model}
					pinModelHandler={pinModelHandler}
					copyLinkHandler={() => copyLinkHandler(item.model)}
				>
					<button
						aria-label="More Options"
						className="flex"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setShowMenu(!showMenu);
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-4"
						>
							<path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
						</svg>
					</button>
				</ModelItemMenu>

				{value === item.value && (
					<div>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-3"
						>
							<path
								fillRule="evenodd"
								d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
				)}
			</div>
		</button>
	);
};

export default ModelItem;
