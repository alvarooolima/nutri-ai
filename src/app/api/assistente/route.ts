import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { aplicarAcao, contextoAssistente, responderComClaude, responderPorRegras, type AcaoSugerida } from "@/lib/server/assistente";
import { hojeSP } from "@/lib/server/planos";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
const LIMITE_DIARIO = 60;

const corpo = z.union([
  z.object({ mensagem: z.string().trim().min(1).max(1000) }),
  z.object({ acao: z.record(z.string(), z.unknown()) }),
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const uid = auth.user.id;
  const parsed = corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "requisição inválida" }, { status: 400 });

  if ("acao" in parsed.data) {
    try {
      await aplicarAcao(supabase, uid, parsed.data.acao as unknown as AcaoSugerida);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
    }
  }

  const { count } = await supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("role", "user").gte("created_at", `${hojeSP()}T00:00:00-03:00`);
  if ((count ?? 0) >= LIMITE_DIARIO) return NextResponse.json({ texto: "Você atingiu o limite de mensagens de hoje. Amanhã tem mais! 🌱", acoes: [], fonte: "regras" });

  const msg = parsed.data.mensagem;
  const { data: hist } = await supabase.from("chat_messages").select("role,content").eq("user_id", uid).order("created_at", { ascending: false }).limit(10);
  const historico = (hist ?? []).reverse() as { role: "user" | "assistant"; content: string }[];
  await supabase.from("chat_messages").insert({ user_id: uid, role: "user", content: msg });

  const ctx = await contextoAssistente(supabase, uid);
  let resposta;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      resposta = await responderComClaude(ctx, historico, msg);
    } catch (e) {
      console.error("assistente: falha na Claude API, usando regras", e);
      resposta = responderPorRegras(ctx, msg);
    }
  } else resposta = responderPorRegras(ctx, msg);

  await supabase.from("chat_messages").insert({ user_id: uid, role: "assistant", content: resposta.texto });
  return NextResponse.json(resposta);
}
