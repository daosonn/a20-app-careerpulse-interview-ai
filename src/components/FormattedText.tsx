import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders AI-generated text with proper formatting:
 * - **bold** → <strong>
 * - *italic* → <em>
 * - Numbered lists (1. 2. 3.) → proper <ol>
 * - Bullet lists (• - *) → proper <ul>
 * - Line breaks → proper paragraphs
 */
export function FormattedText({ text, className = '' }: FormattedTextProps) {
  if (!text) return null;

  const renderInlineFormatting = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match **bold** and *italic* patterns
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = regex.exec(line)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // **bold**
        parts.push(<strong key={keyIdx++} className="font-bold">{match[1]}</strong>);
      } else if (match[2]) {
        // *italic*
        parts.push(<em key={keyIdx++}>{match[2]}</em>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
  };

  // Split into lines, group into blocks
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ol' | 'ul'; items: React.ReactNode[][] } | null = null;
  let blockKey = 0;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ol') {
        blocks.push(
          <ol key={blockKey++} className="list-decimal list-outside ml-5 space-y-1.5">
            {currentList.items.map((item, i) => (
              <li key={i} className="leading-relaxed">{item}</li>
            ))}
          </ol>
        );
      } else {
        blocks.push(
          <ul key={blockKey++} className="list-disc list-outside ml-5 space-y-1.5">
            {currentList.items.map((item, i) => (
              <li key={i} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        );
      }
      currentList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue; // Skip empty lines (they become paragraph breaks)
    }

    // Numbered list: "1. text" or "1) text"
    const numberedMatch = line.match(/^\d+[\.\)]\s+(.+)/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInlineFormatting(numberedMatch[1]));
      continue;
    }

    // Bullet list: "- text", "• text", "* text" (but not **bold**)
    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    const starBulletMatch = !line.startsWith('**') ? line.match(/^\*\s+(.+)/) : null;
    if (bulletMatch || starBulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInlineFormatting((bulletMatch || starBulletMatch)![1]));
      continue;
    }

    // Regular paragraph
    flushList();
    blocks.push(
      <p key={blockKey++} className="leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-3 ${className}`}>{blocks}</div>;
}
