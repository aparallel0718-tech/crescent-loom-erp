const COLOR_MAP = {
  gold: { icon: 'bg-gradient-to-br from-[#E8B563] to-[#8a6a2f]', ring: 'border-[#E8B563]/25', line: '#E8B563', glow: '#E8B563' },
  blue: { icon: 'bg-gradient-to-br from-[#5AA9E6] to-[#2f4f70]', ring: 'border-[#5AA9E6]/25', line: '#5AA9E6', glow: '#8B7FF5' },
  green: { icon: 'bg-gradient-to-br from-[#3FC98A] to-[#1f5f45]', ring: 'border-[#3FC98A]/25', line: '#3FC98A', glow: '#3FC98A' },
  red: { icon: 'bg-gradient-to-br from-[#E85D6F] to-[#6f2f3a]', ring: 'border-[#E85D6F]/25', line: '#E85D6F', glow: '#E85D6F' },
};

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const w = 90;
  const h = 34;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 relative z-10">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatCard({ label, value, sub, tone, icon, color = 'gold', trend }) {
  const toneClass =
    tone === 'good' ? 'text-[#3FC98A]' : tone === 'bad' ? 'text-[#E85D6F]' : 'text-[#F2F1EE]';
  const scheme = COLOR_MAP[color] || COLOR_MAP.gold;
  return (
    <div className={`card border ${scheme.ring} flex items-center justify-between gap-3 relative overflow-hidden`}>
      <div
        className="absolute -top-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: scheme.glow, opacity: 0.3, filter: 'blur(28px)' }}
      />
      <div className="flex items-start gap-3 min-w-0 relative z-10">
        {icon && (
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] ${scheme.icon}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-glacier mb-1">{label}</p>
          <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
          {sub && <p className="text-xs text-glacier mt-1">{sub}</p>}
        </div>
      </div>
      {trend && trend.length > 1 && <Sparkline points={trend} color={scheme.line} />}
    </div>
  );
}