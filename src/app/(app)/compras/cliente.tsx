"use client";

import { useOptimistic, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Select, cx } from "@/components/ui";
import { brl } from "@/lib/nutrition/foodmath";
import type { ItemCompra } from "@/lib/nutrition/shopping";
import { gerarListaCompras, limparComprados, marcarItemCompra } from "@/lib/server/actions-plano";

const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export function GerarLista({ semanas }: { semanas: { de: string; ate: string }[] }) {
  const [sel, setSel] = useState(0);
  const [pendente, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={sel} onChange={(e) => setSel(Number(e.target.value))} className="w-auto flex-1" aria-label="Semana">
        {semanas.map((s, i) => (
          <option key={s.de} value={i}>Semana {fmt(s.de)} a {fmt(s.ate)}</option>
        ))}
      </Select>
      <Button variante="suave" disabled={pendente} onClick={() => start(async () => { await gerarListaCompras(semanas[sel].de, semanas[sel].ate); })}>
        <RefreshCw size={16} className={pendente ? "animate-spin" : ""} /> Gerar/atualizar lista
      </Button>
    </div>
  );
}

export function ItemLista({ listaId, item }: { listaId: string; item: ItemCompra }) {
  const [comprado, setComprado] = useOptimistic(item.comprado);
  const [, start] = useTransition();
  return (
    <li>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 px-5 py-2.5">
        <input
          type="checkbox"
          checked={comprado}
          onChange={(e) => start(async () => { setComprado(e.target.checked); await marcarItemCompra(listaId, item.food_id, e.target.checked); })}
          className="size-5 shrink-0 accent-[var(--brand)]"
        />
        <span className={cx("flex-1 text-sm", comprado && "text-muted line-through")}>
          <span className="font-medium">{item.nome}</span>
          <span className="block text-xs text-muted">{item.quantidade_texto}</span>
        </span>
        <span className="tabular text-xs text-muted">{brl(item.custo)}</span>
      </label>
    </li>
  );
}

export function LimparComprados({ listaId }: { listaId: string }) {
  const [pendente, start] = useTransition();
  return (
    <Button variante="secundario" disabled={pendente} onClick={() => start(() => limparComprados(listaId))}>
      Remover itens comprados
    </Button>
  );
}
