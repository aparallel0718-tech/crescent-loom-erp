const COLOR_MAP = {
  gold: { icon: 'bg-[#3a2f1a] text-[#E8B563]', ring: 'border-[#E8B563]/25' },
  blue: { icon: 'bg-[#1a2733] text-[#5AA9E6]', ring: 'border-[#5AA9E6]/25' },
  green: { icon: 'bg-[#123023] text-[#3FC98A]', ring: 'border-[#3FC98A]/25' },
  red: { icon: 'bg-[#331a1f] text-[#E85D6F]', ring: 'border-[#E85D6F]/25' },
};

export default function StatCard({ label, value, sub, tone, icon, color = 'gold' }) {
  const toneClass =
    tone === 'good' ? 'text-[#3FC98A]' : tone === 'bad' ? 'text-[#E85D6F]' : 'text-[#F2F1EE]';
  const scheme = COLOR_MAP[color] || COLOR_MAP.gold;
  return (
    <div className={`card border ${scheme.ring}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${scheme.icon}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-glacier mb-1">{label}</p>
          <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
          {sub && <p className="text-xs text-glacier mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}