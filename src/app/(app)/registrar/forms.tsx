"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Chips } from "@/components/perfil/steps";
import { AlertBox, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";
import { excluirRegistro, registrarDia, registrarRefeicao } from "@/lib/server/actions-registro";

const REFS = ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia", "Beliscou"].map((x) => ({ id: x, nome: x }));

function Escala5({ valor, onChange, rotulo }: { valor: number | null; onChange: (n: number) => void; rotulo: string }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label={rotulo}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-pressed={valor === n} onClick={() => onChange(n)} className={cx("size-10 rounded-xl border text-sm font-bold", valor === n ? "border-brand bg-brand text-white" : "border-line bg-surface")}>
          {n}
        </button>
      ))}
    </div>
  );
}

export function FormRefeicao({ planejadas }: { planejadas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [ok, setOk] = useState<string | null>(null);
  const [v, setV] = useState({ refeicao: "", descricao: "", seguiu_plano: "" as "" | "sim" | "parcial" | "nao", fome_antes: null as number | null, saciedade_depois: null as number | null });

  const salvar = () =>
    start(async () => {
      await registrarRefeicao({ refeicao: v.refeicao || undefined, descricao: v.descricao || undefined, seguiu_plano: v.seguiu_plano || undefined, fome_antes: v.fome_antes, saciedade_depois: v.saciedade_depois });
      setOk("Refeição registrada.");
      setV({ refeicao: "", descricao: "", seguiu_plano: "", fome_antes: null, saciedade_depois: null });
      router.refresh();
    });

  return (
    <Card className="space-y-4">
      <h2 className="font-bold">Refeição</h2>
      {planejadas.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Comi o que estava no plano:</p>
          <div className="flex flex-wrap gap-2">
            {planejadas.map((p) => (
              <Button
                key={p.id}
                variante="suave"
                className="min-h-10 text-sm"
                disabled={pendente}
                onClick={() => start(async () => { await registrarRefeicao({ mealId: p.id, refeicao: p.nome, seguiu_plano: "sim" }); setOk(`${p.nome} registrado.`); router.refresh(); })}
              >
                ✓ {p.nome}
              </Button>
            ))}
          </div>
        </div>
      )}
      <Field label="Qual refeição?">
        <Chips opcoes={REFS} valor={v.refeicao ? [v.refeicao] : []} onChange={(x) => setV({ ...v, refeicao: x[0] ?? "" })} multiplo={false} />
      </Field>
      <Field label="O que você comeu?">
        <Textarea rows={2} value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} placeholder="ex.: arroz, feijão, frango e salada" />
      </Field>
      <Field label="Em relação ao plano">
        <Chips opcoes={[{ id: "sim", nome: "Segui" }, { id: "parcial", nome: "Em parte" }, { id: "nao", nome: "Comi outra coisa" }]} valor={v.seguiu_plano ? [v.seguiu_plano] : []} onChange={(x) => setV({ ...v, seguiu_plano: (x[0] ?? "") as typeof v.seguiu_plano })} multiplo={false} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fome antes (1–5)">
          <Escala5 rotulo="Fome antes" valor={v.fome_antes} onChange={(n) => setV({ ...v, fome_antes: n })} />
        </Field>
        <Field label="Saciedade depois (1–5)">
          <Escala5 rotulo="Saciedade depois" valor={v.saciedade_depois} onChange={(n) => setV({ ...v, saciedade_depois: n })} />
        </Field>
      </div>
      {ok && <p className="text-sm font-medium text-brand-strong" role="status">{ok}</p>}
      <Button onClick={salvar} disabled={pendente || (!v.descricao && !v.refeicao)} className="w-full">
        Registrar refeição
      </Button>
    </Card>
  );
}

type Track = Partial<Record<"peso" | "cintura" | "quadril" | "horas_sono" | "adesao" | "exercicio_min" | "agua_ml" | "fome" | "saciedade" | "energia" | "sono" | "digestao", number | null>>;

export function FormDia({ inicial }: { inicial: Track }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const s = (x: number | null | undefined) => (x === null || x === undefined ? "" : String(x));
  const [v, setV] = useState({
    peso: s(inicial.peso), cintura: s(inicial.cintura), quadril: s(inicial.quadril), horas_sono: s(inicial.horas_sono), adesao: s(inicial.adesao), exercicio_min: s(inicial.exercicio_min),
    energia: inicial.energia ?? null, fome: inicial.fome ?? null, saciedade: inicial.saciedade ?? null, sono: inicial.sono ?? null, digestao: inicial.digestao ?? null,
  });
  const n = (x: string) => (x.trim() ? Number(x.replace(",", ".")) : null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  return (
    <Card className="space-y-4">
      <h2 className="font-bold">Como foi o dia</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Peso (kg)"><Input inputMode="decimal" value={v.peso} onChange={set("peso")} /></Field>
        <Field label="Cintura (cm)"><Input inputMode="decimal" value={v.cintura} onChange={set("cintura")} /></Field>
        <Field label="Quadril (cm)"><Input inputMode="decimal" value={v.quadril} onChange={set("quadril")} /></Field>
        <Field label="Horas de sono"><Input inputMode="decimal" value={v.horas_sono} onChange={set("horas_sono")} /></Field>
        <Field label="Exercício (min)"><Input inputMode="numeric" value={v.exercicio_min} onChange={set("exercicio_min")} /></Field>
        <Field label="Adesão ao plano (%)"><Input inputMode="numeric" value={v.adesao} onChange={set("adesao")} placeholder="0–100" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {([["energia", "Energia"], ["fome", "Fome"], ["saciedade", "Saciedade"], ["sono", "Qualidade do sono"], ["digestao", "Digestão"]] as const).map(([k, t]) => (
          <Field key={k} label={`${t} (1–5)`}>
            <Escala5 rotulo={t} valor={v[k]} onChange={(x) => setV({ ...v, [k]: x })} />
          </Field>
        ))}
      </div>
      {erro && <AlertBox gravidade="importante">{erro}</AlertBox>}
      {ok && <p className="text-sm font-medium text-brand-strong" role="status">Dia registrado.</p>}
      <Button
        className="w-full"
        disabled={pendente}
        onClick={() =>
          start(async () => {
            setErro(null);
            try {
              const r = await registrarDia({ peso: n(v.peso), cintura: n(v.cintura), quadril: n(v.quadril), horas_sono: n(v.horas_sono), adesao: n(v.adesao), exercicio_min: n(v.exercicio_min), energia: v.energia, fome: v.fome, saciedade: v.saciedade, sono: v.sono, digestao: v.digestao });
              if (!r.ok) setErro(r.erro ?? "Erro");
              else setOk(true);
              router.refresh();
            } catch {
              setErro("Confira os valores informados.");
            }
          })
        }
      >
        Salvar dia
      </Button>
    </Card>
  );
}

export function RegistroItem({ id, tabela, titulo, texto }: { id: string; tabela: "food_logs" | "symptoms"; titulo: string; texto: string }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-muted">{texto}</p>
      </div>
      <button onClick={() => start(async () => { await excluirRegistro(tabela, id); router.refresh(); })} disabled={pendente} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger" aria-label="Excluir registro">
        <Trash2 size={16} />
      </button>
    </li>
  );
}
