"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setFieldErrors({});
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
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
      // Demo-only: usa lo stesso endpoint di login per impostare il cookie.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: "demo" }),
      });

      if (!res.ok) {
        setErrors(["Registrazione fallita"]);
        return;
      }

      router.replace(nextPath);
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "Errore imprevisto",
      ]);
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
            <Button
              href={nextPath === "/" ? "/onboarding/school" : nextPath}
              size="lg"
              className={styles.googleButton}
            >
              Continua con Google
            </Button>

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
