"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Card from "@/components/ui/Card";
import styles from "./page.module.css";

function sanitizeNext(value: string | null): string {
  if (!value) return "/me";
  if (!value.startsWith("/")) return "/me";
  if (value.startsWith("//")) return "/me";
  if (value.includes("\\")) return "/me";
  return value;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNext(searchParams.get("next")),
    [searchParams]
  );

  const [googleEnabled, setGoogleEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

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
      setErrors(["Login con Google non configurato"]);
      return;
    }

    setErrors([]);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await signIn("google", { callbackUrl: nextPath });
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Errore imprevisto"]);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setFieldErrors({});
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const emailConfirm = String(form.get("emailConfirm") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    const nextErrors: string[] = [];
    const nextFieldErrors: Record<string, boolean> = {};

    if (!emailRegex.test(email)) {
      nextErrors.push("Inserisci una email valida");
      nextFieldErrors.email = true;
    }

    if (email !== emailConfirm) {
      nextErrors.push("Le email non coincidono");
      nextFieldErrors.email = true;
      nextFieldErrors.emailConfirm = true;
    }

    if (!isStrongPassword(password)) {
      nextErrors.push(
        "La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero."
      );
      nextFieldErrors.password = true;
      nextFieldErrors.passwordConfirm = true;
    }

    if (password !== passwordConfirm) {
      nextErrors.push("Le password non coincidono");
      nextFieldErrors.password = true;
      nextFieldErrors.passwordConfirm = true;
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      setFieldErrors(nextFieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });

      if (!signupRes.ok) {
        if (signupRes.status === 409) {
          setErrors(["Esiste gia un account con questa email"]);
          setFieldErrors({ email: true, emailConfirm: true });
          return;
        }

        const data = (await signupRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrors([data?.error ?? "Registrazione fallita"]);
        return;
      }

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: nextPath,
      });

      if (!loginRes || loginRes.error) {
        setErrors(["Account creato, ma accesso fallito. Prova a fare login."]);
        router.replace("/login");
        return;
      }

      router.replace(loginRes.url ?? nextPath);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Errore imprevisto"]);
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
          <h1 className={styles.title}>Crea il tuo account</h1>
          <p className={styles.subtitle}>
            Inizia ora e sblocca tutte le funzionalita del campus.
          </p>
        </header>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Registrazione veloce</h2>
            <p>Ci metti meno di un minuto.</p>
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
                {isSubmitting ? "Connessione..." : "Registrati con Google"}
              </span>
              <span className={styles.googleBadge}>Consigliato</span>
            </button>
            <p className={styles.googleHint}>
              Accesso sicuro e veloce con il tuo account Google
            </p>

            {!googleEnabled ? (
              <p className={styles.loginHint}>
                Google non e configurato (imposta GOOGLE_CLIENT_ID/SECRET).
              </p>
            ) : null}

            <div className={styles.divider}>
              <span>Oppure</span>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {errors.length > 0 ? (
                <div className={styles.errorBox} role="alert">
                  <strong>Controlla i campi evidenziati</strong>
                  <ul className={styles.errorList}>
                    {errors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <label className={styles.label}>
                Nome
                <input
                  className={styles.input}
                  name="firstName"
                  type="text"
                  placeholder="Mario"
                  autoComplete="given-name"
                />
              </label>
              <label className={styles.label}>
                Cognome
                <input
                  className={styles.input}
                  name="lastName"
                  type="text"
                  placeholder="Rossi"
                  autoComplete="family-name"
                />
              </label>
              <label className={styles.label}>
                Email
                <input
                  className={`${styles.input} ${
                    fieldErrors.email ? styles.inputError : ""
                  }`}
                  name="email"
                  type="email"
                  placeholder="tu@scuola.it"
                  autoComplete="email"
                />
              </label>
              <label className={styles.label}>
                Conferma email
                <input
                  className={`${styles.input} ${
                    fieldErrors.emailConfirm ? styles.inputError : ""
                  }`}
                  name="emailConfirm"
                  type="email"
                  placeholder="tu@scuola.it"
                  autoComplete="email"
                />
              </label>
              <label className={styles.label}>
                Password
                <input
                  className={`${styles.input} ${
                    fieldErrors.password ? styles.inputError : ""
                  }`}
                  name="password"
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                />
              </label>
              <label className={styles.label}>
                Conferma password
                <input
                  className={`${styles.input} ${
                    fieldErrors.passwordConfirm ? styles.inputError : ""
                  }`}
                  name="passwordConfirm"
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                />
              </label>
              <button
                className={styles.googleButton}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creazione…" : "Crea account"}
              </button>
            </form>

            <p className={styles.loginHint}>
              Hai gia un account? <a href="/login">Accedi</a>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
