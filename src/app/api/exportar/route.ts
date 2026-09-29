import { NextResponse } from "next/server";
import { decifrar } from "@/lib/server/crypto";
import { createClient } from "@/lib/supabase/server";

const TABELAS = ["goals", "lifestyle", "exercises", "food_preferences", "budget", "meal_plans", "meals", "meal_items", "shopping_lists", "tracking", "food_logs", "recommendations", "alerts", "plan_reviews", "challenge_progress", "chat_messages", "consents", "audit_log"] as const;

/** Exportação de dados do titular (LGPD, art. 18) — JSON com todos os dados, incluindo os de saúde decifrados */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const uid = auth.user.id;

  const out: Record<string, unknown> = { exportado_em: new Date().toISOString(), formato: "NUTRI.AI export v1" };
  const { data: u } = await supabase.from("users").select("*").eq("id", uid).single();
  out.users = u;
  for (const t of TABELAS) {
    const { data } = await supabase.from(t).select("*").eq("user_id", uid);
    out[t] = data ?? [];
  }
  const { data: hp } = await supabase.from("health_profile").select("*").eq("user_id", uid).maybeSingle();
  out.health_profile = hp
    ? Object.fromEntries(Object.entries(hp).map(([k, v]) => [k, typeof v === "string" && v.startsWith("v1:") ? decifrar(v) : v]))
    : null;
  const { data: meds } = await supabase.from("medications").select("*").eq("user_id", uid);
  out.medications = (meds ?? []).map((m) => ({ ...m, nome: decifrar(m.nome), dose_informada: decifrar(m.dose_informada), observacoes: decifrar(m.observacoes) }));
  const { data: sups } = await supabase.from("supplements").select("*").eq("user_id", uid);
  out.supplements = (sups ?? []).map((m) => ({ ...m, nome: decifrar(m.nome), dose: decifrar(m.dose), observacoes: decifrar(m.observacoes) }));
  const { data: sint } = await supabase.from("symptoms").select("*").eq("user_id", uid);
  out.symptoms = (sint ?? []).map((s) => ({ ...s, observacoes: decifrar(s.observacoes) }));

  await supabase.from("audit_log").insert({ user_id: uid, acao: "exportacao_dados", detalhes: {} });
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutri-ai-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
