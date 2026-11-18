/**
 * Pure parsing utilities for Admin BI Copilot Tactile Markdown.
 * Zero-dependency, safe from XSS, and strictly enforces no em dash (U+2014).
 */

export interface MarkdownTableParsed {
  headers: string[];
  rows: string[][];
}

export type InlineMarkdownToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string };

/**
 * Replaces any em dash (U+2014) with a hyphen (-).
 */
export function sanitizeEmDash(text: string): string {
  return (text || '').replace(/\u2014/g, '-');
}

/**
 * Tokenizes inline formatting (**bold** and `code`).
 */
export function tokenizeInlineMarkdown(text: string): InlineMarkdownToken[] {
  const clean = sanitizeEmDash(text);
  const parts = clean.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return { type: 'bold', value: part.slice(2, -2) };
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return { type: 'code', value: part.slice(1, -1) };
      }
      return { type: 'text', value: part };
    });
}

/**
 * Parses markdown table lines into headers and rows.
 */
export function parseMarkdownTable(lines: string[]): MarkdownTableParsed | null {
  if (lines.length < 2) return null;

  const headerLine = lines[0].trim();
  const sepLine = lines[1].trim();

  if (!headerLine.startsWith('|') || !sepLine.startsWith('|')) return null;
  // Ensure line 2 is separator row
  if (!/^\|(?:\s*:?-+:?\s*\|)+$/.test(sepLine)) return null;

  const extractCells = (line: string) => {
    const raw = line.trim();
    const inner = raw.replace(/^\|/, '').replace(/\|$/, '');
    return inner.split('|').map((c) => c.trim());
  };

  const headers = extractCells(headerLine);
  const rows: string[][] = [];

  for (let i = 2; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    rows.push(extractCells(l));
  }

  return { headers, rows };
}
