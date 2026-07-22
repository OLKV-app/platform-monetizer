import { supabase } from "@/integrations/supabase/client";

export async function getSetting<T = any>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: any, userId?: string) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_by: userId ?? null, updated_at: new Date().toISOString() });
  if (error) throw error;
}
