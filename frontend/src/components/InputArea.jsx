import { useRef, useEffect } from 'react';

export default function InputArea({ onSend, isStreaming, isConnected }) {
  const ref = useRef(null);

  const autoResize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const val = ref.current?.value.trim();
    if (!val || isStreaming || !isConnected) return;
    onSend(val);
    ref.current.value = '';
    ref.current.style.height = 'auto';
  };

  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="glass border-t border-border-col px-6 pt-4 pb-6 flex-shrink-0">
      <div className="glass-light border border-border-col rounded-2xl flex items-end p-2 focus-within:border-accent transition-colors">
        <textarea
          ref={ref}
          rows={1}
          placeholder="اسأل عن أي قانون أو تشريع كويتي..."
          onKeyDown={handleKeyDown}
          onInput={autoResize}
          className="flex-1 bg-transparent border-none outline-none text-txt-primary text-sm placeholder:text-txt-muted font-arabic resize-none px-3 py-2 max-h-36 leading-relaxed"
          style={{ minHeight: '24px' }}
        />
        <button
          onClick={submit}
          disabled={isStreaming || !isConnected}
          className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
        >
          <svg
            className="w-5 h-5 text-bg-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="text-center text-xs text-txt-muted mt-2 leading-relaxed">
        مساعد استرشادي للقوانين الكويتية — لا يُغني عن الاستشارة القانونية المتخصصة
        <br />
        التشريعات محدثة حتى 4/11/2025 — إعداد المستشار جزاء العتيبي
      </p>
    </div>
  );
}
