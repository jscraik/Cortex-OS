import { usePrismTheme } from '@docusaurus/theme-common';
import {
  containsLineNumbers,
  parseCodeBlockTitle,
  parseLanguage,
  parseLines,
  useCodeWordWrap,
} from '@docusaurus/theme-common/internal';
import Container from './CodeBlockContainer/index.js';

export default function CodeBlock({
  children,
  className: blockClassName = '',
  metastring,
  title: titleProp,
  showLineNumbers: showLineNumbersProp,
  language: languageProp,
}) {
  const {
    prismTheme,
    defaultLanguage,
  } = usePrismTheme();

  const language = languageProp ?? parseLanguage(blockClassName) ?? defaultLanguage;
  const prismLanguage = language || 'text';
  const title = parseCodeBlockTitle(metastring) || titleProp;

  const { lineClassNames, code } = parseLines(children, {
    metastring,
    language: prismLanguage,
    magicComments: [
      // Add shell integration magic comments
      {
        className: 'code-block-shell-command',
        line: 'shell-command',
      },
      {
        className: 'code-block-shell-output',
        line: 'shell-output',
      },
    ],
  });

  const showLineNumbers =
    showLineNumbersProp ?? containsLineNumbers(metastring);

  const { isEnabled: wordWrap, toggle: toggleWordWrap } = useCodeWordWrap();

  return (
    <Container
      as="div"
      className={`theme-code-block ${blockClassName}`}
      language={language}
      title={title}
      showLineNumbers={showLineNumbers}
      wordWrap={wordWrap}
      onWordWrapToggle={toggleWordWrap}>
      {/* Enhanced code display with shell integration support */}
      <div className="codeBlockContent">
        <pre
          className={`prism-code language-${prismLanguage}`}
          style={prismTheme}>
          <code>
            {lineClassNames.map((lineClassName, i) => (
              <div
                key={i}
                className={`token-line ${lineClassName || ''}`}>
                {code[i]}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </Container>
  );
}
