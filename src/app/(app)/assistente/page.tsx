import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Assistente" };

export default async function Assistente() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("chat_messages").select("role,content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Assistente" subtitulo={`Conte o que está acontecendo — eu uso seu perfil e seu plano para responder.${process.env.ANTHROPIC_API_KEY ? "" : " (modo básico)"}`} />
      <Chat inicial={(data ?? []).reverse() as { role: "user" | "assistant"; content: string }[]} />
    </div>
  );
}
