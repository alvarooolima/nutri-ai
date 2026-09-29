"use client";

import { useState, useTransition } from "react";
import { Droplets } from "lucide-react";
import { adicionarAgua, registrarDia } from "@/lib/server/actions-registro";
import { cx } from "@/components/ui";

const ITENS = [
  { k: "energia", nome: "Energia", emojis: ["😴", "🥱", "🙂", "😊", "⚡"] },
  { k: "fome", nome: "Fome", emojis: ["🙂", "😌", "😐", "😋", "🤤"] },
  { k: "sono", nome: "Sono", emojis: ["😫", "😕", "😐", "🙂", "😴"] },
] as const;

export function CheckIn({ inicial }: { inicial: { energia: number | null; fome: number | null; sono: number | null; agua: number } }) {
  const [v, setV] = useState(inicial);
  const [, start] = useTransition();
  const marcar = (k: "energia" | "fome" | "sono", n: number) => {
    setV({ ...v, [k]: n });
    start(async () => {
      await registrarDia({ [k]: n });
    });
  };
  return (
    <div className="mt-4 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[1fr_auto]">
      <div className="space-y-2">
        {ITENS.map(({ k, nome, emojis }) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-16 text-sm font-semibold">{nome}</span>
            <div className="flex gap-1" role="group" aria-label={nome}>
              {emojis.map((e, i) => (
                <button
                  key={i}
                  onClick={() => marcar(k, i + 1)}
                  aria-label={`${nome} ${i + 1} de 5`}
                  aria-pressed={v[k] === i + 1}
                  className={cx("flex size-10 items-center justify-center rounded-xl text-lg transition", v[k] === i + 1 ? "bg-brand-soft ring-2 ring-brand" : "hover:bg-surface-2")}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-info-soft px-4 py-3 sm:flex-col sm:justify-center">
        <Droplets className="text-info" />
        <p className="tabular text-sm font-bold text-info">{(v.agua / 1000).toFixed(2).replace(".", ",")} L</p>
        <button
          onClick={() => start(async () => setV({ ...v, agua: await adicionarAgua(250) }))}
          className="ml-auto rounded-full bg-info px-3 py-1.5 text-xs font-bold text-white sm:ml-0"
        >
          + 1 copo
        </button>
      </div>
    </div>
  );
}
