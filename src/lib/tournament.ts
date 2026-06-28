import { Match, Prediction, KnockoutMatchConfig, KnockoutSource } from '../types';
import { TEAM_FLAGS } from './constants';

export const KNOCKOUT_MATCHES_CONFIG: KnockoutMatchConfig[] = [
  // Dieciseisavos de final
  {
    id: 'ko_73',
    phase: 'dieciseisavos',
    label: 'Partido 73',
    dateStr: '28 de Junio',
    timeStr: '15:00',
    stadium: 'SoFi Stadium, Los Ángeles',
    teamASource: { type: 'group', rank: 0, group: 'Grupo A' },
    teamBSource: { type: 'thirds', index: 0 }
  },
  {
    id: 'ko_76',
    phase: 'dieciseisavos',
    label: 'Partido 76',
    dateStr: '29 de Junio',
    timeStr: '13:00',
    stadium: 'NRG Stadium, Houston',
    teamASource: { type: 'group', rank: 1, group: 'Grupo A' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo B' }
  },
  {
    id: 'ko_74',
    phase: 'dieciseisavos',
    label: 'Partido 74',
    dateStr: '29 de Junio',
    timeStr: '16:30',
    stadium: 'Gillette Stadium, Boston',
    teamASource: { type: 'group', rank: 0, group: 'Grupo E' },
    teamBSource: { type: 'thirds', index: 1 }
  },
  {
    id: 'ko_75',
    phase: 'dieciseisavos',
    label: 'Partido 75',
    dateStr: '29 de Junio',
    timeStr: '21:00',
    stadium: 'Estadio BBVA, Monterrey',
    teamASource: { type: 'group', rank: 0, group: 'Grupo F' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo C' }
  },
  {
    id: 'ko_78',
    phase: 'dieciseisavos',
    label: 'Partido 78',
    dateStr: '30 de Junio',
    timeStr: '13:00',
    stadium: 'AT&T Stadium, Dallas',
    teamASource: { type: 'group', rank: 1, group: 'Grupo E' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo I' }
  },
  {
    id: 'ko_77',
    phase: 'dieciseisavos',
    label: 'Partido 77',
    dateStr: '30 de Junio',
    timeStr: '17:00',
    stadium: 'MetLife Stadium, Nueva York',
    teamASource: { type: 'group', rank: 0, group: 'Grupo C' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo F' }
  },
  {
    id: 'ko_79',
    phase: 'dieciseisavos',
    label: 'Partido 79',
    dateStr: '30 de Junio',
    timeStr: '21:00',
    stadium: 'Estadio Azteca, CDMX',
    teamASource: { type: 'group', rank: 0, group: 'Grupo I' },
    teamBSource: { type: 'thirds', index: 2 }
  },
  {
    id: 'ko_80',
    phase: 'dieciseisavos',
    label: 'Partido 80',
    dateStr: '01 de Julio',
    timeStr: '12:00',
    stadium: 'Mercedes-Benz Stadium, Atlanta',
    teamASource: { type: 'group', rank: 0, group: 'Grupo H' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo J' }
  },
  {
    id: 'ko_82',
    phase: 'dieciseisavos',
    label: 'Partido 82',
    dateStr: '01 de Julio',
    timeStr: '16:00',
    stadium: 'Lumen Field, Seattle',
    teamASource: { type: 'group', rank: 0, group: 'Grupo L' },
    teamBSource: { type: 'thirds', index: 3 }
  },
  {
    id: 'ko_81',
    phase: 'dieciseisavos',
    label: 'Partido 81',
    dateStr: '01 de Julio',
    timeStr: '20:00',
    stadium: 'Levi\'s Stadium, San Francisco',
    teamASource: { type: 'group', rank: 1, group: 'Grupo D' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo G' }
  },
  {
    id: 'ko_84',
    phase: 'dieciseisavos',
    label: 'Partido 84',
    dateStr: '02 de Julio',
    timeStr: '15:00',
    stadium: 'SoFi Stadium, Los Ángeles',
    teamASource: { type: 'group', rank: 0, group: 'Grupo G' },
    teamBSource: { type: 'thirds', index: 4 }
  },
  {
    id: 'ko_83',
    phase: 'dieciseisavos',
    label: 'Partido 83',
    dateStr: '02 de Julio',
    timeStr: '19:00',
    stadium: 'BMO Field, Toronto',
    teamASource: { type: 'group', rank: 0, group: 'Grupo K' },
    teamBSource: { type: 'thirds', index: 5 }
  },
  {
    id: 'ko_85',
    phase: 'dieciseisavos',
    label: 'Partido 85',
    dateStr: '03 de Julio',
    timeStr: '23:00',
    stadium: 'BC Place, Vancouver',
    teamASource: { type: 'group', rank: 0, group: 'Grupo D' },
    teamBSource: { type: 'thirds', index: 6 }
  },
  {
    id: 'ko_88',
    phase: 'dieciseisavos',
    label: 'Partido 88',
    dateStr: '03 de Julio',
    timeStr: '14:00',
    stadium: 'AT&T Stadium, Dallas',
    teamASource: { type: 'group', rank: 1, group: 'Grupo K' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo L' }
  },
  {
    id: 'ko_86',
    phase: 'dieciseisavos',
    label: 'Partido 86',
    dateStr: '03 de Julio',
    timeStr: '18:00',
    stadium: 'Hard Rock Stadium, Miami',
    teamASource: { type: 'group', rank: 0, group: 'Grupo J' },
    teamBSource: { type: 'group', rank: 1, group: 'Grupo H' }
  },
  {
    id: 'ko_87',
    phase: 'dieciseisavos',
    label: 'Partido 87',
    dateStr: '03 de Julio',
    timeStr: '21:30',
    stadium: 'Arrowhead Stadium, Kansas City',
    teamASource: { type: 'group', rank: 0, group: 'Grupo B' },
    teamBSource: { type: 'thirds', index: 7 }
  },

  // Octavos de final
  {
    id: 'ko_89',
    phase: 'octavos',
    label: 'Octavos - P89',
    dateStr: '04 de Julio',
    timeStr: '15:00',
    stadium: 'NRG Stadium, Houston',
    teamASource: { type: 'match_winner', matchId: 'ko_73' },
    teamBSource: { type: 'match_winner', matchId: 'ko_75' }
  },
  {
    id: 'ko_90',
    phase: 'octavos',
    label: 'Octavos - P90',
    dateStr: '04 de Julio',
    timeStr: '19:00',
    stadium: 'Mercedes-Benz Stadium, Atlanta',
    teamASource: { type: 'match_winner', matchId: 'ko_74' },
    teamBSource: { type: 'match_winner', matchId: 'ko_77' }
  },
  {
    id: 'ko_91',
    phase: 'octavos',
    label: 'Octavos - P91',
    dateStr: '05 de Julio',
    timeStr: '15:00',
    stadium: 'Gillette Stadium, Boston',
    teamASource: { type: 'match_winner', matchId: 'ko_76' },
    teamBSource: { type: 'match_winner', matchId: 'ko_78' }
  },
  {
    id: 'ko_92',
    phase: 'octavos',
    label: 'Octavos - P92',
    dateStr: '05 de Julio',
    timeStr: '19:00',
    stadium: 'Estadio BBVA, Monterrey',
    teamASource: { type: 'match_winner', matchId: 'ko_79' },
    teamBSource: { type: 'match_winner', matchId: 'ko_80' }
  },
  {
    id: 'ko_93',
    phase: 'octavos',
    label: 'Octavos - P93',
    dateStr: '06 de Julio',
    timeStr: '15:00',
    stadium: 'MetLife Stadium, Nueva York',
    teamASource: { type: 'match_winner', matchId: 'ko_83' },
    teamBSource: { type: 'match_winner', matchId: 'ko_84' }
  },
  {
    id: 'ko_94',
    phase: 'octavos',
    label: 'Octavos - P94',
    dateStr: '06 de Julio',
    timeStr: '19:00',
    stadium: 'AT&T Stadium, Dallas',
    teamASource: { type: 'match_winner', matchId: 'ko_81' },
    teamBSource: { type: 'match_winner', matchId: 'ko_82' }
  },
  {
    id: 'ko_95',
    phase: 'octavos',
    label: 'Octavos - P95',
    dateStr: '07 de Julio',
    timeStr: '15:00',
    stadium: 'Hard Rock Stadium, Miami',
    teamASource: { type: 'match_winner', matchId: 'ko_86' },
    teamBSource: { type: 'match_winner', matchId: 'ko_88' }
  },
  {
    id: 'ko_96',
    phase: 'octavos',
    label: 'Octavos - P96',
    dateStr: '07 de Julio',
    timeStr: '19:00',
    stadium: 'SoFi Stadium, Los Ángeles',
    teamASource: { type: 'match_winner', matchId: 'ko_85' },
    teamBSource: { type: 'match_winner', matchId: 'ko_87' }
  },

  // Cuartos de final
  {
    id: 'ko_97',
    phase: 'cuartos',
    label: 'Cuartos - P97',
    dateStr: '09 de Julio',
    timeStr: '16:00',
    stadium: 'Gillette Stadium, Boston',
    teamASource: { type: 'match_winner', matchId: 'ko_89' },
    teamBSource: { type: 'match_winner', matchId: 'ko_90' }
  },
  {
    id: 'ko_98',
    phase: 'cuartos',
    label: 'Cuartos - P98',
    dateStr: '09 de Julio',
    timeStr: '20:00',
    stadium: 'Mercedes-Benz Stadium, Atlanta',
    teamASource: { type: 'match_winner', matchId: 'ko_91' },
    teamBSource: { type: 'match_winner', matchId: 'ko_92' }
  },
  {
    id: 'ko_99',
    phase: 'cuartos',
    label: 'Cuartos - P99',
    dateStr: '10 de Julio',
    timeStr: '20:00',
    stadium: 'Hard Rock Stadium, Miami',
    teamASource: { type: 'match_winner', matchId: 'ko_93' },
    teamBSource: { type: 'match_winner', matchId: 'ko_94' }
  },
  {
    id: 'ko_100',
    phase: 'cuartos',
    label: 'Cuartos - P100',
    dateStr: '10 de Julio',
    timeStr: '16:00',
    stadium: 'SoFi Stadium, Los Ángeles',
    teamASource: { type: 'match_winner', matchId: 'ko_95' },
    teamBSource: { type: 'match_winner', matchId: 'ko_96' }
  },

  // Semifinales
  {
    id: 'ko_101',
    phase: 'semifinales',
    label: 'Semifinal - P101',
    dateStr: '14 de Julio',
    timeStr: '20:00',
    stadium: 'AT&T Stadium, Dallas',
    teamASource: { type: 'match_winner', matchId: 'ko_97' },
    teamBSource: { type: 'match_winner', matchId: 'ko_98' }
  },
  {
    id: 'ko_102',
    phase: 'semifinales',
    label: 'Semifinal - P102',
    dateStr: '15 de Julio',
    timeStr: '20:00',
    stadium: 'Mercedes-Benz Stadium, Atlanta',
    teamASource: { type: 'match_winner', matchId: 'ko_99' },
    teamBSource: { type: 'match_winner', matchId: 'ko_100' }
  },

  // Tercer Lugar
  {
    id: 'ko_103',
    phase: 'tercer_lugar',
    label: 'Tercer Lugar',
    dateStr: '18 de Julio',
    timeStr: '16:00',
    stadium: 'Hard Rock Stadium, Miami',
    teamASource: { type: 'match_loser', matchId: 'ko_101' },
    teamBSource: { type: 'match_loser', matchId: 'ko_102' }
  },

  // Final
  {
    id: 'ko_104',
    phase: 'final',
    label: 'Gran Final',
    dateStr: '19 de Julio',
    timeStr: '16:00',
    stadium: 'MetLife Stadium, Nueva York',
    teamASource: { type: 'match_winner', matchId: 'ko_101' },
    teamBSource: { type: 'match_winner', matchId: 'ko_102' }
  }
];

export function calculateAllGroupStandingsData(matches: Match[], predictions: Record<string, Prediction>) {
  const GROUPS_LIST = [
    'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
    'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'
  ];

  const allStandings: Record<string, any[]> = {};

  GROUPS_LIST.forEach(groupName => {
    const groupMatches = matches.filter(m => m.group === groupName);
    const teamsInGroupSet = new Set<string>();
    groupMatches.forEach(m => {
      teamsInGroupSet.add(m.teamA);
      teamsInGroupSet.add(m.teamB);
    });

    const standings: Record<string, {
      name: string;
      pj: number;
      pg: number;
      pe: number;
      pp: number;
      gf: number;
      gc: number;
      pts: number;
    }> = {};

    teamsInGroupSet.forEach(teamName => {
      standings[teamName] = {
        name: teamName,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        pts: 0
      };
    });

    groupMatches.forEach(m => {
      const pred = predictions[m.id];
      const isFinished = m.status === 'finished';

      let sA: number | undefined;
      let sB: number | undefined;

      if (isFinished) {
        sA = m.scoreA;
        sB = m.scoreB;
      } else if (pred && pred.scoreA !== undefined && pred.scoreB !== undefined) {
        sA = Number(pred.scoreA);
        sB = Number(pred.scoreB);
      }

      if (sA !== undefined && sB !== undefined && standings[m.teamA] && standings[m.teamB]) {
        const teamAObj = standings[m.teamA];
        const teamBObj = standings[m.teamB];

        teamAObj.pj++;
        teamBObj.pj++;

        teamAObj.gf += sA;
        teamAObj.gc += sB;

        teamBObj.gf += sB;
        teamBObj.gc += sA;

        if (sA > sB) {
          teamAObj.pg++;
          teamAObj.pts += 3;
          teamBObj.pp++;
        } else if (sA < sB) {
          teamBObj.pg++;
          teamBObj.pts += 3;
          teamAObj.pp++;
        } else {
          teamAObj.pe++;
          teamAObj.pts += 1;
          teamBObj.pe++;
          teamBObj.pts += 1;
        }
      }
    });

    allStandings[groupName] = Object.values(standings).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const difB = b.gf - b.gc;
      const difA = a.gf - a.gc;
      if (difB !== difA) return difB - difA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return (a.name || '').localeCompare(b.name || '');
    });
  });

  return allStandings;
}

export function getThirdPlacedTeamsStatsData(matches: Match[], predictions: Record<string, Prediction>) {
  const groupStandingsAll = calculateAllGroupStandingsData(matches, predictions);
  const thirds: any[] = [];
  
  Object.entries(groupStandingsAll).forEach(([groupName, teams]) => {
    if (teams[2]) {
      thirds.push({
        ...teams[2],
        group: groupName
      });
    } else {
      thirds.push({
        name: `3° ${groupName}`,
        group: groupName,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        pts: 0
      });
    }
  });

  return thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const difB = b.gf - b.gc;
    const difA = a.gf - a.gc;
    if (difB !== difA) return difB - difA;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return (a.group || '').localeCompare(b.group || '');
  });
}

export function getMatchWinnerObj(matchId: string, teamA: string, teamB: string, predictions: Record<string, Prediction>) {
  const pred = predictions[matchId];
  if (!pred || pred.scoreA === undefined || pred.scoreB === undefined) {
    return { winner: 'Pendiente', loser: 'Pendiente', winnerTeam: null };
  }
  const sA = Number(pred.scoreA);
  const sB = Number(pred.scoreB);
  if (sA > sB) return { winner: teamA, loser: teamB, winnerTeam: 'A' };
  if (sA < sB) return { winner: teamB, loser: teamA, winnerTeam: 'B' };
  
  const winnerId = pred.winnerId;
  if (winnerId === 'A') return { winner: teamA, loser: teamB, winnerTeam: 'A' };
  if (winnerId === 'B') return { winner: teamB, loser: teamA, winnerTeam: 'B' };
  
  return { winner: teamA, loser: teamB, winnerTeam: 'A' }; // Default fallback
}

export function resolveTeamNameData(
  source: KnockoutSource, 
  groupStandingsAll: Record<string, any[]>, 
  top8Thirds: any[],
  predictions: Record<string, Prediction>
): { name: string; flag: string } {
  if (!source) return { name: 'Pendiente', flag: '🏳️' };
  
  if (source.type === 'group') {
    const teams = groupStandingsAll[source.group!] || [];
    const team = teams[source.rank!];
    if (team) {
      return { name: team.name, flag: TEAM_FLAGS[team.name] || '🏳️' };
    }
    return { 
      name: `${source.rank === 0 ? '1°' : '2°'} ${source.group}`, 
      flag: '🏳️' 
    };
  }
  
  if (source.type === 'thirds') {
    const team = top8Thirds[source.index!];
    if (team) {
      return { name: team.name, flag: TEAM_FLAGS[team.name] || '🏳️' };
    }
    return { 
      name: `Mejor 3° #${source.index! + 1}`, 
      flag: '🏳️' 
    };
  }
  
  if (source.type === 'match_winner') {
    const srcConf = KNOCKOUT_MATCHES_CONFIG.find(c => c.id === source.matchId);
    if (!srcConf) return { name: 'Ganador ' + source.matchId, flag: '🏳️' };
    const teamAObj = resolveTeamNameData(srcConf.teamASource, groupStandingsAll, top8Thirds, predictions);
    const teamBObj = resolveTeamNameData(srcConf.teamBSource, groupStandingsAll, top8Thirds, predictions);
    
    const { winner } = getMatchWinnerObj(source.matchId!, teamAObj.name, teamBObj.name, predictions);
    return { 
      name: winner, 
      flag: TEAM_FLAGS[winner] || '🏳️' 
    };
  }

  if (source.type === 'match_loser') {
    const srcConf = KNOCKOUT_MATCHES_CONFIG.find(c => c.id === source.matchId);
    if (!srcConf) return { name: 'Perdedor ' + source.matchId, flag: '🏳️' };
    const teamAObj = resolveTeamNameData(srcConf.teamASource, groupStandingsAll, top8Thirds, predictions);
    const teamBObj = resolveTeamNameData(srcConf.teamBSource, groupStandingsAll, top8Thirds, predictions);
    
    const { loser } = getMatchWinnerObj(source.matchId!, teamAObj.name, teamBObj.name, predictions);
    return { 
      name: loser, 
      flag: TEAM_FLAGS[loser] || '🏳️' // safety fallback
    };
  }

  return { name: 'Pendiente', flag: '🏳️' };
}

export function resolveUserPredictionsBracket(predictions: Record<string, Prediction>, matches: Match[]) {
  const groupStandingsAll = calculateAllGroupStandingsData(matches, predictions);
  const top8Thirds = getThirdPlacedTeamsStatsData(matches, predictions).slice(0, 8);

  const resolvedBracket: Record<string, { teamA: string; teamB: string }> = {};

  KNOCKOUT_MATCHES_CONFIG.forEach(cfg => {
    const teamA = resolveTeamNameData(cfg.teamASource, groupStandingsAll, top8Thirds, predictions);
    const teamB = resolveTeamNameData(cfg.teamBSource, groupStandingsAll, top8Thirds, predictions);
    resolvedBracket[cfg.id] = { teamA: teamA.name, teamB: teamB.name };
  });

  return resolvedBracket;
}

/**
 * Calculates points for a playoff prediction.
 * Includes matchup verification:
 * - Checks if the participant predicted the correct teams to reach this matchup.
 * - Gives +3 points per correct team (+6 max) regardless of score outcome.
 * - Gives score points (5, 6, or 8) ONLY if both teams match the real teams.
 */
export function calculateKnockoutPoints(
  predTeamA: string,
  predTeamB: string,
  predScoreA: number,
  predScoreB: number,
  realTeamA: string,
  realTeamB: string,
  realScoreA: number,
  realScoreB: number
): number {
  let points = 0;

  // 1. Classification points (+3 per correct team in the matchup)
  const isTeamACorrect = (predTeamA.toLowerCase().trim() === realTeamA.toLowerCase().trim()) || 
                          (predTeamA.toLowerCase().trim() === realTeamB.toLowerCase().trim());
  const isTeamBCorrect = (predTeamB.toLowerCase().trim() === realTeamA.toLowerCase().trim()) || 
                          (predTeamB.toLowerCase().trim() === realTeamB.toLowerCase().trim());

  if (isTeamACorrect) points += 3;
  if (isTeamBCorrect) points += 3;

  // 2. Score points (only if the exact matchup matches)
  const matchupExactMatch = (predTeamA.toLowerCase().trim() === realTeamA.toLowerCase().trim() && 
                             predTeamB.toLowerCase().trim() === realTeamB.toLowerCase().trim());
                             
  const matchupSwappedMatch = (predTeamA.toLowerCase().trim() === realTeamB.toLowerCase().trim() && 
                               predTeamB.toLowerCase().trim() === realTeamA.toLowerCase().trim());

  if (matchupExactMatch) {
    // Normal calculation
    points += getScorePointsOnly(predScoreA, predScoreB, realScoreA, realScoreB);
  } else if (matchupSwappedMatch) {
    // Calculate with swapped scores since local/visitor were flipped
    points += getScorePointsOnly(predScoreB, predScoreA, realScoreA, realScoreB);
  }

  return points;
}

function getScorePointsOnly(predA: number, predB: number, realA: number, realB: number): number {
  let points = 0;
  const predOutcome = predA > predB ? 'A' : (predA < predB ? 'B' : 'D');
  const realOutcome = realA > realB ? 'A' : (realA < realB ? 'B' : 'D');

  if (predOutcome === realOutcome) {
    points += 5; // Outcome
    if (predA === realA && predB === realB) {
      points += 3; // Exact score
    } else if (predA === realA || predB === realB) {
      points += 1; // Partial score
    }
  }
  return points;
}
