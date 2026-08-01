// Bridges a verified Firebase ID token into a Supabase session so existing
// RLS policies (scoped to auth.uid()) keep working. Frontend never sees the
// bridge — users only interact with Firebase.
//
// Supports both email-based providers (Google, email/password) and phone-only
// providers (Phone OTP). Phone-only users get a stable synthetic email
// (`firebase-<uid>@phone.olkv.local`) so Supabase Auth (which requires an
// email to mint magiclink sessions) works uniformly. The real phone number
// is stored on `profiles.phone`, and the profile is left with a null
// `full_name` on first sign-in so the client can route to onboarding.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FIREBASE_PROJECT_ID = "project-6e03e9ed-73b5-4bf4-816";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const PHONE_EMAIL_DOMAIN = "phone.olkv.local";
const syntheticEmailFor = (uid: string) => `firebase-${uid}@${PHONE_EMAIL_DOMAIN}`;
const isSyntheticEmail = (email: string) => email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);

const bridgeFirebaseSessionSchema = z.object({
  idToken: z.string().min(20),
  fullName: z.string().max(120).optional(),
});

type FirebasePayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  phone_number?: string;
};

async function findSupabaseUserByEmail(
  supabaseAdmin: any,
  email: string,
): Promise<string | null> {
  const pageSize = 200;
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw error;
    const match = data.users.find(
      (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (!data.users || data.users.length < pageSize) break;
    page++;
  }
  return null;
}

export const bridgeFirebaseSession = createServerFn({ method: "POST" })
  .inputValidator(bridgeFirebaseSessionSchema)
  .handler(async ({ data }) => {
    const { jwtVerify, createRemoteJWKSet } = await import("jose");
    const JWKS = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

    const { payload } = await jwtVerify(data.idToken, JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
    });
    const claims = payload as FirebasePayload;

    const firebaseUid = String(claims.sub ?? "");
    const realEmail = claims.email ? String(claims.email) : null;
    const phoneNumber = claims.phone_number ? String(claims.phone_number) : null;
    const emailVerified = Boolean(claims.email_verified);

    if (!firebaseUid) throw new Error("Firebase token missing subject");
    if (!realEmail && !phoneNumber) {
      throw new Error("Firebase token missing both email and phone");
    }

    // Use real email for email providers, synthetic for phone-only users.
    const email = realEmail ?? syntheticEmailFor(firebaseUid);
    const isPhoneOnly = !realEmail;

    const name =
      data.fullName ??
      (claims.name ? String(claims.name) : null) ??
      (realEmail ? realEmail.split("@")[0] : null);

    const picture = claims.picture ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Find existing profile by firebase_uid (primary identity).
    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;

    let userId: string | null = existingProfile?.id ?? null;

    // 2) Fall back to email lookup only for real email providers.
    if (!userId && !isPhoneOnly) {
      userId = await findSupabaseUserByEmail(supabaseAdmin, email);
    }

    // 2b) For phone-only users, fall back to a profile lookup by phone number.
    if (!userId && isPhoneOnly && phoneNumber) {
      const { data: phoneProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .eq("phone", phoneNumber)
        .maybeSingle();
      if (phoneProfile?.id) userId = phoneProfile.id;
    }

    // 3) Create auth user if still not found.
    // Track whether this is a brand-new user BEFORE we assign userId.
    const isNewUser = !userId;

    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: firebaseUid,
          phone_number: phoneNumber,
          terms_accepted: "true",
          phone_only: isPhoneOnly,
        },
      });
      if (createError) throw createError;
      userId = created.user!.id;
    } else {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: firebaseUid,
          phone_number: phoneNumber,
          terms_accepted: "true",
          phone_only: isPhoneOnly,
        },
      });
      if (updateAuthError) throw updateAuthError;
    }

    // 4) Upsert profile row.
    // For brand-new phone-only users we explicitly null-out full_name so the
    // trigger's split_part(email,'@',1) default is overridden and the client
    // correctly routes to /complete-profile.
    const profilePayload: {
      id: string;
      firebase_uid: string;
      full_name?: string | null;
      avatar_url?: string | null;
      phone?: string | null;
    } = {
      id: userId,
      firebase_uid: firebaseUid,
    };

    if (name) profilePayload.full_name = name;
    else if (isNewUser) profilePayload.full_name = null;

    if (picture) profilePayload.avatar_url = picture;
    if (phoneNumber) profilePayload.phone = phoneNumber;

    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (profileUpsertError) throw profileUpsertError;

    // 5) Mint a magiclink token so the client can establish a Supabase session.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw linkError;
    const hashedToken = linkData?.properties?.hashed_token;
    if (!hashedToken) throw new Error("Failed to mint Supabase session token");

    // Re-read profile to compute needsProfile after upsert.
    const { data: finalProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const needsProfile = !finalProfile?.full_name || finalProfile.full_name.trim() === "";

    return {
      email: isSyntheticEmail(email) ? null : email,
      tokenHash: hashedToken,
      emailVerified,
      needsProfile,
      isPhoneOnly,
    };
  });
