const COLOR_MAP = {
  purple: 'bg-purple-100 text-purple-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
};

export default function StatCard({ label, value, sub, tone, icon, color = 'purple' }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-midnight';
  const iconClass = COLOR_MAP[color] || COLOR_MAP.purple;
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
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