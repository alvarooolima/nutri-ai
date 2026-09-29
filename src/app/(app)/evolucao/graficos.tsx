"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";

type Ponto = Record<string, string | number | null | undefined>;

const COR = { brand: "#2f6b4f", accent: "#c9683d", info: "#2b5a86", warn: "#9a6a12", danger: "#a63d2c" };

function Grafico({ titulo, dados, series, dominio, barras, unidade }: { titulo: string; dados: Ponto[]; series: { k: string; nome: string; cor: string }[]; dominio?: [number | string, number | string]; barras?: boolean; unidade?: string }) {
  const temDados = dados.some((d) => series.some((s) => typeof d[s.k] === "number"));
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{titulo}</h2>
        {series.length > 1 && (
          <div className="flex gap-3 text-xs text-muted">
            {series.map((s) => (
              <span key={s.k} className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-full" style={{ background: s.cor }} />
                {s.nome}
              </span>
            ))}
          </div>
        )}
      </div>
      {!temDados ? (
        <p className="py-8 text-center text-sm text-muted">Sem registros no período.</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {barras ? (
              <BarChart data={dados} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e5e1d6" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#5b6961" }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: "#5b6961" }} tickLine={false} axisLine={false} domain={dominio} allowDecimals={false} />
                <Tooltip formatter={(v) => `${v}${unidade ?? ""}`} contentStyle={{ borderRadius: 12, borderColor: "#e5e1d6", fontSize: 12 }} />
                {series.map((s) => (
                  <Bar key={s.k} dataKey={s.k} name={s.nome} fill={s.cor} radius={[6, 6, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={dados} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e5e1d6" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#5b6961" }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: "#5b6961" }} tickLine={false} axisLine={false} domain={dominio ?? ["auto", "auto"]} />
                <Tooltip formatter={(v) => `${v}${unidade ?? ""}`} contentStyle={{ borderRadius: 12, borderColor: "#e5e1d6", fontSize: 12 }} />
                {series.map((s) => (
                  <Line key={s.k} type="monotone" dataKey={s.k} name={s.nome} stroke={s.cor} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function Graficos({ dados }: { dados: Ponto[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Grafico titulo="Peso (kg)" dados={dados} series={[{ k: "peso", nome: "Peso", cor: COR.brand }]} unidade=" kg" />
      <Grafico titulo="Medidas (cm)" dados={dados} series={[{ k: "cintura", nome: "Cintura", cor: COR.accent }, { k: "quadril", nome: "Quadril", cor: COR.info }]} unidade=" cm" />
      <Grafico titulo="Adesão ao plano (%)" dados={dados} series={[{ k: "adesao", nome: "Adesão", cor: COR.brand }]} dominio={[0, 100]} barras unidade="%" />
      <Grafico titulo="Fome e energia (1–5)" dados={dados} series={[{ k: "fome", nome: "Fome", cor: COR.accent }, { k: "energia", nome: "Energia", cor: COR.brand }]} dominio={[1, 5]} />
      <Grafico titulo="Sono (qualidade 1–5)" dados={dados} series={[{ k: "sono", nome: "Sono", cor: COR.info }]} dominio={[1, 5]} />
      <Grafico titulo="Sintomas (intensidade máx. do dia)" dados={dados} series={[{ k: "intensidade", nome: "Intensidade", cor: COR.danger }]} dominio={[0, 10]} barras />
      <Grafico titulo="Atividade física (min)" dados={dados} series={[{ k: "exercicio", nome: "Exercício", cor: COR.warn }]} barras unidade=" min" />
      <Grafico titulo="Água (L)" dados={dados} series={[{ k: "agua", nome: "Água", cor: COR.info }]} barras unidade=" L" />
    </div>
  );
}
