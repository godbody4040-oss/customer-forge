import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/marketing/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Local Lead Engine" },
      {
        name: "description",
        content:
          "Questions about launching your local business website, quote calculator or booking calendar? Send us a note and we'll get back within one business day.",
      },
      { property: "og:title", content: "Contact — Local Lead Engine" },
      {
        property: "og:description",
        content: "Talk to us about getting your local service business online and booked out.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="eyebrow">Contact</p>
            <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight font-semibold">
              Talk to a human
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Tell us your trade and what you're trying to fix. We'll tell you honestly whether this
              is the right tool for you — and how fast you can be live.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                { icon: Mail, label: "hello@localleadengine.app", note: "Replies within one business day" },
                { icon: Phone, label: "(555) 018-2200", note: "Mon–Fri, 9a–6p" },
                { icon: MessageSquare, label: "Live demo site", note: "See exactly what customers see" },
              ].map(({ icon: Icon, label, note }) => (
                <li key={label} className="panel flex items-center gap-3.5 p-4">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-[14px] font-medium">{label}</p>
                    <p className="text-[12px] text-muted-foreground">{note}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[13px] text-muted-foreground">
              Want to skip the conversation?{" "}
              <Link to="/auth" search={{ mode: "signup" }} className="text-primary hover:underline">
                Start the free trial
              </Link>
              .
            </p>
          </div>

          <div className="panel p-6">
            {sent ? (
              <div className="py-10 text-center">
                <h2 className="font-display text-[17px] font-semibold">Message received</h2>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  We'll be in touch within one business day.
                </p>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                  toast.success("Thanks — we'll reply within one business day.");
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-name">Your name</Label>
                    <Input id="c-name" name="name" required autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-business">Business</Label>
                    <Input id="c-business" name="business" autoComplete="organization" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-message">What are you trying to fix?</Label>
                  <Textarea id="c-message" name="message" rows={5} required />
                </div>
                <Button type="submit" variant="signal" className="w-full">
                  Send message
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
