const SUGGESTIONS = [
  'ما هي شروط الترشح لعضوية مجلس الأمة؟',
  'ما هي حقوق المتهم في الدستور الكويتي؟',
  'ما هي صلاحيات الأمير في الدستور؟',
  'ما هو نص المادة 29 من الدستور؟',
];

export default function WelcomeScreen({ onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-5 py-10">
      {/* Logo block */}
      <div className="flex flex-col items-center mb-7">
        <img
          src="/emblem.png"
          alt="شعار الكويت"
          className="w-36 h-auto mb-4 drop-shadow-[0_4px_24px_rgba(200,168,78,0.3)]"
        />
        <p className="text-accent text-xl font-bold mb-1">مجلس الوزراء</p>
        <p className="text-txt-secondary text-sm">Council of Ministers</p>
        <p className="text-txt-muted text-xs">State of Kuwait | دولة الكويت</p>
      </div>

      <h2 className="text-2xl font-bold text-txt-primary mb-3">مستشار الدولة</h2>
      <p className="text-txt-secondary text-sm max-w-md leading-loose mb-8">
        مساعدك القانوني الذكي للتشريعات والقوانين الكويتية. اسألني عن أي مادة قانونية أو حكم تشريعي وسأجاوبك بالتفصيل.
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s)}
            className="glass-light border border-border-col rounded-xl px-4 py-3 text-right text-txt-secondary text-sm leading-relaxed hover:border-accent hover:text-txt-primary transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
