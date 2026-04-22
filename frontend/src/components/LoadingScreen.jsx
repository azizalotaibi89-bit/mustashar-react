export default function LoadingScreen({ visible }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{
        background: '#0a0b0f',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.8s ease',
      }}
    >
      {/* Static logo */}
      <img
        src="/emblem.png"
        alt="مستشار الدولة"
        style={{ width: '90px', animation: 'introFadeUp 0.8s ease forwards' }}
      />

      {/* Title block */}
      <div className="text-center flex flex-col gap-2"
        style={{ animation: 'introFadeUp 0.8s ease 0.2s both' }}>
        <p className="font-arabic font-bold" style={{ color: '#c8a84e', fontSize: '1.4rem', letterSpacing: '0.05em' }}>
          مستشار الدولة
        </p>
        <p className="font-arabic" style={{ color: '#7a7b8a', fontSize: '1rem', letterSpacing: '0.04em' }}>
          الامانة العامة لمجلس الوزراء
        </p>
      </div>
    </div>
  );
}
