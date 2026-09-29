"use client";

import { useState, useTransition } from "react";
import { ShoppingBasket } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { adicionarReceitaNaLista } from "@/lib/server/actions-plano";

export function AddLista({ receitaId }: { receitaId: string }) {
  const [porcoes, setPorcoes] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={porcoes} onChange={(e) => setPorcoes(Number(e.target.value))} aria-label="Porções" className="w-28">
          {[1, 2, 3, 4, 6, 8].map((n) => (
            <option key={n} value={n}>{n} porç{n > 1 ? "ões" : "ão"}</option>
          ))}
        </Select>
        <Button className="flex-1" disabled={pendente} onClick={() => start(async () => setMsg((await adicionarReceitaNaLista(receitaId, porcoes)).mensagem ?? null))}>
          <ShoppingBasket size={16} /> Adicionar à lista de compras
        </Button>
      </div>
      {msg && <p className="text-sm font-medium text-brand-strong" role="status">{msg}</p>}
    </div>
  );
}
