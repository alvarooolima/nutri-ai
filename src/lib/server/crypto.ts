import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Criptografia de campo (AES-256-GCM) para dados de saúde.
 * Formato: "v1:" + base64(iv[12] | tag[16] | ciphertext)
 */
function chave(): Buffer {
  const k = process.env.HEALTH_DATA_KEY;
  if (!k) throw new Error("HEALTH_DATA_KEY não configurada");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("HEALTH_DATA_KEY deve ter 32 bytes em base64");
  return buf;
}

export function cifrar(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined || texto === "") return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const enc = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decifrar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (!valor.startsWith("v1:")) return valor;
  const raw = Buffer.from(valor.slice(3), "base64");
  const d = createDecipheriv("aes-256-gcm", chave(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

export const cifrarJson = (v: unknown) => cifrar(JSON.stringify(v ?? null));
export function decifrarJson<T>(v: string | null | undefined, padrao: T): T {
  const t = decifrar(v);
  if (!t) return padrao;
  try {
    return JSON.parse(t) as T;
  } catch {
    return padrao;
  }
}
