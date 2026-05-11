import { useEffect, useState } from 'react';
import { formatMarkdown } from '../utils/markdown.jsx';

function TypingIndicator({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hint =
    elapsed >= 25 ? 'يعالج النصوص القانونية... لحظة' :
    elapsed >= 10 ? 'جارٍ معالجة طلبك...' :
    null;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-accent animate-blink" />
        <span className="w-2 h-2 rounded-full bg-accent animate-blink2" />
        <span className="w-2 h-2 rounded-full bg-accent animate-blink3" />
      </div>
      {hint && (
        <span className="text-txt-secondary text-xs opacity-60 transition-opacity duration-500">
          {hint}
        </span>
      )}
    </div>
  );
}

export default function Message({ role, content, error, loading, id }) {
  if (role === 'user') {
    return (
      <div className="flex justify-start mb-6 animate-fadeUp">
        <div className="bg-user-msg rounded-2xl rounded-br-sm px-5 py-3 max-w-[75%] text-sm leading-loose text-txt-primary">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start mb-6 animate-fadeUp">
      {/* Avatar */}
      <img src="/emblem.png" alt="" className="w-7 h-auto flex-shrink-0 mt-1" />

      {/* Content */}
      <div className="flex-1 text-sm text-txt-primary leading-loose">
        {loading && <TypingIndicator startTime={id || Date.now()} />}

        {!loading && error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && !content && (
          <span className="text-txt-secondary opacity-40 text-sm">—</span>
        )}

        {content && formatMarkdown(content)}
      </div>
    </div>
  );
}
