"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function MeClient({ session }: { session: Session }) {
  const user = session.user;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
      <Card>
        <h1 style={{ marginBottom: 8 }}>Profilo</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Questa pagina e protetta. Se la vedi, la sessione funziona.
        </p>

        <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
          <div>
            <strong>ID:</strong> {user.id}
          </div>
          <div>
            <strong>Email:</strong> {user.email ?? "(n/a)"}
          </div>
          <div>
            <strong>Nome:</strong> {user.name ?? "(n/a)"}
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <Button href="/">Home</Button>
          <Button
            variant="secondary"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </Button>
        </div>
      </Card>
    </main>
  );
}
