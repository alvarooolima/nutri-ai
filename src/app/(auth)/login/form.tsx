"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBox, Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, aviso }: { next: string; aviso?: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(fd: FormData) {
    setErro(null);
    setCarregando(true);
    const { error } = await createClient().auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("senha")) });
    setCarregando(false);
    if (error) {
      setErro(error.message.includes("Email not confirmed") ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : "E-mail ou senha incorretos.");
      return;
    }
    router.replace(next.startsWith("/") ? next : "/inicio");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
      <p className="mt-1 text-muted">Entre para ver seu plano e seus registros.</p>
      {aviso === "confirmado" && (
        <div className="mt-4">
          <AlertBox gravidade="info" titulo="E-mail confirmado">Agora é só entrar.</AlertBox>
        </div>
      )}
      <form action={entrar} className="mt-6 space-y-4">
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha">
          <Input name="senha" type="password" autoComplete="current-password" required minLength={8} />
        </Field>
        {erro && <p className="text-sm font-medium text-danger" role="alert">{erro}</p>}
        <Button type="submit" className="w-full" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/recuperar-senha" className="text-muted hover:text-ink">Esqueci minha senha</Link>
        <p className="text-muted">
          Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-brand">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
