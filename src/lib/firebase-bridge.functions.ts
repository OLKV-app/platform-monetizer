// Bridges a verified Firebase ID token into a Supabase session so existing
// RLS policies (scoped to auth.uid()) keep working. Frontend never sees the
// bridge — users only interact with Firebase.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FIREBASE_PROJECT_ID = "olkv-a8199";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export const bridgeFirebaseSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        idToken: z.string().min(20),
        fullName: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { jwtVerify, createRemoteJWKSet } = await import("jose");
    const JWKS = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
    const { payload } = await jwtVerify(data.idToken, JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
    });

    const firebaseUid = String(payload.sub ?? "");
    const email = String(payload.email ?? "");
    const emailVerified = Boolean((payload as { email_verified?: boolean }).email_verified);
    const name =
      data.fullName ||
      (payload as { name?: string }).name ||
      email.split("@")[0] ||
      "User";
    const picture = (payload as { picture?: string }).picture;

    if (!firebaseUid || !email) {
      throw new Error("Firebase token missing subject or email");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find or create the Supabase user for this email.
    let userId: string | null = null;
    {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
      if (match) userId = match.id;
    }
    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: firebaseUid,
          terms_accepted: "true",
        },
      });
      if (error) throw error;
      userId = created.user!.id;
    } else {
      // Keep metadata fresh so handle_new_user-style downstream reads have a name.
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: firebaseUid,
        },
      });
    }

    // Mint a magic-link OTP the client can verify to establish a Supabase session.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw linkError;
    const hashedToken = linkData?.properties?.hashed_token;
    if (!hashedToken) throw new Error("Failed to mint Supabase session token");

    return { email, tokenHash: hashedToken, emailVerified };
  });
