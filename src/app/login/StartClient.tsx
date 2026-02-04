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

export default function StartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNext(searchParams.get("next")),
    [searchParams]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: "demo" }),
      });

      if (!res.ok) {
        setError("Login fallito");
        return;
      }

      router.replace(nextPath);
    } catch (err) {
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
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  placeholder="tu@scuola.it"
                  autoComplete="email"
                />
              </label>
              <label className={styles.label}>
                Password
                <input
                  className={styles.input}
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                />
              </label>
              <button
                className={styles.googleButton}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Accesso…" : "Accedi"}
              </button>

              {error ? <p className={styles.loginHint}>{error}</p> : null}
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
