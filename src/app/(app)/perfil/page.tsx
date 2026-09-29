import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { carregarPerfil } from "@/lib/server/perfil";
import { requireUser } from "@/lib/supabase/server";
import { EditorPerfil } from "./editor";

export const metadata: Metadata = { title: "Perfil e preferências" };

export default async function Perfil({ searchParams }: PageProps<"/perfil">) {
  const { supabase, user } = await requireUser();
  const perfil = await carregarPerfil(supabase, user.id);
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Perfil e preferências" subtitulo="Objetivos, rotina, alimentação, atividade física, preferências e orçamento." />
      <EditorPerfil perfil={perfil} aba={typeof sp.aba === "string" ? Number(sp.aba) : 0} />
    </div>
  );
}
