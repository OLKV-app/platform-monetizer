import { supabase } from "@/integrations/supabase/client";

export type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  island: string | null;
  is_banned: boolean | null;
  ban_reason: string | null;
};

/**
 * Fetch profiles for a set of user ids. Returns a Map keyed by id.
 * All fields optional / nullable; caller picks what it needs.
 */
export async function fetchProfilesByIds(ids: Array<string | null | undefined>) {
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const map = new Map<string, ProfileLite>();
  if (uniq.length === 0) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone, island, is_banned, ban_reason")
    .in("id", uniq);
  if (error) {
    // Surface in dev, but don't blow up UI.
    console.error("[fetchProfilesByIds]", error);
    return map;
  }
  for (const p of data ?? []) map.set(p.id, p as ProfileLite);
  return map;
}

/**
 * Attach a `profiles` field to each row using the given key.
 * Mutates a shallow copy per row and returns the new array.
 */
export function attachProfiles<T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
  profiles: Map<string, ProfileLite>,
  as: string = "profiles",
): (T & Record<string, ProfileLite | null>)[] {
  return rows.map((r) => ({
    ...r,
    [as]: (r[key] && profiles.get(r[key] as string)) || null,
  })) as any;
}
