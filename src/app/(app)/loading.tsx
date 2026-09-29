/** Esqueleto exibido imediatamente ao navegar entre áreas, enquanto os dados carregam */
export default function Carregando() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-2 h-8 w-2/3 rounded-xl bg-line/70" />
      <div className="mb-6 h-4 w-1/2 rounded-lg bg-line/50" />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
