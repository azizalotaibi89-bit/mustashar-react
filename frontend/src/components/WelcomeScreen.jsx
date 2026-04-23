export default function WelcomeScreen() {
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
      <p className="text-txt-secondary text-sm max-w-md leading-loose">
        مساعدك القانوني الذكي للتشريعات والقوانين الكويتية. اسألني عن أي مادة قانونية أو حكم تشريعي وسأجاوبك بالتفصيل.
      </p>
    </div>
  );
}
