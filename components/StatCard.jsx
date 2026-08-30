export default function StatCard({ label, value, sub, tone, icon }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-midnight';
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-midnight shrink-0">
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