"use server";

import { prisma } from "@/lib/prisma";

/* ─── MY TEAM SUMMARY ─── */

export type TeamSummary = {
  teamId: string;
  teamName: string;
  totalPoints: number;
  globalRank: number;
  playerCount: number;
};

export async function getMyTeamSummary(userId: string): Promise<TeamSummary | null> {
  const team = await prisma.fantasyTeam.findUnique({
    where: { userId },
    include: {
      _count: { select: { players: true } },
      scores: { select: { points: true } },
    },
  });

  if (!team) return null;

  const totalPoints = team.scores.reduce((sum, s) => sum + s.points, 0);

  // Global rank: count how many teams have more points
  const allTeams = await prisma.fantasyTeam.findMany({
    include: { scores: { select: { points: true } } },
  });

  const ranked = allTeams
    .map((t) => ({
      id: t.id,
      total: t.scores.reduce((sum, s) => sum + s.points, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const globalRank = ranked.findIndex((t) => t.id === team.id) + 1;

  return {
    teamId: team.id,
    teamName: team.name,
    totalPoints,
    globalRank: globalRank || 1,
    playerCount: team._count.players,
  };
}

/* ─── ROSTER ─── */

export type RosterPlayer = {
  id: string;
  name: string;
  role: string;
  value: number;
  schoolName: string;
};

export async function getMyRoster(userId: string): Promise<RosterPlayer[]> {
  const team = await prisma.fantasyTeam.findUnique({
    where: { userId },
    include: {
      players: {
        include: {
          realPlayer: {
            include: { school: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!team) return [];

  return team.players.map((fp) => ({
    id: fp.realPlayer.id,
    name: fp.realPlayer.name,
    role: fp.realPlayer.role,
    value: fp.realPlayer.value,
    schoolName: fp.realPlayer.school.name,
  }));
}

/* ─── NEXT MATCHDAY ─── */

export type NextMatchday = {
  id: string;
  number: number;
  deadline: string; // ISO string
  status: string;
};

export async function getNextMatchday(): Promise<NextMatchday | null> {
  const matchday = await prisma.matchday.findFirst({
    where: { status: "open" },
    orderBy: { number: "asc" },
  });

  if (!matchday) return null;

  return {
    id: matchday.id,
    number: matchday.number,
    deadline: matchday.deadline.toISOString(),
    status: matchday.status,
  };
}

/* ─── HAS LIVE MATCHDAY ─── */

export async function hasLiveMatchday(): Promise<boolean> {
  const live = await prisma.matchday.findFirst({
    where: { status: "locked" },
  });
  return Boolean(live);
}

/* ─── USER LEAGUES (card list) ─── */

export type LeagueCard = {
  id: string;
  name: string;
  isGlobal: boolean;
  memberCount: number;
  userRank: number;
  userPoints: number;
};

export async function getUserLeagues(userId: string): Promise<LeagueCard[]> {

  // All leagues where user is a member
  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    include: {
      league: {
        include: {
          members: {
            include: {
              user: {
                include: {
                  fantasyTeam: {
                    include: { scores: { select: { points: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => {
    const league = m.league;

    // Compute standings for this league
    const standings = league.members
      .map((member) => {
        const ft = member.user.fantasyTeam;
        const total = ft ? ft.scores.reduce((sum, s) => sum + s.points, 0) : 0;
        return { userId: member.userId, teamId: ft?.id ?? null, total };
      })
      .sort((a, b) => b.total - a.total);

    const myEntry = standings.find((s) => s.userId === userId);

    return {
      id: league.id,
      name: league.name,
      isGlobal: league.isGlobal,
      memberCount: league.members.length,
      userRank: myEntry ? standings.indexOf(myEntry) + 1 : 0,
      userPoints: myEntry?.total ?? 0,
    };
  });
}

/* ─── LEAGUE STANDINGS (full) ─── */

export type LeagueStandingEntry = {
  rank: number;
  userId: string;
  userName: string;
  teamName: string;
  totalPoints: number;
  isCurrentUser: boolean;
};

export type LeagueDetail = {
  id: string;
  name: string;
  isGlobal: boolean;
  standings: LeagueStandingEntry[];
};

export async function getLeagueStandings(
  leagueId: string,
  currentUserId: string,
): Promise<LeagueDetail | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              fantasyTeam: {
                include: { scores: { select: { points: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!league) return null;

  const standings: LeagueStandingEntry[] = league.members
    .map((member) => {
      const ft = member.user.fantasyTeam;
      const total = ft ? ft.scores.reduce((sum, s) => sum + s.points, 0) : 0;
      return {
        rank: 0,
        userId: member.user.id,
        userName: member.user.name ?? member.user.email ?? "Anonimo",
        teamName: ft?.name ?? "—",
        totalPoints: total,
        isCurrentUser: member.user.id === currentUserId,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  return {
    id: league.id,
    name: league.name,
    isGlobal: league.isGlobal,
    standings,
  };
}

/* ─── LIVE MATCHDAY DATA ─── */

export type LiveMatchdayData = {
  matchdayNumber: number;
  matchdayId: string;
  myScore: number | null;
  votedPlayers: {
    name: string;
    role: string;
    vote: number;
    goals: number;
    assists: number;
  }[];
};

export async function getLiveMatchday(userId: string): Promise<LiveMatchdayData | null> {
  const matchday = await prisma.matchday.findFirst({
    where: { status: "locked" },
    orderBy: { number: "desc" },
  });

  if (!matchday) return null;

  const team = await prisma.fantasyTeam.findUnique({
    where: { userId },
    select: { id: true },
  });

  // Get user's score for this matchday if available
  let myScore: number | null = null;
  if (team) {
    const score = await prisma.matchdayScore.findUnique({
      where: {
        fantasyTeamId_matchdayId: {
          fantasyTeamId: team.id,
          matchdayId: matchday.id,
        },
      },
    });
    myScore = score?.points ?? null;
  }

  // Get all votes for this matchday
  const votes = await prisma.playerVote.findMany({
    where: { matchdayId: matchday.id },
    include: { realPlayer: { select: { name: true, role: true } } },
    orderBy: { vote: "desc" },
  });

  return {
    matchdayNumber: matchday.number,
    matchdayId: matchday.id,
    myScore,
    votedPlayers: votes.map((v) => ({
      name: v.realPlayer.name,
      role: v.realPlayer.role,
      vote: v.vote,
      goals: v.goals,
      assists: v.assists,
    })),
  };
}

