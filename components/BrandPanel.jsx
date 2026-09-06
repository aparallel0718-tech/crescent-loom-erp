export default function BrandPanel() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 p-6 flex flex-col justify-between min-h-[260px]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(11,11,12,0.55), rgba(11,11,12,0.85)), url('/images/texture-panel.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <p className="text-[10px] tracking-[0.25em] uppercase text-gold">Crescent Loom</p>
      <div>
        <p className="text-2xl font-serif italic text-[#F2F1EE] leading-snug">
          Built for what's next.
        </p>
      </div>
    </div>
  );
}