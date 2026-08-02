/**
 * Lightweight client-side integrity helpers.
 * Used to detect accidental/casual tampering with locally cached config.
 * NOT a security boundary — never rely on this for authorization.
 */

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export async function generateIntegrityChecksum(payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(stableStringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyIntegrityChecksum(
  payload: unknown,
  checksum: string | undefined | null,
): Promise<boolean> {
  if (!checksum) return false;
  return (await generateIntegrityChecksum(payload)) === checksum;
}
