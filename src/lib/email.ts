import { resend, EMAIL_FROM, getBaseUrl } from "./resend";

type SendEmailResult = { success: true; id: string } | { success: false; error: string };

/**
 * Invia email di verifica dell'indirizzo email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userName?: string | null
): Promise<SendEmailResult> {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const greeting = userName ? `Ciao ${userName}` : "Ciao";

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Verifica il tuo indirizzo email - SchoolFanta",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1c2d;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1c2d; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: rgba(9, 20, 34, 0.95); border-radius: 20px; border: 1px solid rgba(110, 164, 255, 0.18); padding: 40px;">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <h1 style="margin: 0; font-size: 28px; color: #d6dce2;">SchoolFanta</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #d6dce2; font-size: 16px; line-height: 1.6;">
                      <p style="margin: 0 0 16px;">${greeting},</p>
                      <p style="margin: 0 0 24px;">Grazie per esserti registrato su SchoolFanta! Per completare la registrazione e attivare il tuo account, verifica il tuo indirizzo email cliccando il pulsante qui sotto.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 24px 0;">
                      <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6ea4ff, #9b6bff); color: #071120; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 999px;">
                        Verifica email
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: rgba(214, 220, 226, 0.7); font-size: 13px; line-height: 1.6;">
                      <p style="margin: 0 0 12px;">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
                      <p style="margin: 0; word-break: break-all;">
                        <a href="${verifyUrl}" style="color: #6ea4ff;">${verifyUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 32px; border-top: 1px solid rgba(214, 220, 226, 0.15); margin-top: 32px;">
                      <p style="margin: 0; color: rgba(214, 220, 226, 0.5); font-size: 12px; text-align: center;">
                        Questo link scade tra 24 ore.<br>
                        Se non hai creato un account su SchoolFanta, ignora questa email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `${greeting},

Grazie per esserti registrato su SchoolFanta!

Per completare la registrazione e attivare il tuo account, verifica il tuo indirizzo email visitando questo link:

${verifyUrl}

Questo link scade tra 24 ore.

Se non hai creato un account su SchoolFanta, ignora questa email.

---
SchoolFanta`,
    });

    if (error) {
      console.error("[email] sendVerificationEmail error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id ?? "unknown" };
  } catch (err) {
    console.error("[email] sendVerificationEmail exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Errore invio email" };
  }
}

/**
 * Invia email di benvenuto dopo la verifica
 */
export async function sendWelcomeEmail(
  email: string,
  userName?: string | null
): Promise<SendEmailResult> {
  const baseUrl = getBaseUrl();
  const greeting = userName ? `Ciao ${userName}` : "Ciao";

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Benvenuto su SchoolFanta! 🎉",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1c2d;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1c2d; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: rgba(9, 20, 34, 0.95); border-radius: 20px; border: 1px solid rgba(110, 164, 255, 0.18); padding: 40px;">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <h1 style="margin: 0; font-size: 28px; color: #d6dce2;">🎉 Benvenuto!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #d6dce2; font-size: 16px; line-height: 1.6;">
                      <p style="margin: 0 0 16px;">${greeting},</p>
                      <p style="margin: 0 0 16px;">Il tuo account SchoolFanta è stato verificato con successo!</p>
                      <p style="margin: 0 0 24px;">Ora puoi accedere a tutte le funzionalità della piattaforma:</p>
                      <ul style="margin: 0 0 24px; padding-left: 20px; color: rgba(214, 220, 226, 0.9);">
                        <li style="margin-bottom: 8px;">Crea la tua squadra</li>
                        <li style="margin-bottom: 8px;">Partecipa alle leghe</li>
                        <li style="margin-bottom: 8px;">Sfida i tuoi amici</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 24px 0;">
                      <a href="${baseUrl}/me" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6ea4ff, #9b6bff); color: #071120; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 999px;">
                        Vai al tuo profilo
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 32px; border-top: 1px solid rgba(214, 220, 226, 0.15);">
                      <p style="margin: 0; color: rgba(214, 220, 226, 0.5); font-size: 12px; text-align: center;">
                        SchoolFanta - Il fantacalcio della scuola
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `${greeting},

Il tuo account SchoolFanta è stato verificato con successo!

Ora puoi accedere a tutte le funzionalità della piattaforma:
- Crea la tua squadra
- Partecipa alle leghe
- Sfida i tuoi amici

Vai al tuo profilo: ${baseUrl}/me

---
SchoolFanta - Il fantacalcio della scuola`,
    });

    if (error) {
      console.error("[email] sendWelcomeEmail error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id ?? "unknown" };
  } catch (err) {
    console.error("[email] sendWelcomeEmail exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Errore invio email" };
  }
}

