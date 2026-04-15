import { formatMarkdown } from '../utils/markdown';

function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      <span className="w-2 h-2 rounded-full bg-accent animate-blink" />
      <span className="w-2 h-2 rounded-full bg-accent animate-blink2" />
      <span className="w-2 h-2 rounded-full bg-accent animate-blink3" />
    </div>
  );
}

export default function Message({ role, content, error, loading }) {
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
        {loading && <TypingIndicator />}
        {!loading && error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        {content && formatMarkdown(content)}
        {!loading && error && content && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
