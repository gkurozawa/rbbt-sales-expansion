type Props = { value: number };

export function ScoreBadge({ value }: Props) {
  const tier =
    value >= 75 ? { label: "Alto fit", bg: "bg-emerald-600" }
    : value >= 55 ? { label: "Bom fit", bg: "bg-lime-600" }
    : value >= 35 ? { label: "Médio", bg: "bg-amber-500" }
    : { label: "Baixo fit", bg: "bg-rose-600" };

  return (
    <div className={`inline-flex items-baseline gap-3 rounded-2xl px-5 py-3 text-white ${tier.bg}`}>
      <span className="text-4xl font-bold leading-none">{value}</span>
      <span className="text-sm opacity-90">/100 · {tier.label}</span>
    </div>
  );
}
