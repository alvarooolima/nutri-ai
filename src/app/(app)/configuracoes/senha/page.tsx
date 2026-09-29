"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { alterarSenha } from "@/lib/server/actions-registro";

export default function Senha() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  return (
    <div className="mx-auto max-w-md">
      <PageHeader titulo="Alterar senha" voltar="/configuracoes" />
      <Card>
        <form
          action={(fd) =>
            start(async () => {
              const a = String(fd.get("s1"));
              if (a !== String(fd.get("s2"))) return setMsg("As senhas não conferem.");
              const r = await alterarSenha(a);
              setMsg(r.ok ? "Senha alterada." : r.erro ?? "Erro");
            })
          }
          className="space-y-4"
        >
          <Field label="Nova senha"><Input name="s1" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label="Confirme"><Input name="s2" type="password" minLength={8} required autoComplete="new-password" /></Field>
          {msg && <p className="text-sm" role="status">{msg}</p>}
          <Button type="submit" className="w-full" disabled={pendente}>Salvar</Button>
        </form>
      </Card>
    </div>
  );
}
