"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SairButton() {
  const router = useRouter();
  return (
    <Button
      variante="secundario"
      className="w-full"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      Sair da conta
    </Button>
  );
}
