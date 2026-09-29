import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { Card, Empty, LinkButton, PageHeader, Segmentos, Stat } from "@/components/ui";
import { addDias } from "@/lib/nutrition/planner";
import { tendencia } from "@/lib/nutrition/review";
import { hojeSP } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { Graficos } from "./graficos";

export const metadata: Metadata = { title: "Evolução" };

export default async function Evolucao({ searchParams }: PageProps<"/evolucao">) {
  const sp = await searchParams;
  const dias = sp.periodo === "90" ? 90 : sp.periodo === "7" ? 7 : 30;
  const { supabase, user } = await requireUser();
  const desde = addDias(hojeSP(), -dias + 1);
  const [{ data: t }, { data: s }, { data: f }, { data: u }] = await Promise.all([
    supabase.from("tracking").select("*").eq("user_id", user.id).gte("data", desde).order("data"),
    supabase.from("symptoms").select("data,intensidade").eq("user_id", user.id).gte("data", desde),
    supabase.from("food_logs").select("data,seguiu_plano").eq("user_id", user.id).gte("data", desde),
    supabase.from("users").select("peso_inicial,peso_atual").eq("id", user.id).single(),
  ]);

  // série diária combinando os registros
  const serie: Record<string, Record<string, number | null>> = {};
  for (let i = 0; i < dias; i++) serie[addDias(desde, i)] = {};
  for (const r of t ?? []) Object.assign(serie[r.data] ?? (serie[r.data] = {}), { peso: r.peso && Number(r.peso), cintura: r.cintura && Number(r.cintura), quadril: r.quadril && Number(r.quadril), fome: r.fome, energia: r.energia, sono: r.sono, saciedade: r.saciedade, digestao: r.digestao, exercicio: r.exercicio_min, adesaoDia: r.adesao, agua: r.agua_ml && r.agua_ml / 1000 });
  const porDia = new Map<string, number[]>();
  for (const l of f ?? []) if (l.seguiu_plano) porDia.set(l.data, [...(porDia.get(l.data) ?? []), l.seguiu_plano === "sim" ? 100 : l.seguiu_plano === "parcial" ? 60 : 0]);
  for (const [d, xs] of porDia) if (serie[d]) serie[d].adesaoRef = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const sintPorDia = new Map<string, { n: number; max: number }>();
  for (const x of s ?? []) {
    const c = sintPorDia.get(x.data) ?? { n: 0, max: 0 };
    sintPorDia.set(x.data, { n: c.n + 1, max: Math.max(c.max, x.intensidade ?? 0) });
  }
  for (const [d, c] of sintPorDia) if (serie[d]) Object.assign(serie[d], { sintomas: c.n, intensidade: c.max });
  const dados = Object.entries(serie).map(([data, v]) => ({ data: data.slice(8, 10) + "/" + data.slice(5, 7), ...v, adesao: v.adesaoDia ?? v.adesaoRef ?? null }));

  const pesos = (t ?? []).filter((r) => r.peso).map((r) => ({ data: r.data, peso: Number(r.peso) }));
  const tend = tendencia(pesos);
  const temDados = (t?.length ?? 0) + (f?.length ?? 0) + (s?.length ?? 0) > 0;
  const media = (k: string) => {
    const xs = dados.map((d) => (d as Record<string, unknown>)[k]).filter((x): x is number => typeof x === "number");
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const fmt1 = (x: number | null, suf = "") => (x === null ? "—" : `${x.toFixed(1).replace(".", ",")}${suf}`);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Evolução"
        subtitulo="Peso é só um dos indicadores. Energia, fome, sono, sintomas e adesão contam tanto quanto."
        acao={<Segmentos ativo={String(dias)} itens={[7, 30, 90].map((p) => ({ id: String(p), rotulo: `${p} dias`, href: `/evolucao?periodo=${p}` }))} />}
      />
      {!temDados ? (
        <Empty icon={LineChart} titulo="Ainda sem registros" texto="Registre peso, medidas, fome, energia e refeições para ver sua evolução." acao={<LinkButton href="/registrar">Registrar agora</LinkButton>} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat rotulo="Peso atual" valor={u?.peso_atual ? `${Number(u.peso_atual).toString().replace(".", ",")} kg` : "—"} sub={u?.peso_inicial ? `início ${Number(u.peso_inicial).toString().replace(".", ",")} kg` : undefined} />
            <Stat rotulo="Tendência" valor={tend === undefined ? "—" : `${tend * 7 >= 0 ? "+" : ""}${(tend * 7).toFixed(2).replace(".", ",")} kg/sem`} sub="regressão linear" />
            <Stat rotulo="Adesão média" valor={media("adesao") === null ? "—" : `${Math.round(media("adesao")!)}%`} />
            <Stat rotulo="Energia média" valor={fmt1(media("energia"), "/5")} sub={`sono ${fmt1(media("sono"), "/5")}`} />
          </div>
          <Graficos dados={dados} />
          <Card className="mt-4 text-sm text-muted">
            Oscilações diárias de peso de 0,5–1 kg são comuns (água, sal, intestino). Olhe a tendência de pelo menos 2 semanas.
          </Card>
        </>
      )}
    </div>
  );
}
