// Payment abstraction. Real providers (Razorpay / Stripe / Play Billing / PhonePe)
// plug in here later. For now every purchase records a transaction row with
// provider='stub' and status='paid' so the rest of the app flows end-to-end.
import { supabase } from "@/integrations/supabase/client";

export type PaymentPurpose = "subscription" | "ad_free" | "featured" | "bump" | "verification";

export type ChargeInput = {
  userId: string;
  amount: number;
  currency?: string;
  purpose: PaymentPurpose;
  targetId?: string | null;
  // meta is Json-compatible; keep loose here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
};

export async function charge(input: ChargeInput) {
  const invoiceNumber = "INV-" + Date.now().toString(36).toUpperCase();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: input.userId,
      amount: input.amount,
      currency: input.currency ?? "INR",
      provider: "stub",
      provider_ref: invoiceNumber,
      status: "paid",
      purpose: input.purpose,
      target_id: input.targetId ?? null,
      invoice_number: invoiceNumber,
      meta: input.meta ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export const providers = [
  { code: "razorpay", label: "Razorpay", enabled: false, note: "Configure later" },
  { code: "stripe", label: "Stripe", enabled: false, note: "Configure later" },
  { code: "play_billing", label: "Google Play Billing", enabled: false, note: "Android build only" },
  { code: "phonepe", label: "PhonePe", enabled: false, note: "Configure later" },
  { code: "stub", label: "Test (stub)", enabled: true, note: "Active for development" },
];
