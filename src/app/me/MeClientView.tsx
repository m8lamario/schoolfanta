"use client";

import { useEffect, useState, useCallback } from "react";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

type UserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  emailVerified: string | null;
  createdAt: string;
  hasPassword: boolean;
  hasGoogleAccount: boolean;
};

function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

export default function MeClientView({ session: _session }: { session: Session }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Toggle edit mode for completed sections
  const [forceShowEditProfile, setForceShowEditProfile] = useState(false);
  const [forceShowEditPassword, setForceShowEditPassword] = useState(false);

  // Resend verification email state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Errore nel caricamento del profilo");
      }
      const data = (await res.json()) as UserProfile;
      setProfile(data);
      setFormData({
        name: data.name ?? "",
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Calculate profile completion
  const completionItems = profile
    ? [
        { label: "Email", done: Boolean(profile.email) },
        { label: "Nome", done: Boolean(profile.name) },
        { label: "Nome proprio", done: Boolean(profile.firstName) },
        { label: "Cognome", done: Boolean(profile.lastName) },
        { label: "Password", done: profile.hasPassword },
      ]
    : [];

  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercent = completionItems.length
    ? Math.round((completedCount / completionItems.length) * 100)
    : 0;

  // Determine if profile editing section should be visible
  const isProfileComplete = profile
    ? Boolean(profile.name && profile.firstName && profile.lastName)
    : false;
  const showEditProfileSection = !isProfileComplete || forceShowEditProfile;

  // Determine if password section should be visible (only for Google OAuth users)
  const canSetPassword = profile?.hasGoogleAccount ?? false;
  const showSetPasswordSection =
    canSetPassword && (!profile?.hasPassword || forceShowEditPassword);

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Errore nel salvataggio");
      }

      const updatedProfile = (await res.json()) as UserProfile;
      setProfile(updatedProfile);
      setSaveSuccess(true);

      // Se il profilo è completo, nascondi la sezione dopo un breve delay
      const nowComplete = Boolean(
        updatedProfile.name && updatedProfile.firstName && updatedProfile.lastName
      );
      if (nowComplete) {
        setTimeout(() => {
          setForceShowEditProfile(false);
          setSaveSuccess(false);
        }, 2000);
      } else {
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordErrors([]);
    setPasswordSuccess(false);

    const errors: string[] = [];

    if (!passwordData.password) {
      errors.push("Inserisci una password");
    } else if (!isStrongPassword(passwordData.password)) {
      errors.push(
        "La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero"
      );
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      errors.push("Le password non coincidono");
    }

    if (errors.length > 0) {
      setPasswordErrors(errors);
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: passwordData.password,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Errore nel salvataggio password");
      }

      setPasswordSuccess(true);
      setPasswordData({ password: "", confirmPassword: "" });

      // Refetch profile to update hasPassword, poi nascondi sezione
      await fetchProfile();
      setTimeout(() => {
        setForceShowEditPassword(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordErrors([err instanceof Error ? err.message : "Errore imprevisto"]);
    } finally {
      setPasswordSaving(false);
    }
  }

  // Determine warning scenarios
  const showEmailVerificationWarning =
    profile && !profile.emailVerified && !profile.hasGoogleAccount;

  // Check if any edit button should be shown
  const canShowEditButton = isProfileComplete || (canSetPassword && profile?.hasPassword);

  async function handleResendVerification() {
    setResendingVerification(true);
    setVerificationError(null);
    setVerificationSent(false);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setVerificationError(data?.error ?? "Errore nell'invio dell'email");
        return;
      }

      setVerificationSent(true);
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setResendingVerification(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.background} aria-hidden="true">
          <div className={styles.glowTop} />
          <div className={styles.glowBottom} />
        </div>
        <main className={styles.main}>
          <div className={styles.loading}>Caricamento profilo...</div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.background} aria-hidden="true">
          <div className={styles.glowTop} />
          <div className={styles.glowBottom} />
        </div>
        <main className={styles.main}>
          <Card className={styles.card}>
            <div className={styles.errorBox}>
              <strong>Errore</strong>
              <p>{error ?? "Impossibile caricare il profilo"}</p>
            </div>
            <Button href="/">Torna alla Home</Button>
          </Card>
        </main>
      </div>
    );
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
          <h1 className={styles.title}>Il tuo profilo</h1>
          <p className={styles.subtitle}>
            Gestisci i tuoi dati e completa il profilo per ottenere punti extra.
          </p>
        </header>

        {/* Email verification warning */}
        {showEmailVerificationWarning && (
          <div className={styles.warningBox} role="alert">
            <strong>⚠️ Verifica la tua email</strong>
            <p>
              Devi confermare il tuo indirizzo email prima di poter accedere a tutte le
              funzionalità della piattaforma. Controlla la tua casella di posta.
            </p>
            {verificationSent ? (
              <p className={styles.verificationSuccess}>
                ✓ Email inviata! Controlla la tua casella di posta.
              </p>
            ) : (
              <button
                className={styles.resendButton}
                onClick={handleResendVerification}
                disabled={resendingVerification}
              >
                {resendingVerification ? "Invio in corso..." : "Reinvia email di verifica"}
              </button>
            )}
            {verificationError && (
              <p className={styles.verificationError}>{verificationError}</p>
            )}
          </div>
        )}

        {/* Profile completion progress */}
        <Card className={`${styles.card} ${styles.cardFullWidth}`}>
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Completamento profilo</span>
              <span className={styles.progressValue}>{completionPercent}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className={styles.progressChecklist}>
              {completionItems.map((item) => (
                <span
                  key={item.label}
                  className={`${styles.checkItem} ${item.done ? styles.completed : ""}`}
                >
                  <span className={styles.checkIcon}>{item.done ? "✓" : "○"}</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Profile data card */}
        <Card className={styles.card}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Dati account</h2>
            <div className={styles.profileGrid}>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>ID</span>
                <span className={styles.profileItemValue}>{profile.id}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Email</span>
                <span className={styles.profileItemValue}>
                  {profile.email ?? <span className={styles.muted}>(non impostata)</span>}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Nome visualizzato</span>
                <span className={styles.profileItemValue}>
                  {profile.name ?? <span className={styles.muted}>(non impostato)</span>}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Nome proprio</span>
                <span className={styles.profileItemValue}>
                  {profile.firstName ?? <span className={styles.muted}>(non impostato)</span>}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Cognome</span>
                <span className={styles.profileItemValue}>
                  {profile.lastName ?? <span className={styles.muted}>(non impostato)</span>}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Account Google collegato</span>
                <span className={styles.profileItemValue}>
                  {profile.hasGoogleAccount ? "Sì" : "No"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Password impostata</span>
                <span className={styles.profileItemValue}>
                  {profile.hasPassword ? "Sì" : "No"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileItemLabel}>Iscritto dal</span>
                <span className={styles.profileItemValue}>
                  {new Date(profile.createdAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit profile form - shown if incomplete OR force shown */}
        {showEditProfileSection && (
          <Card className={styles.card}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Modifica profilo</h2>

              {saveSuccess && (
                <div className={styles.successBox}>
                  <strong>✓ Salvato</strong>
                  <p>Le modifiche al profilo sono state salvate con successo.</p>
                </div>
              )}

              {saveError && (
                <div className={styles.errorBox}>
                  <strong>Errore</strong>
                  <p>{saveError}</p>
                </div>
              )}

              <form className={styles.form} onSubmit={handleProfileSubmit}>
                <label className={styles.label}>
                  Nome visualizzato
                  <input
                    className={styles.input}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Come vuoi essere chiamato"
                    autoComplete="name"
                  />
                </label>

                <div className={styles.twoColumns}>
                  <label className={styles.label}>
                    Nome proprio
                    <input
                      className={styles.input}
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, firstName: e.target.value }))
                      }
                      placeholder="Mario"
                      autoComplete="given-name"
                    />
                  </label>

                  <label className={styles.label}>
                    Cognome
                    <input
                      className={styles.input}
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, lastName: e.target.value }))
                      }
                      placeholder="Rossi"
                      autoComplete="family-name"
                    />
                  </label>
                </div>

                {!isProfileComplete && (
                  <div className={styles.infoBox}>
                    <strong>💡 Punti extra</strong>
                    <p>
                      Completare nome e cognome ti fa guadagnare punti extra per il
                      completamento del profilo!
                    </p>
                  </div>
                )}

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Salvataggio..." : "Salva modifiche"}
                </button>
              </form>
            </div>
          </Card>
        )}

        {/* Set password section - only for Google OAuth users, hidden when complete unless forced */}
        {showSetPasswordSection && (
          <Card className={styles.card}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {profile.hasPassword ? "Modifica password" : "Imposta password"}
              </h2>

              {!profile.hasPassword && (
                <div className={styles.infoBox}>
                  <strong>🔐 Sicurezza account</strong>
                  <p>
                    Hai effettuato la registrazione con Google, quindi attualmente puoi
                    accedere solo tramite Google. Ti consigliamo fortemente di impostare
                    una password per:
                  </p>
                  <ul>
                    <li>Avere un metodo di accesso alternativo</li>
                    <li>Maggiore sicurezza del tuo account</li>
                    <li>Guadagnare punti extra per il completamento profilo</li>
                  </ul>
                </div>
              )}

              {passwordSuccess && (
                <div className={styles.successBox}>
                  <strong>✓ Password {profile.hasPassword ? "modificata" : "impostata"}</strong>
                  <p>
                    Ora puoi accedere sia con Google che con email e password.
                  </p>
                </div>
              )}

              {passwordErrors.length > 0 && (
                <div className={styles.errorBox}>
                  <strong>Errore</strong>
                  <ul className={styles.errorList}>
                    {passwordErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form className={styles.form} onSubmit={handlePasswordSubmit}>
                <label className={styles.label}>
                  {profile.hasPassword ? "Nuova password" : "Password"}
                  <input
                    className={`${styles.input} ${
                      passwordErrors.length > 0 ? styles.inputError : ""
                    }`}
                    type="password"
                    value={passwordData.password}
                    onChange={(e) =>
                      setPasswordData((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Minimo 8 caratteri, maiuscola, minuscola, numero"
                    autoComplete="new-password"
                  />
                </label>

                <label className={styles.label}>
                  Conferma password
                  <input
                    className={`${styles.input} ${
                      passwordErrors.length > 0 ? styles.inputError : ""
                    }`}
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                    }
                    placeholder="Ripeti la password"
                    autoComplete="new-password"
                  />
                </label>

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={passwordSaving}
                >
                  {passwordSaving
                    ? "Salvataggio..."
                    : profile.hasPassword
                      ? "Modifica password"
                      : "Imposta password"}
                </button>
              </form>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button href="/">Home</Button>
          {canShowEditButton && (
            <Button
              variant="secondary"
              onClick={() => {
                setForceShowEditProfile(true);
                if (canSetPassword) {
                  setForceShowEditPassword(true);
                }
              }}
            >
              Modifica dati
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </Button>
        </div>
      </main>
    </div>
  );
}
