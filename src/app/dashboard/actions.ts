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

export type LiveMatchEvent = {
  minute: number;
  eventType: string; // GOAL, YELLOW_CARD, RED_CARD, ASSIST, SUBSTITUTION…
  playerName: string | null;
};

export type LiveTeamMatch = {
  schoolId: string;
  schoolName: string;
  shortName: string | null;
  isHome: boolean;
  score: number;
};

export type LiveMatch = {
  id: string;
  datetime: string;
  status: string; // scheduled | live | finished
  scoreText: string | null;
  name: string | null;
  teams: LiveTeamMatch[];
  events: LiveMatchEvent[];
};

export type LiveVotedPlayer = {
  realPlayerId: string;
  name: string;
  role: string;
  vote: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  isMyStarter: boolean;
};

export type MyStarter = {
  realPlayerId: string;
  name: string;
  role: string;
  schoolId: string;
  schoolName: string;
};

export type LiveMatchdayData = {
  matchdayNumber: number;
  matchdayId: string;
  myScore: number | null;
  matches: LiveMatch[];
  myStarterIds: string[];
  myStarters: MyStarter[];
  hasLineup: boolean;
  votedPlayers: LiveVotedPlayer[];
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

  // Score ufficiale (se già calcolato)
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

  // Lineup dell'utente per questa giornata → titolari con info complete
  let myStarterIds: string[] = [];
  let myStarters: MyStarter[] = [];
  let hasLineup = false;
  if (team) {
    const lineup = await prisma.lineup.findUnique({
      where: {
        fantasyTeamId_matchdayId: {
          fantasyTeamId: team.id,
          matchdayId: matchday.id,
        },
      },
      include: {
        players: {
          where: { isStarter: true },
          include: {
            realPlayer: {
              select: {
                id: true,
                name: true,
                role: true,
                schoolId: true,
                school: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (lineup && lineup.players.length > 0) {
      hasLineup = true;
      myStarterIds = lineup.players.map((lp) => lp.realPlayer.id);
      myStarters = lineup.players.map((lp) => ({
        realPlayerId: lp.realPlayer.id,
        name: lp.realPlayer.name,
        role: lp.realPlayer.role,
        schoolId: lp.realPlayer.schoolId,
        schoolName: lp.realPlayer.school.name,
      }));
    } else {
      // Fallback: mostra tutta la rosa
      const roster = await prisma.fantasyPlayer.findMany({
        where: { fantasyTeamId: team.id },
        include: {
          realPlayer: {
            select: {
              id: true,
              name: true,
              role: true,
              schoolId: true,
              school: { select: { name: true } },
            },
          },
        },
      });
      myStarterIds = roster.map((fp) => fp.realPlayer.id);
      myStarters = roster.map((fp) => ({
        realPlayerId: fp.realPlayer.id,
        name: fp.realPlayer.name,
        role: fp.realPlayer.role,
        schoolId: fp.realPlayer.schoolId,
        schoolName: fp.realPlayer.school.name,
      }));
    }
  }

  // Match della giornata con squadre ed eventi
  const matches = await prisma.match.findMany({
    where: { matchdayId: matchday.id },
    orderBy: { datetime: "asc" },
    include: {
      teams: {
        include: {
          school: { select: { name: true, shortName: true } },
          events: {
            orderBy: { minute: "asc" },
            include: { player: { select: { name: true } } },
          },
        },
      },
    },
  });

  const liveMatches: LiveMatch[] = matches.map((m) => ({
    id: m.id,
    datetime: m.datetime.toISOString(),
    status: m.status,
    scoreText: m.scoreText,
    name: m.name,
    teams: m.teams.map((tm) => ({
      schoolId: tm.schoolId,
      schoolName: tm.school.name,
      shortName: tm.school.shortName,
      isHome: tm.isHome,
      score: tm.score,
    })),
    events: m.teams.flatMap((tm) =>
      tm.events.map((ev) => ({
        minute: ev.minute,
        eventType: ev.eventType,
        playerName: ev.player?.name ?? null,
      })),
    ).sort((a, b) => a.minute - b.minute),
  }));

  // Voti giocatori per questa giornata
  const votes = await prisma.playerVote.findMany({
    where: { matchdayId: matchday.id },
    include: { realPlayer: { select: { id: true, name: true, role: true } } },
    orderBy: { vote: "desc" },
  });

  const starterSet = new Set(myStarterIds);

  return {
    matchdayNumber: matchday.number,
    matchdayId: matchday.id,
    myScore,
    matches: liveMatches,
    myStarterIds,
    myStarters,
    hasLineup,
    votedPlayers: votes.map((v) => ({
      realPlayerId: v.realPlayer.id,
      name: v.realPlayer.name,
      role: v.realPlayer.role,
      vote: v.vote,
      goals: v.goals,
      assists: v.assists,
      yellowCards: v.yellowCards,
      redCards: v.redCards,
      isMyStarter: starterSet.has(v.realPlayer.id),
    })),
  };
}

