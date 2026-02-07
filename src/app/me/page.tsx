import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import MeClient from "./MeClient";

export default async function MePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?next=/me");
  }

  return <MeClient session={session} />;
}