/**
 * Invia email per reset password
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  userName?: string | null
): Promise<SendEmailResult> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const greeting = userName ? `Ciao ${userName}` : "Ciao";

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Reimposta la tua password - SchoolFanta",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1c2d;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1c2d; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: rgba(9, 20, 34, 0.95); border-radius: 20px; border: 1px solid rgba(110, 164, 255, 0.18); padding: 40px;">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <h1 style="margin: 0; font-size: 28px; color: #d6dce2;">SchoolFanta</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #d6dce2; font-size: 16px; line-height: 1.6;">
                      <p style="margin: 0 0 16px;">${greeting},</p>
                      <p style="margin: 0 0 24px;">Hai richiesto di reimpostare la password del tuo account SchoolFanta. Clicca il pulsante qui sotto per scegliere una nuova password.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 24px 0;">
                      <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6ea4ff, #9b6bff); color: #071120; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 999px;">
                        Reimposta password
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: rgba(214, 220, 226, 0.7); font-size: 13px; line-height: 1.6;">
                      <p style="margin: 0 0 12px;">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
                      <p style="margin: 0; word-break: break-all;">
                        <a href="${resetUrl}" style="color: #6ea4ff;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 32px; border-top: 1px solid rgba(214, 220, 226, 0.15); margin-top: 32px;">
                      <p style="margin: 0; color: rgba(214, 220, 226, 0.5); font-size: 12px; text-align: center;">
                        Questo link scade tra 1 ora.<br>
                        Se non hai richiesto il reset della password, ignora questa email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `${greeting},

Hai richiesto di reimpostare la password del tuo account SchoolFanta.

Clicca questo link per scegliere una nuova password:
${resetUrl}

Questo link scade tra 1 ora.

Se non hai richiesto il reset della password, ignora questa email.

---
SchoolFanta`,
    });

    if (error) {
      console.error("[email] sendPasswordResetEmail error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id ?? "unknown" };
  } catch (err) {
    console.error("[email] sendPasswordResetEmail exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Errore invio email" };
  }
}

/**
 * Invia email di verifica per il cambio email
 */
export async function sendEmailChangeVerification(
  newEmail: string,
  token: string,
  userName?: string | null
): Promise<SendEmailResult> {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/api/me/email/verify?token=${encodeURIComponent(token)}`;

  const greeting = userName ? `Ciao ${userName}` : "Ciao";

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: newEmail,
      subject: "Conferma il cambio email - SchoolFanta",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1c2d;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1c2d; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: rgba(9, 20, 34, 0.95); border-radius: 20px; border: 1px solid rgba(110, 164, 255, 0.18); padding: 40px;">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <h1 style="margin: 0; font-size: 28px; color: #d6dce2;">SchoolFanta</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #d6dce2; font-size: 16px; line-height: 1.6;">
                      <p style="margin: 0 0 16px;">${greeting},</p>
                      <p style="margin: 0 0 24px;">Hai richiesto di cambiare l'indirizzo email del tuo account SchoolFanta. Per confermare che questo indirizzo ti appartiene, clicca il pulsante qui sotto.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 24px 0;">
                      <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6ea4ff, #9b6bff); color: #071120; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 999px;">
                        Conferma nuova email
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: rgba(214, 220, 226, 0.7); font-size: 13px; line-height: 1.6;">
                      <p style="margin: 0 0 12px;">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
                      <p style="margin: 0; word-break: break-all;">
                        <a href="${verifyUrl}" style="color: #6ea4ff;">${verifyUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 32px; border-top: 1px solid rgba(214, 220, 226, 0.15); margin-top: 32px;">
                      <p style="margin: 0; color: rgba(214, 220, 226, 0.5); font-size: 12px; text-align: center;">
                        Questo link scade tra 24 ore.<br>
                        Se non hai richiesto il cambio email, ignora questa email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `${greeting},

Hai richiesto di cambiare l'indirizzo email del tuo account SchoolFanta.

Per confermare che questo indirizzo ti appartiene, clicca questo link:
${verifyUrl}

Questo link scade tra 24 ore.

Se non hai richiesto il cambio email, ignora questa email.

---
SchoolFanta`,
    });

    if (error) {
      console.error("[email] sendEmailChangeVerification error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id ?? "unknown" };
  } catch (err) {
    console.error("[email] sendEmailChangeVerification exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Errore invio email" };
  }
}
