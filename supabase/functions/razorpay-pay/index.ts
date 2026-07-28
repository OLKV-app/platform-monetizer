import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function authUserId(req: Request): string | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const [_enc, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json?.sub ?? null;
  } catch {
    return null;
  }
}

async function createRazorpayOrder(amountPaise: number, receipt: string, currency = "INR") {
  const res = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
    },
    body: JSON.stringify({ amount: amountPaise, currency, receipt, payment_capture: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description ?? "Razorpay order creation failed");
  return data as { id: string; amount: number; currency: string; receipt: string; status: string };
}

async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const body = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";
    const userId = authUserId(req);
    if (!userId) return jsonError(401, "Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    if (action === "create") {
      const body = await req.json();
      const amount = Number(body.amount);
      const purpose = String(body.purpose ?? "subscription");
      const targetId = body.target_id ? String(body.target_id) : null;
      const currency = String(body.currency ?? "INR");
      if (!Number.isFinite(amount) || amount <= 0) return jsonError(400, "Invalid amount");

      const amountPaise = Math.round(amount * 100);
      const receipt = "rcpt_" + Date.now().toString(36);
      const order = await createRazorpayOrder(amountPaise, receipt, currency);

      const { data: txn, error } = await supabase.from("transactions").insert({
        user_id: userId,
        amount,
        currency,
        provider: "razorpay",
        provider_ref: order.id,
        status: "pending",
        purpose,
        target_id: targetId,
        invoice_number: "INV-" + Date.now().toString(36).toUpperCase(),
        meta: { order_id: order.id, receipt },
      }).select("*").single();
      if (error) throw error;

      return json({ orderId: order.id, txnId: txn.id, amountPaise, currency, keyId: RAZORPAY_KEY_ID });
    }

    if (action === "verify") {
      const body = await req.json();
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, txnId } = body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !txnId) {
        return jsonError(400, "Missing payment fields");
      }
      const ok = await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!ok) return jsonError(400, "Signature verification failed");

      const { data: txn } = await supabase.from("transactions")
        .select("*").eq("id", txnId).eq("user_id", userId).maybeSingle();
      if (!txn) return jsonError(404, "Transaction not found");
      if (txn.provider_ref !== razorpay_order_id) return jsonError(400, "Order mismatch");

      const { error } = await supabase.from("transactions").update({
        status: "paid",
        provider_ref: razorpay_payment_id,
        meta: { ...(txn.meta ?? {}), payment_id: razorpay_payment_id, signature: razorpay_signature },
      }).eq("id", txnId);
      if (error) throw error;

      return json({ ok: true, txnId });
    }

    return jsonError(404, "Unknown action");
  } catch (err) {
    return jsonError(500, (err as Error).message ?? "Server error");
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}
function jsonError(status: number, message: string) {
  return json({ error: message }, status);
}
