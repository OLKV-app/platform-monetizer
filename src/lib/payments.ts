// Payment abstraction. Razorpay is the live provider for plan purchases.
// Other providers (Stripe / Play Billing / PhonePe) can plug in later.
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

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function functionUrl(slug: string, params?: Record<string, string>): string {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${slug}`;
  if (!params) return base;
  const q = new URLSearchParams(params).toString();
  return `${base}?${q}`;
}

export type RazorpayCheckoutInput = {
  userId: string;
  amount: number;
  currency?: string;
  purpose: PaymentPurpose;
  targetId?: string | null;
  planName: string;
  planId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export type RazorpayCheckoutResult = {
  txnId: string;
  paymentId: string;
};

// Creates a Razorpay order, opens the checkout modal, verifies the signature
// server-side, and returns the paid transaction id.
export async function razorpayCheckout(input: RazorpayCheckoutInput): Promise<RazorpayCheckoutResult> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Razorpay checkout unavailable");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  // 1. Create order server-side
  const createRes = await fetch(functionUrl("razorpay-pay", { action: "create" }), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency ?? "INR",
      purpose: input.purpose,
      target_id: input.targetId ?? null,
    }),
  });
  const order = await createRes.json();
  if (!createRes.ok) throw new Error(order?.error ?? "Failed to create order");

  // 2. Open Razorpay checkout modal
  await new Promise<void>((resolve, reject) => {
    const options = {
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "OLKV",
      description: input.planName,
      order_id: order.orderId,
      prefill: {
        name: input.customerName ?? "",
        email: input.customerEmail ?? "",
        contact: input.customerPhone ?? "",
      },
      theme: { color: "#0f172a" },
      handler: async (response: any) => {
        // 3. Verify signature server-side
        try {
          const verifyRes = await fetch(functionUrl("razorpay-pay", { action: "verify" }), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              txnId: order.txnId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.ok) {
            reject(new Error(verifyData?.error ?? "Payment verification failed"));
            return;
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    };
    const rz = new window.Razorpay(options);
    rz.on("payment.failed", (resp: any) => {
      reject(new Error(resp?.error?.description ?? "Payment failed"));
    });
    rz.open();
  });

  return {
    txnId: order.txnId,
    paymentId: order.orderId,
  };
}

// Creates a PENDING transaction only. Clients can never mark a payment as
// paid — that transition happens server-side after gateway verification.
export async function createPendingTransaction(input: ChargeInput) {
  const invoiceNumber = "INV-" + Date.now().toString(36).toUpperCase();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: input.userId,
      amount: input.amount,
      currency: input.currency ?? "INR",
      provider: "razorpay",
      status: "pending",
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
  { code: "razorpay", label: "Razorpay", enabled: true, note: "Active" },
  { code: "stripe", label: "Stripe", enabled: false, note: "Configure later" },
  { code: "play_billing", label: "Google Play Billing", enabled: false, note: "Android build only" },
  { code: "phonepe", label: "PhonePe", enabled: false, note: "Configure later" },
  { code: "stub", label: "Test (stub)", enabled: false, note: "Development only" },
];
