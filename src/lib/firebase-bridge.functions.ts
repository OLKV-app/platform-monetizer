// Bridges a verified Firebase ID token into a Supabase session so existing
// RLS policies (scoped to auth.uid()) keep working. Frontend never sees the
// bridge — users only interact with Firebase.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FIREBASE_PROJECT_ID = "project-6e03e9ed-73b5-4bf4-816";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

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
};

async function findSupabaseUserByEmail(supabaseAdmin: any, email: string): Promise<string | null> {
  const pageSize = 200;
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );

    if (match) {
      return match.id;
    }

    if (!data.users || data.users.length < pageSize) {
      break;
    }

    page++;
  }

  return null;
}

export const bridgeFirebaseSession = createServerFn({
  method: "POST",
})
  .validator(bridgeFirebaseSessionSchema)
  .handler(async ({ data }) => {
    const { jwtVerify, createRemoteJWKSet } = await import("jose");

    const JWKS = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

    const { payload } = await jwtVerify(data.idToken, JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
    });

    const claims = payload as FirebasePayload;

    const firebaseUid = String(claims.sub ?? "");
    const email = String(claims.email ?? "");
    const emailVerified = Boolean(claims.email_verified);

    const name = data.fullName ?? claims.name ?? email.split("@")[0] ?? "User";

    const picture = claims.picture ?? null;

    if (!firebaseUid || !email) {
      throw new Error("Firebase token missing subject or email");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // First try to find the existing profile using the Firebase UID.
    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    let userId: string | null = existingProfile?.id ?? null;

    // Fall back to looking up the auth user by email.
    if (!userId) {
      userId = await findSupabaseUserByEmail(supabaseAdmin, email);
    }

    // Create the auth user if needed.
    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: firebaseUid,
          terms_accepted: "true",
        },
      });

      if (createError) {
        throw createError;
      }

      userId = created.user!.id;
    } else {
      // Keep auth metadata updated.
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: firebaseUid,
          terms_accepted: "true",
        },
      });

      if (updateAuthError) {
        throw updateAuthError;
      }
    }

    // Keep the profile row synchronized.
    const { error: profileUpsertError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        firebase_uid: firebaseUid,
        full_name: name,
        avatar_url: picture,
      },
      {
        onConflict: "id",
      },
    );

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    // Generate a Supabase magic-link token so the client can establish a session.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError) {
      throw linkError;
    }

    const hashedToken = linkData?.properties?.hashed_token;

    if (!hashedToken) {
      throw new Error("Failed to mint Supabase session token");
    }

    return {
      email,
      tokenHash: hashedToken,
      emailVerified,
    };
  });
