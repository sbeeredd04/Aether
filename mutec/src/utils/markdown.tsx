import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import React, { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

// Export the renderer component for direct use in React components
export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      className="markdown-body"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        pre: ({ children }) => <>{children}</>,
        code({ node, inline, className, children, ...props }: any) {
          const [isCopied, setIsCopied] = useState(false);
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          const handleCopy = () => {
            if (isCopied) return;
            navigator.clipboard.writeText(codeString).then(() => {
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            });
          };

          const customSyntaxStyle: React.CSSProperties = {
            ...atomDark['pre[class*="language-"]'],
            backgroundColor: 'transparent',
            background: 'transparent',
            padding: '0',
            margin: '0',
            overflow: 'visible',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          };

          return !inline && match ? (
            <div className="code-block-wrapper">
              <button
                onClick={handleCopy}
                className={`copy-button ${isCopied ? 'copied' : ''}`}
                title="Copy code"
              >
                {isCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
              <SyntaxHighlighter
                style={customSyntaxStyle as any}
                language={match[1]}
                PreTag="pre"
                wrapLines={true}
                wrapLongLines={true}
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        table({node, className, children, ...props}) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded" {...props}>
                {children}
              </table>
            </div>
          );
        },
        th({node, className, children, ...props}) {
          return (
            <th 
              className="bg-gray-800 px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
              {...props}
            >
              {children}
            </th>
          );
        },
        td({node, className, children, ...props}) {
          return (
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700" {...props}>
              {children}
            </td>
          );
        },
        a({node, className, children, ...props}) {
          return (
            <a 
              className="text-blue-400 hover:text-blue-300 underline" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props}
            >
              {children}
            </a>
          );
        },
        ul({node, className, children, ...props}) {
          return (
            <ul className="list-disc pl-5 space-y-1 my-2" {...props}>
              {children}
            </ul>
          );
        },
        ol({node, className, children, ...props}) {
          return (
            <ol className="list-decimal pl-5 space-y-1 my-2" {...props}>
              {children}
            </ol>
          );
        },
        blockquote({node, className, children, ...props}) {
          return (
            <blockquote 
              className="border-l-4 border-gray-500 pl-4 py-1 my-2 text-gray-300 bg-gray-800/50 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        img({node, className, ...props}) {
          return (
            <img 
              className="max-w-full h-auto rounded my-2" 
              {...props} 
              alt={props.alt || 'Image'} 
            />
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// A simple function to check if content has markdown
export const hasMarkdown = (content: string): boolean => {
  const markdownPatterns = [
    /```[\s\S]*?```/,         // Code blocks
    /\[.*?\]\(.*?\)/,         // Links
    /\*\*.+?\*\*/,            // Bold
    /\*.+?\*/,                // Italic
    /^#+\s+/m,                // Headers
    /^[-*+]\s+/m,             // Unordered lists
    /^\d+\.\s+/m,             // Ordered lists
    /^>\s+/m,                 // Blockquotes
    /!\[.*?\]\(.*?\)/,        // Images
    /\|.+\|.+\|/,             // Tables
    /^---$/m,                 // Horizontal rules
    /`[^`]+`/                 // Inline code
  ];

  return markdownPatterns.some(pattern => pattern.test(content));
}; 