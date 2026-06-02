import { DIMENSION_FIELDS, DIMENSION_META, DIMENSION_ORDER } from "@/lib/seller-types";

export default function DimensoesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="text-xs font-medium uppercase tracking-wider muted">Cobertura do operador</div>
      <h1 className="h-display mt-1 text-2xl">8 dimensões</h1>
      <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
        Cada objetivo define um subconjunto dessas dimensões como suas variáveis de otimização. Aqui
        está o que cada uma cobre — e os campos típicos que o seller fornece.
      </p>

      <div className="mt-8 space-y-6">
        {DIMENSION_ORDER.map((key) => {
          const meta = DIMENSION_META[key];
          const fields = DIMENSION_FIELDS[key];
          return (
            <section key={key} className="surface px-6 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">{meta.label}</h2>
                <span className="muted text-xs">{meta.tagline}</span>
              </div>
              <p className="muted mt-1 text-sm leading-relaxed">{meta.description}</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.key} className="surface-muted px-3 py-2">
                    <div className="text-xs font-medium">{f.label}</div>
                    <div className="muted text-[11px]">{f.type === "textarea" ? "contexto livre" : f.type}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
