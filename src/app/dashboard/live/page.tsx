import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLiveMatchday } from "../actions";
import LiveClient from "./LiveClient";

export default async function LivePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const liveData = await getLiveMatchday(session.user.id);

  if (!liveData) {
    redirect("/dashboard");
  }

  return <LiveClient initial={liveData} />;
}

