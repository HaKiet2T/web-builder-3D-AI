import React from 'react';
import {
  tokenizeInlineMarkdown,
  parseMarkdownTable,
  sanitizeEmDash,
} from '@/lib/admin/copilot-markdown';

interface TactileMarkdownProps {
  content: string;
  className?: string;
}

export function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = tokenizeInlineMarkdown(text);
  return tokens.map((token, index) => {
    if (token.type === 'bold') {
      return (
        <strong key={`b-${index}`} className="admin-copilot-bold">
          {token.value}
        </strong>
      );
    }
    if (token.type === 'code') {
      return (
        <code key={`c-${index}`} className="admin-copilot-code">
          {token.value}
        </code>
      );
    }
    return token.value;
  });
}

export function TactileMarkdown({ content, className = '' }: TactileMarkdownProps) {
  const sanitized = sanitizeEmDash(content || '');
  const lines = sanitized.split(/\r?\n/);

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Table Detection
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        elements.push(
          <div key={`table-${i}`} className="admin-copilot-table-wrap">
            <table className="admin-copilot-table">
              <thead>
                <tr>
                  {table.headers.map((h, hIdx) => (
                    <th key={`th-${hIdx}`}>{renderInlineMarkdown(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, rIdx) => (
                  <tr key={`tr-${rIdx}`}>
                    {r.map((c, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`}>{renderInlineMarkdown(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // 2. Headings (### or ##)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      if (level <= 2) {
        elements.push(
          <h2 key={`h2-${i}`} className="admin-copilot-h2">
            {renderInlineMarkdown(text)}
          </h2>,
        );
      } else {
        elements.push(
          <h3 key={`h3-${i}`} className="admin-copilot-h3">
            {renderInlineMarkdown(text)}
          </h3>,
        );
      }
      i++;
      continue;
    }

    // 3. Unordered Lists (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="admin-copilot-list">
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`} className="admin-copilot-list-item">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // 4. Regular Paragraphs
    elements.push(
      <p key={`p-${i}`} className="admin-copilot-p">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
    i++;
  }

  return <div className={`admin-copilot-markdown ${className}`}>{elements}</div>;
}
