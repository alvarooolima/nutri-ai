"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBox, Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const VERSAO_TERMOS = "v1-2026-09";

export function CadastroForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(fd: FormData) {
    setErro(null);
    const senha = String(fd.get("senha"));
    if (senha !== String(fd.get("senha2"))) return setErro("As senhas não conferem.");
    if (!fd.get("termos") || !fd.get("saude")) return setErro("Para continuar, é preciso aceitar os termos e o tratamento de dados de saúde.");
    setCarregando(true);
    const email = String(fd.get("email"));
    const { data, error } = await createClient().auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        data: { nome: String(fd.get("nome")).trim(), aceite_termos: true, aceite_dados_saude: true, versao_termos: VERSAO_TERMOS },
      },
    });
    setCarregando(false);
    if (error) {
      setErro(error.message.includes("already") ? "Já existe uma conta com este e-mail." : error.message.includes("Password") ? "A senha precisa ser mais forte (mín. 8 caracteres, com letras e números)." : "Não foi possível criar a conta. Tente novamente.");
      return;
    }
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
    } else setEnviado(email);
  }

  if (enviado)
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Confira seu e-mail</h1>
        <p className="mt-2 text-muted">
          Enviamos um link de confirmação para <strong className="text-ink">{enviado}</strong>. Depois de confirmar, você volta direto para montar seu perfil.
        </p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-brand">Ir para o login</Link>
      </div>
    );

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-muted">Leva menos de um minuto. Depois vamos conhecer você.</p>
      <form action={cadastrar} className="mt-6 space-y-4">
        <Field label="Como podemos te chamar?">
          <Input name="nome" required maxLength={60} autoComplete="given-name" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Senha" dica="Mínimo de 8 caracteres.">
          <Input name="senha" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirme a senha">
          <Input name="senha2" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <div className="space-y-3 rounded-2xl bg-surface-2 p-4 text-sm">
          <label className="flex gap-3">
            <input type="checkbox" name="termos" className="mt-1 size-4 accent-[var(--brand)]" required />
            <span>
              Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brand underline">Termos de Uso</Link> e a{" "}
              <Link href="/privacidade" target="_blank" className="font-semibold text-brand underline">Política de Privacidade</Link>.
            </span>
          </label>
          <label className="flex gap-3">
            <input type="checkbox" name="saude" className="mt-1 size-4 accent-[var(--brand)]" required />
            <span>
              Autorizo o tratamento dos meus <strong>dados de saúde</strong> (condições, medicamentos, sintomas, medidas) exclusivamente para personalizar meu plano e gerar alertas de segurança, conforme o art. 11 da LGPD. Posso revogar e excluir meus dados a qualquer momento.
            </span>
          </label>
        </div>
        {erro && <AlertBox gravidade="importante" titulo="Não deu certo">{erro}</AlertBox>}
        <Button type="submit" className="w-full" disabled={carregando}>
          {carregando ? "Criando…" : "Criar conta"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Já tem conta? <Link href="/login" className="font-semibold text-brand">Entrar</Link>
      </p>
    </div>
  );
}
