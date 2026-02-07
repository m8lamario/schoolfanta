"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import styles from "./page.module.css";

function sanitizeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  return value;
}

export default function StartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const rawNext = searchParams.get("next");
    if (rawNext) return sanitizeNext(rawNext);

    const rawCb = searchParams.get("callbackUrl");
    if (rawCb) {
      try {
        const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        const url = new URL(rawCb, base);
        // Consenti solo callbackUrl della stessa origin; estrai pathname+search
        if (typeof window !== "undefined" && url.origin !== window.location.origin) {
          return "/";
        }
        const path = url.pathname + (url.search || "");
        return sanitizeNext(path);
      } catch {
        return "/";
      }
    }

    return "/";
  }, [searchParams]);

  const [googleEnabled, setGoogleEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<
    | {
        signIn?: {
          ok?: boolean;
          error?: string | null;
          url?: string | null;
        };
        server?: { hasSession: boolean } | { error: string };
      }
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        const data = (await res.json()) as { googleEnabled?: boolean };
        if (!cancelled) setGoogleEnabled(Boolean(data.googleEnabled));
      } catch {
        if (!cancelled) setGoogleEnabled(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGoogle() {
    if (!googleEnabled) {
      setError("Login con Google non configurato");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn("google", { callbackUrl: (typeof window !== "undefined" ? window.location.origin : "") + nextPath });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setDebugInfo(undefined);
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl:
          (typeof window !== "undefined" ? window.location.origin : "") +
          nextPath,
      });

      if (!res) {
        // Fallback: call NextAuth manually to surface a real error.
        try {
          const csrf = (await fetch("/api/auth/csrf", { cache: "no-store" }).then(
            (r) => r.json()
          )) as { csrfToken?: string };

          const body = new URLSearchParams();
          body.set("csrfToken", csrf.csrfToken ?? "");
          body.set("email", email);
          body.set("password", password);
          body.set("callbackUrl", window.location.origin + nextPath);
          body.set("json", "true");

          const cbRes = await fetch("/api/auth/callback/credentials", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body,
          });
          const cbJson = (await cbRes.json().catch(() => null)) as
            | { url?: string; error?: string }
            | null;

          console.log("[login] fallback callback/credentials", {
            status: cbRes.status,
            cbJson,
          });

          setDebugInfo({
            signIn: {
              ok: cbRes.ok && !cbJson?.error,
              error: cbJson?.error ?? `HTTP_${cbRes.status}`,
              url: cbJson?.url ?? null,
            },
          });

          if (!cbRes.ok || cbJson?.error || !cbJson?.url) {
            setError(
              "Login fallito (fallback). Controlla i log server: /api/auth/callback/credentials"
            );
            return;
          }

          try {
            const u = new URL(cbJson.url, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
            if (typeof window !== "undefined" && u.origin === window.location.origin) {
              window.location.assign(u.pathname + (u.search || ""));
            } else {
              window.location.href = cbJson.url;
            }
          } catch {
            if (typeof window !== "undefined") window.location.assign(nextPath);
          }
          return;
        } catch (fallbackErr) {
          console.log("[login] signIn returned null (fallback failed)", fallbackErr);
          setDebugInfo({
            signIn: { ok: false, error: "NULL_RESPONSE", url: null },
          });
          setError(
            "Login non riuscito: risposta nulla da NextAuth (controlla /api/auth/[...nextauth] e la console server)."
          );
          return;
        }
      }

      console.log("[login] signIn result", {
        email,
        nextPath,
        ok: res.ok,
        error: res.error,
        url: res.url,
      });

      setDebugInfo({
        signIn: {
          ok: res.ok,
          error: res.error ?? null,
          url: res.url ?? null,
        },
      });

      // Server-side confirmation
      try {
        const s = await fetch("/api/auth/debug-session", {
          cache: "no-store",
        }).then((r) => r.json());
        setDebugInfo((prev) => ({
          ...(prev ?? {}),
          server: { hasSession: Boolean(s?.hasSession) },
        }));
      } catch (e2) {
        setDebugInfo((prev) => ({
          ...(prev ?? {}),
          server: { error: e2 instanceof Error ? e2.message : "debug failed" },
        }));
      }

      if (res.error) {
        setError("Credenziali non valide");
        return;
      }

      try {
        const target = res.url ?? ((typeof window !== "undefined" ? window.location.origin : "") + nextPath);
        const u = new URL(target, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        if (typeof window !== "undefined" && u.origin === window.location.origin) {
          window.location.assign(u.pathname + (u.search || ""));
        } else {
          // Se è un URL esterno, effettua un redirect completo
          window.location.href = target;
        }
      } catch {
        router.replace(nextPath);
      }
    } catch (err) {
      console.log("[login] signIn exception", err);
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true">
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>SchoolFanta</p>
          <h1 className={styles.title}>Inizia a giocare</h1>
          <p className={styles.subtitle}>
            Crea la tua squadra e domina il campus in meno di 1 minuto.
          </p>
        </header>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Accesso rapido</h2>
            <p>Entra subito e salta le formalita.</p>
          </div>

          <div className={styles.authStack}>
            <Button
              onClick={handleGoogle}
              size="lg"
              className={styles.googleButton}
            >
              Continua con Google
            </Button>

            {!googleEnabled ? (
              <p className={styles.loginHint}>
                Google non e configurato (imposta GOOGLE_CLIENT_ID/SECRET).
              </p>
            ) : null}

            <div className={styles.divider}>
              <span>Oppure</span>
            </div>

            <form
              className={styles.form}
              onSubmit={handleSubmit}
              noValidate
            >
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  name="email"
                  type="email"
                  placeholder="tu@scuola.it"
                  autoComplete="email"
                />
              </label>
              <label className={styles.label}>
                Password
                <input
                  className={styles.input}
                  name="password"
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                />
              </label>
              <Button
                className={styles.googleButton}
                type="submit"
                onClick={isSubmitting ? (e) => e.preventDefault() : undefined}
              >
                {isSubmitting ? "Accesso…" : "Accedi"}
              </Button>

              {error ? <p className={styles.loginHint}>{error}</p> : null}

              {debugInfo ? (
                <pre
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "auto",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              ) : null}
            </form>

            <p className={styles.loginHint}>
              Non hai un account? <a href="/signup">Registrati</a>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
