type InstrumentCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

export default function InstrumentCard({
  title,
  value,
  subtitle,
}: InstrumentCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
      <p className="text-sm text-slate-400">{title}</p>

      <h2 className="mt-3 text-3xl font-semibold text-white">
        {value}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}