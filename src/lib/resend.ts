import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[resend] RESEND_API_KEY non configurata - le email non verranno inviate");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email mittente - usa il dominio verificato su Resend o l'email di test
export const EMAIL_FROM = process.env.EMAIL_FROM || "SchoolFanta <onboarding@resend.dev>";

// Base URL dell'app per i link nelle email
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

