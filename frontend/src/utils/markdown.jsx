/**
 * Converts a markdown string to React elements.
 */
export function formatMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  let i = 0;

  const parseInline = (str) => {
    const parts = [];
    let remaining = str;
    let pk = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*(.+?)\*/);
      const codeMatch = remaining.match(/`(.+?)`/);

      const candidates = [boldMatch, italicMatch, codeMatch]
        .filter(Boolean)
        .sort((a, b) => a.index - b.index);

      if (!candidates.length) {
        parts.push(<span key={pk++}>{remaining}</span>);
        break;
      }

      const first = candidates[0];
      if (first.index > 0) {
        parts.push(<span key={pk++}>{remaining.slice(0, first.index)}</span>);
      }

      if (first === boldMatch) {
        parts.push(<strong key={pk++} className="text-accent-light font-semibold">{first[1]}</strong>);
      } else if (first === italicMatch) {
        parts.push(<em key={pk++}>{first[1]}</em>);
      } else {
        parts.push(
          <code key={pk++} className="bg-bg-tertiary px-1 py-0.5 rounded text-sm font-mono">
            {first[1]}
          </code>
        );
      }

      remaining = remaining.slice(first.index + first[0].length);
    }
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) { i++; continue; }

    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        const m = l.match(/^\d+\.\s+(.+)$/);
        if (!m) break;
        items.push(<li key={i} className="mb-1">{parseInline(m[1])}</li>);
        i++;
      }
      elements.push(<ol key={key++} className="list-decimal pr-5 mb-3 space-y-1">{items}</ol>);
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        const m = l.match(/^[-•]\s+(.+)$/);
        if (!m) break;
        items.push(<li key={i} className="mb-1">{parseInline(m[1])}</li>);
        i++;
      }
      elements.push(<ul key={key++} className="list-disc pr-5 mb-3 space-y-1">{items}</ul>);
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-r-4 border-accent pr-4 py-2 my-3 bg-bg-secondary rounded-l-lg text-txt-secondary">
          {quoteLines.map((l, idx) => <p key={idx}>{parseInline(l)}</p>)}
        </blockquote>
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1
        ? 'text-xl font-bold text-accent mb-2'
        : level === 2
        ? 'text-lg font-bold text-accent-light mb-2'
        : 'text-base font-semibold text-txt-primary mb-1';
      elements.push(<p key={key++} className={cls}>{parseInline(headingMatch[2])}</p>);
      i++;
      continue;
    }

    // Regular paragraph — accumulate consecutive non-special lines
    const paraLines = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l || l.match(/^\d+\./) || l.match(/^[-•]/) || l.startsWith('>') || l.match(/^#{1,3}/)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length) {
      elements.push(
        <p key={key++} className="mb-3 leading-loose">
          {paraLines.map((l, idx) => (
            <span key={idx}>{parseInline(l)}{idx < paraLines.length - 1 && <br />}</span>
          ))}
        </p>
      );
    }
  }

  return elements;
}
