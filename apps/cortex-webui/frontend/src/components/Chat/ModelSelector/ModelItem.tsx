import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState, type ReactNode } from 'react';
// Removed toast dependency (sonner) to avoid missing module types; using console fallback instead.
import Tag from '@/components/icons/Tag';
import { copyToClipboard } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import ModelItemMenu from './ModelItemMenu';

dayjs.extend(relativeTime);

// Minimal shape for model metadata used in this component.
interface ModelInfoMeta {
  profile_image_url?: string;
  description?: string;
}

interface ModelInfo {
  meta?: ModelInfoMeta;
}

interface OllamaDetails {
  parameter_size?: string;
  quantization_level?: string;
}

export type BasicModelMeta = {
  id?: string;
  info?: ModelInfo;
  owned_by?: string;
  ollama?: {
    details?: OllamaDetails;
    size?: number;
    expires_at?: number; // epoch seconds
  };
  connection_type?: 'external' | 'internal';
  direct?: boolean;
  tags?: string[];
};

export interface ModelItemProps {
  readonly selectedModelIdx: number; // currently unused but retained for API compatibility
  readonly item: { label: string; value: string; model: BasicModelMeta };
  readonly index: number; // currently unused
  readonly value: string; // currently selected value
  readonly unloadModelHandler: (modelValue: string) => void;
  readonly pinModelHandler: (modelId: string) => void;
  readonly onClick: () => void;
}

function ModelItem({
  selectedModelIdx: _selectedModelIdx,
  item,
  index: _index,
  value,
  unloadModelHandler,
  pinModelHandler,
  onClick,
}: Readonly<ModelItemProps>) {
  const [showMenu, setShowMenu] = useState(false);
  const user = useUserStore() as { role?: string } | undefined;
  const isAdmin = user?.role === 'admin';

  // Ownership / source icon (decorative)
  function renderOwnershipIcon(): ReactNode {
    if (item.model?.direct) {
      return (
        <span className="translate-y-[1px] inline-flex items-center" aria-hidden="true">
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
        </span>
      );
    }
    if (item.model.connection_type === 'external') {
      return (
        <span className="translate-y-[1px] inline-flex items-center" aria-hidden="true">
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
        </span>
      );
    }
    return null;
  }

  const copyLinkHandler = async (): Promise<void> => {
    const baseUrl = window.location.origin;
    const modelId = item.model.id ?? item.value;
    const res = await copyToClipboard(
      `${baseUrl}/?model=${encodeURIComponent(modelId)}`,
    );
    if (res) {
      // eslint-disable-next-line no-console
      console.log('Copied link to clipboard');
    } else {
      // eslint-disable-next-line no-console
      console.warn('Failed to copy link');
    }
  };

  const selected = value === item.value;
  const buttonClassBase = 'group/item w-full flex items-center px-2 py-1.5 text-left rounded-md border transition-colors';
  const buttonClass = selected
    ? `${buttonClassBase} bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700`
    : `${buttonClassBase} border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={buttonClass}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Avatar / image placeholder */}
        <div className="flex items-center justify-center size-7 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
          {item.model?.info?.meta?.profile_image_url ? (
            <img
              src={item.model.info.meta.profile_image_url}
              alt="model avatar"
              className="object-cover size-7"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
              {item.label.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.label}
          </span>
          {item.model?.info?.meta?.description && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {item.model.info.meta.description}
            </span>
          )}
        </div>

        {/* Tags icon */}
        {(item.model?.tags?.length ?? 0) > 0 && (
          <span className="translate-y-[1px] inline-flex items-center" title="Has tags">
            <Tag aria-hidden="true" />
          </span>
        )}

  {renderOwnershipIcon()}

        {/* Parameter size + expiry (only for direct + ollama) */}
        {item.model?.direct && item.model.ollama?.details?.parameter_size && (
          <div className="translate-y-[0.5px]">
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
              {item.model.ollama.details.parameter_size}
            </span>
          </div>
        )}
        {item.model?.direct &&
          item.model.ollama?.expires_at &&
          new Date(item.model.ollama.expires_at * 1000) > new Date() && (
            <div className="flex items-center translate-y-[0.5px] px-0.5" aria-hidden="true">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-green-500" />
              </span>
            </div>
          )}
      </div>

      <div className="ml-auto pl-2 pr-1 flex items-center gap-1.5 shrink-0">
        {isAdmin &&
          item.model.owned_by === 'ollama' &&
          item.model.ollama?.expires_at &&
          new Date(item.model.ollama.expires_at * 1000) > new Date() && (
            <button
              type="button"
              className="flex group-hover/item:opacity-100 opacity-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                unloadModelHandler(item.value);
              }}
              title="Eject"
              aria-label="Eject model"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-3"
                aria-hidden="true"
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
          copyLinkHandler={copyLinkHandler}
        >
          <button
            type="button"
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
              aria-hidden="true"
            >
              <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
            </svg>
          </button>
        </ModelItemMenu>

        {selected && (
          <span className="inline-flex items-center" aria-hidden="true">
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
          </span>
        )}
      </div>
    </button>
  );
}

export default ModelItem;
