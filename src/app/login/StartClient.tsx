"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

async function signInCredentialsManual(params: {
  email: string;
  password: string;
  callbackUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const csrfRes = await fetch("/api/auth/csrf", { cache: "no-store" });
  const csrfJson = (await csrfRes.json().catch(() => null)) as
    | { csrfToken?: string }
    | null;
  const csrfToken = csrfJson?.csrfToken;
  if (!csrfRes.ok || !csrfToken) {
    return { ok: false, error: "CSRF" };
  }

  const body = new URLSearchParams();
  body.set("csrfToken", csrfToken);
  body.set("email", params.email);
  body.set("password", params.password);
  body.set("callbackUrl", params.callbackUrl);
  body.set("json", "true");

  const cbRes = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual",
  });

  const text = await cbRes.text();
  let data: { url?: string; error?: string } | null;
  try {
    data = JSON.parse(text) as { url?: string; error?: string };
  } catch {
    data = null;
  }

  if (cbRes.status === 401 && data?.url?.includes("error=CredentialsSignin")) {
    return { ok: false, error: "CredentialsSignin" };
  }

  if (cbRes.ok) {
    return { ok: true };
  }

  return { ok: false, error: data?.error || "UNKNOWN" };
}

export default function StartClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [googleEnabled, setGoogleEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const rawNext = searchParams.get("next");
    if (rawNext) return sanitizeNext(rawNext);

    const rawCb = searchParams.get("callbackUrl");
    if (rawCb) {
      try {
        const base =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";
        const url = new URL(rawCb, base);
        if (
          typeof window !== "undefined" &&
          url.origin !== window.location.origin
        ) {
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

  const errorFromQuery = useMemo(() => {
    const err = searchParams.get("error");
    if (!err) return null;

    switch (err) {
      case "CredentialsSignin":
        return "Email o password non valide.";
      case "OAuthAccountNotLinked":
        return "Questo account Google è già collegato a un altro login.";
      case "InvalidVerificationLink":
        return "Link di verifica non valido.";
      case "InvalidVerificationToken":
        return "Token di verifica non valido o già utilizzato.";
      case "VerificationTokenExpired":
        return "Il link di verifica è scaduto. Richiedi un nuovo invio dal tuo profilo.";
      case "UserNotFound":
        return "Utente non trovato.";
      case "VerificationFailed":
        return "Errore durante la verifica. Riprova più tardi.";
      default:
        return `Errore login: ${err}`;
    }
  }, [searchParams]);

  const successMessage = useMemo(() => {
    if (searchParams.get("verified") === "true") {
      return "✓ Email verificata con successo! Ora puoi accedere.";
    }
    return null;
  }, [searchParams]);

  const errorToShow = error ?? errorFromQuery;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        const data = (await res.json()) as Record<string, { id: string }>;
        if (!cancelled) setGoogleEnabled(Boolean(data.google));
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
      await signIn("google", { callbackUrl: nextPath });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const res = await signInCredentialsManual({
        email,
        password,
        callbackUrl: nextPath,
      });

      if (!res.ok) {
        setError(
          res.error === "CredentialsSignin"
            ? "Email o password non valide."
            : `Errore login: ${res.error ?? "UNKNOWN"}`
        );
        setIsSubmitting(false);
        return;
      }

      // Best-effort refresh session
      try {
        await fetch("/api/auth/session", { cache: "no-store" });
      } catch {
        // ignore
      }

      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
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
            <Button onClick={handleGoogle} size="lg" className={styles.googleButton}>
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

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
              <Button className={styles.googleButton} type="submit">
                {isSubmitting ? "Accesso…" : "Accedi"}
              </Button>

              {errorToShow ? <p className={styles.loginHint}>{errorToShow}</p> : null}
              {successMessage ? <p className={styles.successHint}>{successMessage}</p> : null}
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
