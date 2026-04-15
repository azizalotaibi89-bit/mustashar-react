import { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose, onSave, currentKey }) {
  const [value, setValue] = useState(currentKey || '');
  const [error, setError] = useState('');

  useEffect(() => { if (isOpen) setValue(currentKey || ''); }, [isOpen, currentKey]);

  const handleSave = () => {
    if (!value.trim()) { setError('الرجاء إدخال مفتاح API'); return; }
    onSave(value.trim());
    setError('');
    onClose();
  };

  const handleKey = (e) => { if (e.key === 'Escape') onClose(); };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKey}
    >
      <div className="bg-bg-secondary border border-border-col rounded-2xl p-8 w-[90%] max-w-sm animate-fadeUp">
        <h3 className="text-lg font-bold text-txt-primary mb-2">إعدادات مفتاح API</h3>
        <p className="text-txt-secondary text-sm mb-5 leading-loose">
          أدخل مفتاح Anthropic API الخاص بك للتواصل مع Claude. يمكنك الحصول على مفتاح من{' '}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            console.anthropic.com
          </a>
        </p>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="sk-ant-api03-..."
          dir="ltr"
          className="w-full bg-bg-primary border border-border-col text-txt-primary px-4 py-3 rounded-xl font-mono text-sm text-left focus:border-accent focus:outline-none transition-colors mb-3"
        />

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-accent hover:bg-accent-light text-bg-primary font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            حفظ
          </button>
          <button
            onClick={onClose}
            className="bg-bg-tertiary hover:bg-bg-hover border border-border-col text-txt-secondary hover:text-txt-primary text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
