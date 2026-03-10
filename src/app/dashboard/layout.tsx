import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { hasLiveMatchday } from "./actions";
import BottomNav from "@/components/dashboard/BottomNav";

export const metadata: Metadata = {
  title: "Dashboard – SchoolFanta",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const hasLive = await hasLiveMatchday();

  return (
    <div style={{ minHeight: "100vh", background: "#0b1c2d", color: "#d6dce2" }}>
      <main>{children}</main>
      <BottomNav hasLiveMatch={hasLive} />
    </div>
  );
}

