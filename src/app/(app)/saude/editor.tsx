"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepSaude } from "@/components/perfil/steps";
import { AlertBox } from "@/components/ui";
import type { PerfilCompleto } from "@/lib/server/perfil";

export function EditorSaude({ perfil }: { perfil: PerfilCompleto }) {
  const router = useRouter();
  const [salvo, setSalvo] = useState(false);
  return (
    <>
      {salvo && (
        <div className="mb-4">
          <AlertBox gravidade="info" titulo="Perfil Saúde atualizado">
            Os alertas serão reavaliados. Para refletir no cardápio, <Link href="/plano" className="font-semibold underline">gere um novo plano</Link>.
          </AlertBox>
        </div>
      )}
      <StepSaude p={perfil} rotulo="Salvar Perfil Saúde" onSalvo={() => { setSalvo(true); router.refresh(); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </>
  );
}
