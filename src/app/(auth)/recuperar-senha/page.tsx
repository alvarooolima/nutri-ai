"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenha() {
  const [enviado, setEnviado] = useState(false);
  async function enviar(fd: FormData) {
    await createClient().auth.resetPasswordForEmail(String(fd.get("email")), { redirectTo: `${window.location.origin}/auth/callback?next=/configuracoes/senha` });
    setEnviado(true);
  }
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Recuperar senha</h1>
      {enviado ? (
        <p className="mt-2 text-muted">Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.</p>
      ) : (
        <form action={enviar} className="mt-6 space-y-4">
          <Field label="E-mail da conta">
            <Input name="email" type="email" required />
          </Field>
          <Button type="submit" className="w-full">Enviar link</Button>
        </form>
      )}
    </div>
  );
}
