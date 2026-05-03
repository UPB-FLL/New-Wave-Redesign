export default function WaveBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 5, top: 0, left: 0, right: 0, bottom: 0 }}>
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        style={{
          opacity: 0.08,
        }}
      >
        {/* Multiple wave layers for depth */}
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#39CCCC', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#5EBC67', stopOpacity: 0.3 }} />
          </linearGradient>
        </defs>

        {/* Bottom wave layer */}
        <path
          d="M0,400 Q360,350 720,400 T1440,400 L1440,800 L0,800 Z"
          fill="url(#waveGradient)"
        />

        {/* Middle wave layer - offset */}
        <path
          d="M0,450 Q360,400 720,450 T1440,450 L1440,800 L0,800 Z"
          fill="#39CCCC"
          opacity="0.05"
        />

        {/* Top accent wave - subtle */}
        <path
          d="M0,350 Q360,300 720,350 T1440,350 L1440,450 L0,450 Z"
          fill="#5EBC67"
          opacity="0.04"
        />

        {/* Flowing wave animation curves */}
        <path
          d="M0,420 Q180,380 360,420 T720,420 T1080,420 T1440,420 L1440,800 L0,800 Z"
          fill="#39CCCC"
          opacity="0.06"
        />
      </svg>
    </div>
  );
}
