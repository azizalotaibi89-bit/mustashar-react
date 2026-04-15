export default function Header({ isConnected, onOpenSettings }) {
  return (
    <header className="glass border-b border-border-col px-6 py-4 flex items-center justify-between flex-shrink-0">
      {/* Right: Logo + Title */}
      <div className="flex items-center gap-3">
        <img src="/emblem.png" alt="شعار الكويت" className="w-11 h-auto" />
        <div>
          <h1 className="text-lg font-bold text-txt-primary leading-snug">مستشار الدولة</h1>
          <span className="text-xs text-txt-muted">التشريعات والقوانين الكويتية</span>
        </div>
      </div>

      {/* Left: Status + Settings */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-txt-secondary">{isConnected ? 'متصل' : 'غير متصل'}</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="bg-bg-tertiary border border-border-col text-txt-secondary text-sm px-3 py-2 rounded-lg hover:bg-bg-hover hover:text-txt-primary transition-colors"
        >
          الإعدادات
        </button>
      </div>
    </header>
  );
}
