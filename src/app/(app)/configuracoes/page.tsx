import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import { Consentimento, ExcluirConta } from "./cliente";
import { SairButton } from "../mais/sair";

export const metadata: Metadata = { title: "Configurações" };

export default async function Configuracoes() {
  const { supabase, user } = await requireUser();
  const { data: cons } = await supabase.from("consents").select("tipo,versao,aceito_em,revogado_em").eq("user_id", user.id).order("aceito_em", { ascending: false });
  const saudeAtivo = (cons ?? []).some((c) => c.tipo === "dados_saude" && !c.revogado_em);
  const fmt = (x: string) => new Date(x).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader titulo="Configurações" subtitulo={user.email} />
      <Card className="space-y-2">
        <h2 className="font-bold">Conta</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/perfil" className="rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold">Editar perfil</Link>
          <Link href="/configuracoes/senha" className="rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold">Alterar senha</Link>
          <Link href="/onboarding?etapa=0" className="rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold">Refazer questionário</Link>
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-bold">Privacidade e seus dados (LGPD)</h2>
        <p className="text-sm text-muted">Você é o titular dos seus dados. Pode exportá-los, revogar consentimentos e excluir a conta a qualquer momento.</p>
        <a href="/api/exportar" className="inline-flex min-h-11 items-center rounded-2xl bg-brand-soft px-4 text-sm font-semibold text-brand-strong">Exportar todos os meus dados (JSON)</a>
        <Consentimento ativo={saudeAtivo} />
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Histórico de consentimentos</summary>
          <ul className="mt-2 space-y-1 text-muted">
            {(cons ?? []).map((c, i) => (
              <li key={i}>
                {c.tipo} ({c.versao}) — aceito em {fmt(c.aceito_em)}
                {c.revogado_em && ` · revogado em ${fmt(c.revogado_em)}`}
              </li>
            ))}
          </ul>
        </details>
        <p className="text-sm">
          <Link href="/privacidade" className="font-semibold text-brand">Política de Privacidade</Link> · <Link href="/termos" className="font-semibold text-brand">Termos de Uso</Link>
        </p>
      </Card>
      <Card className="space-y-3 border-danger/30">
        <h2 className="font-bold text-danger">Excluir conta</h2>
        <p className="text-sm text-muted">Remove definitivamente sua conta e todos os dados: perfil, saúde, planos, registros e histórico. Recomendamos exportar antes.</p>
        <ExcluirConta />
      </Card>
      <SairButton />
    </div>
  );
}
