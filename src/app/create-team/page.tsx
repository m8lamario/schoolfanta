import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailablePlayers } from "./actions";
import CreateTeamClient from "./CreateTeamClient";

export const metadata: Metadata = {
  title: "Crea Squadra – SchoolFanta",
};

export default async function CreateTeamPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?next=/create-team");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hasTeam: true, budget: true },
  });

  // Se ha già una squadra, vai alla dashboard
  if (user?.hasTeam) {
    redirect("/dashboard");
  }

  const players = await getAvailablePlayers();
  const budget = user?.budget ?? 100;

  return <CreateTeamClient players={players} initialBudget={budget} />;
}

