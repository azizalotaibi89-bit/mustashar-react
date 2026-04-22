export default function LoadingScreen({ visible }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 transition-opacity duration-700"
      style={{
        background: '#0a0b0f',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      {/* Pulsing logo */}
      <img
        src="/emblem.png"
        alt="مستشار الدولة"
        style={{ width: '80px', animation: 'logoPulse 2s ease-in-out infinite' }}
      />

      {/* Title */}
      <div className="text-center">
        <p className="text-lg font-bold font-arabic" style={{ color: '#c8a84e' }}>
          مستشار الدولة
        </p>
        <p className="text-xs mt-1 font-arabic" style={{ color: '#6b6c7a' }}>
          الامانة العامة لمجلس الوزراء
        </p>
      </div>
    </div>
  );
}
