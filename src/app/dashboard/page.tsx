import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard – SchoolFanta",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div style={{ padding: 40, color: "#d6dce2", background: "#0b1c2d", minHeight: "100vh" }}>
      <h1>🏆 Dashboard</h1>
      <p style={{ marginTop: 12, color: "rgba(214,220,226,0.7)" }}>
        Benvenuto, {session.user.name ?? session.user.email}!
      </p>
      <p style={{ marginTop: 8, color: "rgba(214,220,226,0.5)" }}>
        La dashboard completa arriverà presto.
      </p>
    </div>
  );
}

