'use client';

import { WEBUI_BASE_URL } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settingsStore';
import DOMPurify from 'dompurify';
import { Token } from 'marked';
import React, { useMemo } from 'react';
import Source from './Source';

interface HTMLTokenProps {
  id: string;
  token: Token;
  onSourceClick?: (id: string, data: string) => void;
}

const HTMLToken: React.FC<HTMLTokenProps> = ({ id, token, onSourceClick }) => {
  const settings = useSettingsStore();

  const sanitizedHtml = useMemo(() => {
    if (token.type === 'html' && token.text) {
      return DOMPurify.sanitize(token.text);
    }
    return null;
  }, [token]);

  if (token.type !== 'html') return null;

  if (sanitizedHtml && sanitizedHtml.includes('<video')) {
    const videoMatch = sanitizedHtml.match(/<video[^>]*>([\s\S]*?)<\/video>/);
    const videoSrc = videoMatch && videoMatch[1];

    if (videoSrc) {
      return (
        <video
          className="w-full my-2"
          src={videoSrc.replaceAll('&amp;', '&')}
          title="Video player"
          // @ts-ignore
          frameborder="0"
          referrerPolicy="strict-origin-when-cross-origin"
          controls
          allowFullScreen
        />
      );
    } else {
      return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml || '' }} />;
    }
  } else if (sanitizedHtml && sanitizedHtml.includes('<audio')) {
    const audioMatch = sanitizedHtml.match(/<audio[^>]*>([\s\S]*?)<\/audio>/);
    const audioSrc = audioMatch && audioMatch[1];

    if (audioSrc) {
      return (
        <audio
          className="w-full my-2"
          src={audioSrc.replaceAll('&amp;', '&')}
          title="Audio player"
          controls
        />
      );
    } else {
      return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml || '' }} />;
    }
  } else if (
    token.text &&
    /<iframe\s+[^>]*src="https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?[^"]*)?"[^>]*><\/iframe>/.test(
      token.text,
    )
  ) {
    const match = token.text.match(
      /<iframe\s+[^>]*src="https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?[^"]*)?"[^>]*><\/iframe>/,
    );
    const ytId = match && match[1];

    if (ytId) {
      return (
        <iframe
          className="w-full aspect-video my-2"
          src={`https://www.youtube.com/embed/${ytId}`}
          title="YouTube video player"
          // @ts-ignore
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      );
    }
  } else if (token.text && token.text.includes('<iframe')) {
    const match = token.text.match(/<iframe\s+[^>]*src="([^"]+)"[^>]*><\/iframe>/);
    const iframeSrc = match && match[1];

    if (iframeSrc) {
      return (
        <iframe
          className="w-full my-2"
          src={iframeSrc}
          title="Embedded content"
          // @ts-ignore
          frameborder="0"
          sandbox=""
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            try {
              // @ts-ignore
              iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 20 + 'px';
            } catch (err) {
              // Cross-origin restriction, can't access height
            }
          }}
        />
      );
    } else {
      return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml || '' }} />;
    }
  } else if (token.text && token.text.includes('<status')) {
    const match = token.text.match(/<status title="([^"]+)" done="(true|false)" ?\/?>/);
    const statusTitle = match && match[1];
    const statusDone = match && match[2] === 'true';

    if (statusTitle) {
      return (
        <div className="flex flex-col justify-center -space-y-0.5">
          <div
            className={`${statusDone === false ? 'shimmer' : ''} text-gray-500 dark:text-gray-500 line-clamp-1 text-wrap`}
          >
            {statusTitle}
          </div>
        </div>
      );
    } else {
      return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml || '' }} />;
    }
  } else if (token.text && token.text.includes(`<file type="html"`)) {
    const match = token.text.match(/<file type="html" id="([^"]+)"/);
    const fileId = match && match[1];

    if (fileId) {
      const sandboxOptions = [
        'allow-scripts',
        'allow-downloads',
        ...(settings?.iframeSandboxAllowForms ? ['allow-forms'] : []),
        ...(settings?.iframeSandboxAllowSameOrigin ? ['allow-same-origin'] : []),
      ].join(' ');

      return (
        <iframe
          className="w-full my-2"
          src={`${WEBUI_BASE_URL}/api/v1/files/${fileId}/content/html`}
          title="Content"
          // @ts-ignore
          frameborder="0"
          sandbox={sandboxOptions}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          width="100%"
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            try {
              // @ts-ignore
              iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 20 + 'px';
            } catch (err) {
              // Cross-origin restriction, can't access height
            }
          }}
        />
      );
    }
  } else if (token.text && token.text.includes(`<source_id`)) {
    return <Source id={id} token={token} onClick={onSourceClick} />;
  } else {
    const brMatch = token.text && token.text.match(/<br\s*\/?>/);

    if (brMatch) {
      return <br />;
    } else {
      return <div dangerouslySetInnerHTML={{ __html: token.text || '' }} />;
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: token.text || '' }} />;
};

export default HTMLToken;
