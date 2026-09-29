import type { Metadata } from "next";
import Link from "next/link";
import { AlertBox, Card, PageHeader } from "@/components/ui";
import { carregarPerfil } from "@/lib/server/perfil";
import { requireUser } from "@/lib/supabase/server";
import { EditorSaude } from "./editor";

export const metadata: Metadata = { title: "Perfil Saúde" };

export default async function Saude() {
  const { supabase, user } = await requireUser();
  const [perfil, { data: cons }] = await Promise.all([
    carregarPerfil(supabase, user.id),
    supabase.from("consents").select("id").eq("user_id", user.id).eq("tipo", "dados_saude").is("revogado_em", null).limit(1),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader titulo="Perfil Saúde" subtitulo="Condições, medicamentos, suplementos, internações, sintomas e orientações profissionais." />
      <Card className="text-sm">
        <h2 className="font-bold">Como usamos estas informações</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Como contexto de segurança ao gerar o plano: excluir alérgenos, evitar interações (ex.: varfarina e vitamina K, IMAO e fermentados), limitar déficits quando não indicados.</li>
          <li>Para criar alertas de avaliação profissional — em linguagem clara, sem diagnóstico.</li>
          <li>Nunca para prescrever tratamento, alterar medicamentos ou criar uma “dieta para a doença”.</li>
        </ul>
        <p className="mt-2 text-muted">Dados criptografados. Veja os <Link href="/alertas" className="font-semibold text-brand">alertas atuais</Link>.</p>
      </Card>
      {!cons?.length ? (
        <AlertBox gravidade="atencao" titulo="Consentimento de dados de saúde revogado">
          Para registrar informações de saúde, reative o consentimento em <Link href="/configuracoes" className="font-semibold underline">Configurações</Link>.
        </AlertBox>
      ) : (
        <Card>
          <EditorSaude perfil={perfil} />
        </Card>
      )}
    </div>
  );
}
