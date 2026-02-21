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
  const [credentialsError, setCredentialsError] = useState(false);

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
    setCredentialsError(false);
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
        if (res.error === "CredentialsSignin") {
          setCredentialsError(true);
        } else {
          setError(`Errore login: ${res.error ?? "UNKNOWN"}`);
        }
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
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isSubmitting || !googleEnabled}
              className={styles.googleAuthButton}
            >
              <svg className={styles.googleLogo} viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className={styles.googleButtonText}>
                {isSubmitting ? "Connessione..." : "Continua con Google"}
              </span>
              <span className={styles.googleBadge}>Veloce</span>
            </button>
            <p className={styles.googleHint}>
              Accesso sicuro con il tuo account Google
            </p>

            <div className={styles.divider}>
              <span>Oppure</span>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <label className={styles.label}>
                Email
                <input
                  className={`${styles.input} ${credentialsError ? styles.inputError : ""}`}
                  name="email"
                  type="email"
                  placeholder="tu@scuola.it"
                  autoComplete="email"
                />
              </label>
              <label className={styles.label}>
                Password
                <input
                  className={`${styles.input} ${credentialsError ? styles.inputError : ""}`}
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
