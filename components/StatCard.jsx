export default function StatCard({ label, value, sub, tone }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-midnight';
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-glacier mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-glacier mt-1">{sub}</p>}
    </div>
  );
}
