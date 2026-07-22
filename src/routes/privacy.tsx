import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · OLKV" },
      { name: "description", content: "How OLKV collects, uses and protects your data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-2 px-4 py-3">
          <Link to="/" className="grid size-9 place-items-center rounded-full bg-surface ring-1 ring-border"><ChevronLeft className="size-4" /></Link>
          <h1 className="font-heading text-lg font-bold">Privacy Policy</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] space-y-5 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
        <p className="text-xs uppercase tracking-wider">Last updated: July 2026</p>

        <Section title="What we collect">
          Account info you give us (name, email, phone, island, avatar), listings you create, chat messages,
          reports and appeals you send, and basic device/log info needed to run the service.
        </Section>
        <Section title="How we use it">
          To run the marketplace: show your listings, connect buyers and sellers, moderate content, prevent
          fraud, and improve the app. We do not sell your personal data.
        </Section>
        <Section title="What other users can see">
          Your name, avatar, island, listings and reviews. Your phone number is shown on your listings so buyers
          can contact you — remove it from your profile if you don't want that.
        </Section>
        <Section title="Who sees your private data">
          OLKV admins can access account details (including your registered phone) to moderate the platform and
          respond to reports. Your chat messages are visible to the other person in the conversation and to
          admins if reported.
        </Section>
        <Section title="Retention">
          We keep your data while your account is active. If you delete your account, we remove your profile and
          listings; some records may be kept as required by law or to prevent abuse.
        </Section>
        <Section title="Security">
          We use industry-standard encryption in transit and access controls at rest. No system is 100% secure —
          use a strong password and don't share your login.
        </Section>
        <Section title="Your rights">
          You can edit or delete your data from the app. For anything else, send us a note from the Feedback page.
        </Section>
        <Section title="Children">
          OLKV is not intended for children under 13.
        </Section>
        <Section title="Changes">
          We'll update this policy when things change and note the date at the top.
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
