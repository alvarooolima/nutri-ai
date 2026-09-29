import { redirect } from "next/navigation";
import { BookOpen, HeartPulse, LineChart, ShieldCheck, ShoppingBasket, Sparkles, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const RECURSOS = [
  { icon: Sparkles, titulo: "Plano personalizado", texto: "Combina objetivo, rotina, preferências, cultura alimentar e orçamento — sem obrigar café da manhã ou lanche." },
  { icon: ShieldCheck, titulo: "Segurança em primeiro lugar", texto: "Considera condições de saúde e medicamentos como contexto e avisa quando algo precisa de avaliação profissional." },
  { icon: BookOpen, titulo: "Explica o porquê", texto: "Cada recomendação mostra justificativa, fonte científica e limitações. Estimativa é tratada como estimativa." },
  { icon: ShoppingBasket, titulo: "Receitas e compras", texto: "Lista semanal por categoria, com quantidades somadas e custo estimado, além de roteiro de preparo." },
  { icon: Wallet, titulo: "Cabe no bolso", texto: "Informe seu orçamento e peça “reduzir custo” quando quiser." },
  { icon: LineChart, titulo: "Acompanhamento real", texto: "Peso é só um dos indicadores: fome, energia, sono, sintomas e adesão guiam os ajustes." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/inicio");

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="grid items-center gap-8 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
            <HeartPulse size={14} /> Baseado em evidências, feito para a vida real
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Um plano alimentar que cabe na sua rotina.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            O NUTRI.AI conhece você antes de montar o plano: seus horários, gostos, restrições, saúde e orçamento. Depois acompanha, explica e ajusta — sem terrorismo nutricional.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/cadastro" className="px-6">Criar meu plano</LinkButton>
            <LinkButton href="/login" variante="secundario">Já tenho conta</LinkButton>
          </div>
        </div>
        <div className="rounded-[2rem] border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Almoço · 12:30</p>
          <p className="mt-1 text-lg font-bold">Teishoku de salmão</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[["Arroz branco", "5 colheres de sopa"], ["Salmão grelhado", "1 posta média"], ["Missoshiru com tofu e wakame", "1 tigela"], ["Espinafre com gergelim", "2 colheres"]].map(([a, b]) => (
              <li key={a} className="flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                <span>{a}</span>
                <span className="text-muted">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {["Trocar alimento", "Mais barato", "Vou comer fora", "Estou com mais fome"].map((c) => (
              <span key={c} className="rounded-full border border-line px-2.5 py-1 font-medium text-muted">{c}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="rounded-3xl border border-line bg-surface p-5">
            <Icon className="text-brand" size={22} />
            <h2 className="mt-3 font-bold">{titulo}</h2>
            <p className="mt-1 text-sm text-muted">{texto}</p>
          </div>
        ))}
      </section>
      <section className="mt-10 rounded-3xl bg-accent-soft p-6">
        <p className="text-sm font-semibold text-accent">Projeto especial de outubro</p>
        <h2 className="mt-1 text-2xl font-bold">Desafio 31 dias — Alimentação Japonesa</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/80">
          Arroz, peixes, tofu, legumes, algas e sopas adaptados à realidade brasileira, com atenção a sódio e molhos, lista de compras semanal, preparação antecipada e custo estimado.
        </p>
      </section>
    </main>
  );
}
