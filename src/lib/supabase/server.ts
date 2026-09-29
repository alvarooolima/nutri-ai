import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado a partir de Server Component — o proxy já renova a sessão
        }
      },
    },
  });
}

/**
 * Retorna o cliente e o usuário autenticado ou redireciona para o login.
 * Usa getClaims: o JWT (ES256) é verificado localmente com as chaves públicas do projeto,
 * sem uma ida ao servidor de autenticação a cada página. O acesso aos dados continua protegido por RLS.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { supabase, user: { id: claims.sub, email: (claims.email as string | undefined) ?? "" } };
});
