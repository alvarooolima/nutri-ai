"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { adicionarAgua, registrarDia } from "@/lib/server/actions-registro";
import { cx } from "@/components/ui";

// Reconhecer em vez de lembrar: cada nível tem um nome escrito, não só um emoji
const ITENS = [
  { k: "energia", nome: "Energia", emojis: ["😴", "🥱", "🙂", "😊", "⚡"], rotulos: ["Muito baixa", "Baixa", "Ok", "Boa", "Ótima"] },
  { k: "fome", nome: "Fome", emojis: ["😌", "🙂", "😐", "😋", "🤤"], rotulos: ["Sem fome", "Pouca", "Moderada", "Bastante", "Muita"] },
  { k: "sono", nome: "Sono", emojis: ["😫", "😕", "😐", "🙂", "😴"], rotulos: ["Péssimo", "Ruim", "Regular", "Bom", "Ótimo"] },
] as const;

const META_AGUA = 2000;

export function CheckIn({ inicial }: { inicial: { energia: number | null; fome: number | null; sono: number | null; agua: number } }) {
  const [v, setV] = useState(inicial);
  const [, start] = useTransition();
  const marcar = (k: "energia" | "fome" | "sono", n: number) => {
    setV((x) => ({ ...x, [k]: n }));
    start(async () => {
      await registrarDia({ [k]: n });
    });
  };
  const agua = (ml: number) => {
    setV((x) => ({ ...x, agua: Math.max(0, x.agua + ml) }));
    start(async () => {
      await adicionarAgua(ml);
    });
  };
  const copos = Math.round(v.agua / 250);

  return (
    <section aria-labelledby="checkin" className="space-y-3">
      <div>
        <h2 id="checkin" className="text-lg font-bold tracking-tight">Como você está</h2>
        <p className="text-[13px] text-muted">Um toque por linha — o plano não depende só do peso.</p>
      </div>
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface px-3 sm:px-4">
        {ITENS.map(({ k, nome, emojis, rotulos }) => (
          <div key={k} className="flex items-center gap-2 py-2.5">
            <div className="w-[72px] shrink-0">
              <p className="text-sm font-semibold">{nome}</p>
              <p className={cx("text-xs", v[k] ? "font-medium text-brand-strong" : "text-muted")} aria-live="polite">
                {v[k] ? rotulos[v[k]! - 1] : "—"}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 justify-between gap-0.5" role="radiogroup" aria-label={nome}>
              {emojis.map((e, i) => (
                <button
                  key={i}
                  role="radio"
                  aria-checked={v[k] === i + 1}
                  aria-label={`${nome}: ${rotulos[i]}`}
                  title={rotulos[i]}
                  onClick={() => marcar(k, i + 1)}
                  className={cx("flex size-10 items-center justify-center rounded-xl text-lg transition", v[k] === i + 1 ? "bg-brand-soft ring-2 ring-brand" : "opacity-80 hover:bg-surface-2 hover:opacity-100")}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        {/* água como mais uma linha do mesmo cartão (menos blocos, menos rolagem) */}
        <div className="flex items-center gap-2 py-2.5">
          <div className="w-[72px] shrink-0">
            <p className="text-sm font-semibold">Água</p>
            <p className="tabular text-xs text-muted">{copos} {copos === 1 ? "copo" : "copos"}</p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="tabular text-sm font-bold">
                {(v.agua / 1000).toFixed(2).replace(".", ",")} L <span className="font-normal text-muted">/ 2 L</span>
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (v.agua / META_AGUA) * 100)}%` }} />
              </div>
            </div>
            <button onClick={() => agua(-250)} disabled={v.agua <= 0} aria-label="Remover um copo" className="flex size-10 items-center justify-center rounded-full border border-line text-ink disabled:opacity-40">
              <Minus size={16} />
            </button>
            <button onClick={() => agua(250)} aria-label="Adicionar um copo de 250 ml" className="flex size-10 items-center justify-center rounded-full bg-brand text-white">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
