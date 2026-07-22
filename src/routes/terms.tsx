import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · OLKV" },
      { name: "description", content: "The rules for using OLKV, the Lakshadweep marketplace." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-2 px-4 py-3">
          <Link to="/" className="grid size-9 place-items-center rounded-full bg-surface ring-1 ring-border"><ChevronLeft className="size-4" /></Link>
          <h1 className="font-heading text-lg font-bold">Terms of Service</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] space-y-5 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
        <p className="text-xs uppercase tracking-wider">Last updated: July 2026</p>

        <Section title="1. Who we are">
          OLKV is a community marketplace for the Lakshadweep islands. By creating an account or using the app,
          you agree to these Terms. If you don't agree, please don't use OLKV.
        </Section>

        <Section title="2. Your account">
          You must be at least 18 years old (or have a parent's permission) to use OLKV. You are responsible for
          your account, your listings and your communications. Keep your login safe.
        </Section>

        <Section title="3. What you can sell">
          Only items you legally own and can transfer. No illegal, stolen, counterfeit, hazardous or restricted
          goods. No firearms, drugs, wildlife, adult content, or anything prohibited by Indian law.
        </Section>

        <Section title="4. Honest listings — no reposting">
          List items only once. Do <b>not</b> repost another user's product or photos as if they were yours —
          this is a scam and will result in removal and a ban. Descriptions must be truthful. Prices must be real.
        </Section>

        <Section title="5. Safe trading">
          OLKV connects buyers and sellers but is not a party to any transaction. Meet in a public place, inspect
          items in person before paying, and avoid advance payments to strangers. Never share OTPs or bank details.
        </Section>

        <Section title="6. Community conduct">
          No harassment, hate speech, doxxing, spam or off-platform scams. Repeated reports against a user may
          lead to suspension. Continued or serious violations lead to a permanent ban at the admin's discretion.
        </Section>

        <Section title="7. Reports, moderation and appeals">
          You can report listings or users. Admins review reports and may remove content, suspend or ban accounts.
          Banned users may file one appeal from the ban screen. The admin's decision is final.
        </Section>

        <Section title="8. Reviews">
          You may rate and review sellers you've interacted with. Reviews must be based on real experience and
          must not include personal attacks or private data.
        </Section>

        <Section title="9. Content ownership">
          You keep ownership of your listings and photos. You grant OLKV a license to display them within the app
          and its search, share and social preview surfaces.
        </Section>

        <Section title="10. Termination">
          You can delete your account any time. We can suspend or terminate accounts that violate these Terms.
        </Section>

        <Section title="11. Changes">
          We may update these Terms. Continued use of OLKV after changes means you accept the new Terms.
        </Section>

        <Section title="12. Contact">
          Questions? Use the Feedback page inside the app.
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-heading text-base font-bold text-foreground">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
