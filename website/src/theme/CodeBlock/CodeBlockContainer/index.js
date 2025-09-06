import { translate } from '@docusaurus/Translate';
import clsx from 'clsx';
import React, { useCallback, useState } from 'react';
import styles from './styles.module.css';

function CopyButton({ code, className }) {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);

            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
        }
    }, [code]);

    return (
        <button
            type="button"
            aria-label={
                isCopied
                    ? translate({
                        id: 'theme.CodeBlock.copied',
                        message: 'Copied',
                        description: 'The copied button label on code blocks',
                    })
                    : translate({
                        id: 'theme.CodeBlock.copyButtonAriaLabel',
                        message: 'Copy code to clipboard',
                        description: 'The ARIA label for copy code blocks button',
                    })
            }
            title={translate({
                id: 'theme.CodeBlock.copy',
                message: 'Copy',
                description: 'The copy button label on code blocks',
            })}
            className={clsx(
                'clean-btn',
                className,
                styles.copyButton,
                isCopied && styles.copyButtonCopied,
            )}
            onClick={copyToClipboard}>
            <span className={styles.copyButtonIcons} aria-hidden="true">
                <svg
                    className={styles.copyButtonIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    {isCopied ? (
                        <path d="M20 6L9 17l-5-5" />
                    ) : (
                        <>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </>
                    )}
                </svg>
            </span>
            {isCopied ? (
                <span className={styles.copyButtonSuccessText}>
                    {translate({
                        id: 'theme.CodeBlock.copied',
                        message: 'Copied',
                        description: 'The copied button label on code blocks',
                    })}
                </span>
            ) : null}
        </button>
    );
}

export default function CodeBlockContainer({
    as: As = 'div',
    children,
    className,
    language,
    title,
    showLineNumbers,
    wordWrap,
    onWordWrapToggle,
}) {
    // Extract raw code text for copying
    const code = React.Children.toArray(children)
        .map(child => {
            if (typeof child === 'string') return child;
            if (child?.props?.children) {
                if (typeof child.props.children === 'string') {
                    return child.props.children;
                }
                if (Array.isArray(child.props.children)) {
                    return child.props.children
                        .map(c => (typeof c === 'string' ? c : c?.props?.children || ''))
                        .join('');
                }
            }
            return '';
        })
        .join('')
        .trim();

    return (
        <As
            className={clsx(
                'theme-code-block',
                `language-${language}`,
                className,
                showLineNumbers && 'code-block-line-numbers',
                wordWrap && 'code-block-word-wrap',
            )}>
            <div className={styles.codeBlockContainer}>
                {title && (
                    <div className={styles.codeBlockTitle}>
                        {title}
                    </div>
                )}
                <div className={styles.codeBlockContent}>
                    {children}
                    <CopyButton code={code} className={styles.codeBlockCopyButton} />
                </div>
                {onWordWrapToggle && (
                    <button
                        type="button"
                        onClick={onWordWrapToggle}
                        className={clsx('clean-btn', styles.wordWrapButton)}
                        aria-label={translate({
                            id: 'theme.CodeBlock.wordWrapToggle',
                            message: 'Toggle word wrap',
                            description: 'The title attribute for toggle word wrap button of code block lines',
                        })}>
                        <svg viewBox="0 0 24 24" className={styles.wordWrapButtonIcon}>
                            <path
                                fill="currentColor"
                                d={
                                    wordWrap
                                        ? 'M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2.25c2.3 0 4.25-2.85 4.25-5.15S19.55 11 17.25 11z'
                                        : 'M4 19h16v-2H4v2zm0-14v2h16V5H4zm0 6h16v-2H4v2zm0 4h16v-2H4v2z'
                                }
                            />
                        </svg>
                    </button>
                )}
            </div>
        </As>
    );
}
