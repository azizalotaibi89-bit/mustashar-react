export default function Header() {
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

      {/* Left: Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-txt-secondary">متصل</span>
      </div>
    </header>
  );
}
