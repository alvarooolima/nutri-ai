"use client";

import { useState, useTransition } from "react";
import { Droplets, Minus, Plus } from "lucide-react";
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
        <h2 id="checkin" className="text-lg font-bold tracking-tight">Check-in rápido</h2>
        <p className="text-[13px] text-muted">Um toque por linha. Ajuda a ajustar o plano sem depender só do peso.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0 divide-y divide-line/70 rounded-3xl border border-line/80 bg-surface px-3 shadow-card sm:px-4">
          {ITENS.map(({ k, nome, emojis, rotulos }) => (
            <div key={k} className="flex items-center gap-3 py-3">
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
                    className={cx("flex size-10 items-center justify-center rounded-2xl text-xl transition sm:size-11", v[k] === i + 1 ? "bg-brand-soft ring-2 ring-brand" : "hover:bg-surface-2")}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-3xl bg-info-soft p-4 sm:flex-col sm:justify-center sm:text-center">
          <Droplets className="shrink-0 text-info" size={26} aria-hidden />
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="tabular text-xl font-bold text-info">{(v.agua / 1000).toFixed(2).replace(".", ",")} L</p>
            <p className="text-xs text-info/80">{copos} {copos === 1 ? "copo" : "copos"} de 250 ml</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-info/15 sm:w-32">
              <div className="h-full rounded-full bg-info" style={{ width: `${Math.min(100, (v.agua / META_AGUA) * 100)}%` }} />
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => agua(-250)} disabled={v.agua <= 0} aria-label="Remover um copo" className="flex size-11 items-center justify-center rounded-full bg-surface text-info shadow-card disabled:opacity-40">
              <Minus size={18} />
            </button>
            <button onClick={() => agua(250)} aria-label="Adicionar um copo" className="flex size-11 items-center justify-center rounded-full bg-info text-white shadow-card">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
