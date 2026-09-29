import type { Metadata } from "next";
import { carregarPerfil } from "@/lib/server/perfil";
import { requireUser } from "@/lib/supabase/server";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Vamos conhecer você" };

export default async function Onboarding({ searchParams }: PageProps<"/onboarding">) {
  const { supabase, user } = await requireUser();
  const perfil = await carregarPerfil(supabase, user.id);
  const sp = await searchParams;
  const etapa = typeof sp.etapa === "string" ? Number(sp.etapa) : Math.min(perfil.onboardingEtapa, 8);
  return <Wizard perfil={perfil} etapaInicial={Number.isFinite(etapa) ? etapa : 0} />;
}
