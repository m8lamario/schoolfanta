import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import MeClientView from "@/app/me/MeClientView";

export default async function DashboardMePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/me");
  }

  return <MeClientView session={session} />;
}

