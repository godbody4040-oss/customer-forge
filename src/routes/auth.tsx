import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorNote } from "@/components/app/Bits";

type Search = { mode?: "signup" | "signin"; redirect?: string };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => {
    const rawMode = search["mode"];
    const rawRedirect = search["redirect"];
    const out: Search = {};
    if (rawMode === "signup" || rawMode === "signin") out.mode = rawMode;
    if (typeof rawRedirect === "string" && rawRedirect.startsWith("/")) out.redirect = rawRedirect;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — Revora" },
      {
        name: "description",
        content: "Sign in or create your Revora account to manage leads, bookings and your business website.",
      },
      { property: "og:title", content: "Sign in — Revora" },
      { property: "og:description", content: "Access your business command center." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const destination = redirect ?? "/app";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: destination, replace: true });
    });
  }, [destination, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}${destination}`,
          },
        });
        if (signUpError) throw signUpError;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setIsSignup(false);
          return;
        }
        toast.success("Welcome to Revora.");
        navigate({ to: "/onboarding", replace: true });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ to: destination, replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy("google");
    try {
      sessionStorage.setItem("lle:redirect", destination);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed.");
        return;
      }
      if (result.redirected) return;
      navigate({ to: destination, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-[24px] leading-tight font-semibold">
            {isSignup ? "Start growing your business" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {isSignup
              ? "Create your account, then launch your Revora Growth System."
              : "Sign in to your business command center."}

          </p>

          <div className="panel mt-6 p-5">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={busy !== null}
            >
              {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] tracking-wider uppercase text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={handleEmail}>
              {isSignup ? (
                <div className="space-y-1.5">
                  <Label htmlFor="a-name">Your name</Label>
                  <Input
                    id="a-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="a-email">Email</Label>
                <Input
                  id="a-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-password">Password</Label>
                <Input
                  id="a-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </div>
              {error ? <ErrorNote message={error} /> : null}
              <Button type="submit" variant="signal" className="w-full" disabled={busy !== null}>
                {busy === "email" ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="cursor-pointer text-primary hover:underline"
              onClick={() => {
                setError(null);
                setIsSignup((v) => !v);
              }}
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
