'use client';

import Modal from '@/components/common/Modal';
import Spinner from '@/components/common/Spinner';
import Switch from '@/components/common/Switch';
import Tooltip from '@/components/common/Tooltip';
import React, { useEffect, useState } from 'react';

interface FileItem {
  id: string;
  name: string;
  size?: number;
  type?: string;
  created_at?: number;
  url?: string;
  meta?: {
    content_type?: string;
  };
  file?: {
    data?: {
      content?: string;
    };
  };
  knowledge?: boolean;
  description?: string;
  context?: string;
}

interface FileItemModalProps {
  item: FileItem;
  show: boolean;
  edit?: boolean;
  onClose?: () => void;
}

const FileItemModal: React.FC<FileItemModalProps> = ({ item, show, edit = false, onClose }) => {
  const [enableFullContent, setEnableFullContent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('');

  useEffect(() => {
    if (item?.context === 'full') {
      setEnableFullContent(true);
    }
  }, [item]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLineCount = (content?: string): number => {
    if (!content) return 0;
    return content.split('\n').length;
  };

  const isPDF =
    item?.meta?.content_type === 'application/pdf' ||
    (item?.name && item.name.toLowerCase().endsWith('.pdf'));

  const isAudio =
    (item?.meta?.content_type ?? '').startsWith('audio/') ||
    (item?.name && item.name.toLowerCase().endsWith('.mp3')) ||
    (item?.name && item.name.toLowerCase().endsWith('.wav')) ||
    (item?.name && item.name.toLowerCase().endsWith('.ogg')) ||
    (item?.name && item.name.toLowerCase().endsWith('.m4a')) ||
    (item?.name && item.name.toLowerCase().endsWith('.webm'));

  const handleOpenFile = () => {
    if (!isPDF && item?.url) {
      window.open(item.type === 'file' ? `${item.url}/content` : `${item.url}`, '_blank');
    }
  };

  return (
    <Modal show={show} size="lg" onClose={onClose}>
      <div className="font-primary px-6 py-5 w-full flex flex-col justify-center dark:text-gray-400">
        <div className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-lg dark:text-gray-100">
                <button onClick={handleOpenFile} className="hover:underline line-clamp-1 text-left">
                  {item?.name ?? 'File'}
                </button>
              </div>
            </div>

            <div>
              <button onClick={onClose}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-col items-center md:flex-row gap-1 justify-between w-full">
              <div className="flex flex-wrap text-xs gap-1 text-gray-500">
                {item?.type === 'collection' && (
                  <>
                    {item?.type && (
                      <>
                        <div className="capitalize shrink-0">{item.type}</div>
                        <div>•</div>
                      </>
                    )}

                    {item?.description && (
                      <>
                        <div className="line-clamp-1">{item.description}</div>
                        <div>•</div>
                      </>
                    )}

                    {item?.created_at && (
                      <div className="capitalize shrink-0">
                        {new Date(item.created_at * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </>
                )}

                {item.size && (
                  <>
                    <div className="capitalize shrink-0">{formatFileSize(item.size)}</div>
                    <div>•</div>
                  </>
                )}

                {item?.file?.data?.content && (
                  <>
                    <div className="capitalize shrink-0">
                      {getLineCount(item?.file?.data?.content ?? '')} extracted lines
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div>•</div> Formatting may be inconsistent from source.
                    </div>
                  </>
                )}

                {item?.knowledge && <div className="capitalize shrink-0">Knowledge Base</div>}
              </div>

              {edit && (
                <div>
                  <Tooltip
                    content={
                      enableFullContent
                        ? 'Inject the entire content as context for comprehensive processing, this is recommended for complex queries.'
                        : 'Default to segmented retrieval for focused and relevant content extraction, this is recommended for most cases.'
                    }
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      {enableFullContent ? 'Using Entire Document' : 'Using Focused Retrieval'}
                      <Switch
                        state={enableFullContent}
                        onChange={(state) => {
                          setEnableFullContent(state);
                          // In a real implementation, you would update the item context here
                        }}
                      />
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              {item?.type === 'collection' && item?.files && (
                <div>
                  {item.files.map((file: any) => (
                    <div key={file.id} className="flex items-center gap-2 mb-2">
                      <div className="flex-shrink-0 text-xs">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                        </svg>
                      </div>
                      <div className="text-sm truncate">{file.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {item?.type === 'file' && item?.file?.data?.content && (
                <div className="mt-4">
                  <div className="text-sm whitespace-pre-wrap">{item.file.data.content}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default FileItemModal;
