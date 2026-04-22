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
      {/* Spinning logo */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: '110px',
            height: '110px',
            background: 'conic-gradient(from 0deg, transparent 60%, #c8a84e 100%)',
            animation: 'logoSpin 1.4s linear infinite',
          }}
        />
        {/* Inner dark circle to mask ring center */}
        <div
          className="absolute rounded-full"
          style={{ width: '90px', height: '90px', background: '#0a0b0f' }}
        />
        {/* Logo */}
        <img
          src="/emblem.png"
          alt="مستشار الدولة"
          style={{ width: '64px', position: 'relative', zIndex: 1 }}
        />
      </div>

      {/* Title */}
      <div className="text-center" style={{ animation: 'fadeUp 0.6s ease forwards' }}>
        <p className="text-lg font-bold font-arabic" style={{ color: '#c8a84e' }}>
          مستشار الدولة
        </p>
        <p className="text-xs mt-1 font-arabic" style={{ color: '#6b6c7a' }}>
          التشريعات والقوانين الكويتية
        </p>
      </div>
    </div>
  );
}
