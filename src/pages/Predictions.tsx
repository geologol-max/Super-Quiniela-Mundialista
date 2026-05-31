import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, setDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDeadline } from '../components/CountdownBanner';
import { Match, Prediction, PodiumPrediction } from '../types';
import { Save, AlertCircle, CheckCircle2, Trophy, Medal, Clock, RefreshCw, BarChart2, Star, Info, ChevronDown, ChevronUp, Users, Sparkles, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TEAM_FLAGS, OFFICIAL_2026_MATCHES_SEED } from '../lib/constants';
import { syncUserCompletionData } from '../lib/completionSync';


export interface KnockoutSource {
  type: 'group' | 'thirds' | 'match_winner' | 'match_loser';
  rank?: number;
  group?: string;
  index?: number;
  matchId?: string;
}

export interface KnockoutMatchConfig {
  id: string;
  phase: 'dieciseisavos' | 'octavos' | 'cuartos' | 'semifinales' | 'final' | 'tercer_lugar';
  label: string;
  dateStr: string;
  timeStr: string;
  stadium: string;
  teamASource: KnockoutSource;
  teamBSource: KnockoutSource;
}

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

function withTimeout<T>(promise: Promise<T>, ms: number = 7000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout waiting for Firestore response"));
    }, ms);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function Predictions() {
  const { user, profile } = useAuth();
  const isLocked = useDeadline();
  const [activeTab, setActiveTab] = useState<'grupos' | 'eliminatorias' | 'cuadro'>('grupos');
  const [selectedPhase, setSelectedPhase] = useState<'dieciseisavos' | 'octavos' | 'cuartos' | 'semis_final'>('dieciseisavos');
  const [selectedGroup, setSelectedGroup] = useState<string>('Grupo A');
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [podium, setPodium] = useState<PodiumPrediction>({
    userId: '',
    champion: '',
    runnerUp: '',
    third: '',
    fourth: ''
  });
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = matchesLoading || dataLoading;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Group standup state
  const GROUPS_LIST = [
    'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
    'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'
  ];

  useEffect(() => {
    // Load matches with real-time listener (no orderBy to avoid needing composite index)
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const dbMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      // Sort client-side to avoid requiring a Firestore composite index
      dbMatches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setMatches(dbMatches);
      setMatchesLoading(false);
      setLoadError(null);
    }, (error) => {
      console.error("Error loading real-time matches:", error);
      setLoadError("Error al cargar partidos: " + error.message);
      setMatchesLoading(false);
    });

    let unsubPreds: (() => void) | null = null;
    let unsubPodium: (() => void) | null = null;

    // Load user predictions & podium data in real-time
    if (user) {
      const qPred = query(collection(db, 'predictions'), where('userId', '==', user.uid));
      unsubPreds = onSnapshot(qPred, (snapshot) => {
        const predMap: Record<string, Prediction> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data() as Prediction;
          predMap[data.matchId] = data;
        });
        setPredictions(predMap);
        setDataLoading(false);
        setLoadError(null);
      }, (error) => {
        console.error("Error loading predictions in real-time:", error);
        setLoadError("Error al cargar pronósticos: " + error.message);
        setDataLoading(false);
      });

      const podiumDocRef = doc(db, 'podiums', user.uid);
      unsubPodium = onSnapshot(podiumDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setPodium(docSnap.data() as PodiumPrediction);
        } else {
          setPodium({
            userId: user.uid,
            champion: '',
            runnerUp: '',
            third: '',
            fourth: ''
          });
        }
      }, (error) => {
        console.error("Error loading podium in real-time:", error);
      });
    } else {
      setDataLoading(false);
    }

    return () => {
      unsubMatches();
      if (unsubPreds) unsubPreds();
      if (unsubPodium) unsubPodium();
    };
  }, [user]);

  // Self-heal / Seed system:
  // Seeding the 72 tournament matches atomic batch write
  const handleSeedOfficialMatches = async () => {
    setIsSeeding(true);
    try {
      // 1. Get all matches
      const querySnap = await getDocs(collection(db, 'matches'));
      const batch = writeBatch(db);
      
      // Delete old ones inside the atomic batch
      querySnap.docs.forEach(d => {
        batch.delete(doc(db, 'matches', d.id));
      });

      // 2. Add all official World Cup 2026 Matches inside the batch
      OFFICIAL_2026_MATCHES_SEED.forEach((match, idx) => {
        const matchId = `match_2026_${idx + 1}`;
        batch.set(doc(db, 'matches', matchId), match);
      });

      // Commit atomically to prevent dirty reads or vanishing lists
      await batch.commit();

      alert('¡Fase de grupos de 72 partidos del Mundial 2026 sembrada correctamente de forma atómica en la base de datos!');
    } catch (error) {
      console.error("Error seeding matches with batch:", error);
      alert('Error al sembrar el calendario: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleScoreChange = (matchId: string, team: 'A' | 'B', value: string) => {
    if (isLocked) return;
    const rawVal = value.trim();
    if (rawVal === '') {
      // Remove score prediction
      setPredictions(prev => {
        const next = { ...prev };
        if (next[matchId]) {
          next[matchId] = {
            ...next[matchId],
            [team === 'A' ? 'scoreA' : 'scoreB']: undefined as any
          };
        }
        return next;
      });
      return;
    }

    const score = parseInt(rawVal);
    if (isNaN(score) || score < 0) return;

    setPredictions(prev => {
      const current = prev[matchId] || { userId: user!.uid, matchId, scoreA: 0, scoreB: 0 };
      return {
        ...prev,
        [matchId]: {
          ...current,
          [team === 'A' ? 'scoreA' : 'scoreB']: score
        }
      };
    });
  };

  const handlePodiumChange = (field: keyof PodiumPrediction, value: string) => {
    if (isLocked) return;
    setPodium(prev => ({ ...prev, [field]: value }));
  };

  const savePrediction = async (matchId: string) => {
    if (!user) return;
    if (isLocked) {
      alert("El mundial ha comenzado. Tus pronósticos están bloqueados.");
      return;
    }
    const pred = predictions[matchId];
    if (
      !pred || 
      pred.scoreA === undefined || 
      pred.scoreB === undefined || 
      isNaN(Number(pred.scoreA)) || 
      isNaN(Number(pred.scoreB))
    ) {
      alert("Por favor ingresa un marcador numérico válido antes de guardar.");
      return;
    }

    setSaving(matchId);
    try {
      const predId = `${user.uid}_${matchId}`;
      await setDoc(doc(db, 'predictions', predId), {
        userId: user.uid,
        matchId,
        scoreA: Number(pred.scoreA),
        scoreB: Number(pred.scoreB),
        winnerId: pred.winnerId || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Sync user completion status in the background
      syncUserCompletionData(user.uid);
      
      setTimeout(() => setSaving(null), 1000);
    } catch (error) {
      console.error("Error saving single prediction:", error);
      alert("Error al guardar pronóstico: " + (error instanceof Error ? error.message : String(error)));
      setSaving(null);
    }
  };

  const saveAll = async () => {
    if (!user) return;
    if (isLocked) {
      alert("El mundial ha comenzado. Tus pronósticos están bloqueados.");
      return;
    }
    setGlobalSaving(true);
    try {
      const batch = writeBatch(db);

      // Save all match predictions that have input in the batch
      Object.entries(predictions)
        .filter(([_, pred]) => {
          return (
            pred &&
            pred.scoreA !== undefined &&
            pred.scoreB !== undefined &&
            !isNaN(Number(pred.scoreA)) &&
            !isNaN(Number(pred.scoreB))
          );
        })
        .forEach(([matchId, pred]) => {
          const predId = `${user.uid}_${matchId}`;
          const ref = doc(db, 'predictions', predId);
          batch.set(ref, {
            userId: user.uid,
            matchId,
            scoreA: Number(pred.scoreA),
            scoreB: Number(pred.scoreB),
            winnerId: pred.winnerId || null,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

      // Save Honour Podium in the batch
      const podiumRef = doc(db, 'podiums', user.uid);
      batch.set(podiumRef, {
        userId: user.uid,
        champion: podium?.champion || '',
        runnerUp: podium?.runnerUp || '',
        third: podium?.third || '',
        fourth: podium?.fourth || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await batch.commit();
      
      // Sync user completion status in the background
      syncUserCompletionData(user.uid);
      
      alert('¡Todos tus marcadores del grupo y Cuadro de Honor se guardaron correctamente!');
    } catch (error) {
      console.error("Error saving all data:", error);
      alert('Error al guardar marcadores: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setGlobalSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-sm font-bold text-slate-500">Cargando pronósticos...</p>
        {loadError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm max-w-md text-center">
            <p className="font-bold">Error de conexión</p>
            <p className="text-xs mt-1">{loadError}</p>
            <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Reintentar</button>
          </div>
        )}
      </div>
    );
  }

  if (isSeeding) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <RefreshCw className="animate-spin h-12 w-12 text-yellow-600" />
        <p className="text-lg font-black text-slate-700">Sembrando el Calendario Oficial de 72 partidos...</p>
        <p className="text-xs text-slate-400">Por favor, espera a que se complete para evitar cualquier parpadeo de datos.</p>
      </div>
    );
  }

  // Filter matches for selected group
  const groupMatches = matches.filter(m => m.group === selectedGroup);

  // Standings calculation based on:
  // 1) Finished matches scores (highest priority)
  // 2) Predicted matches scores (fallback if not finished)
  const calculateGroupStandings = () => {
    // Collect all teams in this group
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

    // Initialize
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

    // Compute matches
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

      // If we have a score, accumulate stats
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

    // Convert to sorted array
    return Object.values(standings).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const difB = b.gf - b.gc;
      const difA = a.gf - a.gc;
      if (difB !== difA) return difB - difA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
  };

  const groupStandings = calculateGroupStandings();

  const calculateAllGroupStandings = () => {
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
        return a.name.localeCompare(b.name);
      });
    });

    return allStandings;
  };

  const getThirdPlacedTeamsStats = () => {
    const groupStandingsAll = calculateAllGroupStandings();
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
      return a.group.localeCompare(b.group);
    });
  };

  const getMatchWinnerObj = (matchId: string, teamA: string, teamB: string) => {
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
  };

  const handleWinnerChange = (matchId: string, winnerId: 'A' | 'B') => {
    if (isLocked) return;
    setPredictions(prev => {
      const current = prev[matchId] || { userId: user!.uid, matchId, scoreA: 0, scoreB: 0 };
      return {
        ...prev,
        [matchId]: {
          ...current,
          winnerId
        }
      };
    });
  };

  const resolveTeamName = (
    source: any, 
    groupStandingsAll: Record<string, any[]>, 
    top8Thirds: any[]
  ): { name: string; flag: string } => {
    if (!source) return { name: 'Pendiente', flag: '🏳️' };
    
    if (source.type === 'group') {
      const teams = groupStandingsAll[source.group] || [];
      const team = teams[source.rank];
      if (team) {
        return { name: team.name, flag: TEAM_FLAGS[team.name] || '🏳️' };
      }
      return { 
        name: `${source.rank === 0 ? '1°' : '2°'} ${source.group}`, 
        flag: '🏳️' 
      };
    }
    
    if (source.type === 'thirds') {
      const team = top8Thirds[source.index];
      if (team) {
        return { name: team.name, flag: TEAM_FLAGS[team.name] || '🏳️' };
      }
      return { 
        name: `Mejor 3° #${source.index + 1}`, 
        flag: '🏳️' 
      };
    }
    
    if (source.type === 'match_winner') {
      const srcConf = KNOCKOUT_MATCHES_CONFIG.find(c => c.id === source.matchId);
      if (!srcConf) return { name: 'Ganador ' + source.matchId, flag: '🏳️' };
      const teamAObj = resolveTeamName(srcConf.teamASource, groupStandingsAll, top8Thirds);
      const teamBObj = resolveTeamName(srcConf.teamBSource, groupStandingsAll, top8Thirds);
      
      const { winner } = getMatchWinnerObj(source.matchId, teamAObj.name, teamBObj.name);
      return { 
        name: winner, 
        flag: TEAM_FLAGS[winner] || '🏳️' 
      };
    }

    if (source.type === 'match_loser') {
      const srcConf = KNOCKOUT_MATCHES_CONFIG.find(c => c.id === source.matchId);
      if (!srcConf) return { name: 'Perdedor ' + source.matchId, flag: '🏳️' };
      const teamAObj = resolveTeamName(srcConf.teamASource, groupStandingsAll, top8Thirds);
      const teamBObj = resolveTeamName(srcConf.teamBSource, groupStandingsAll, top8Thirds);
      
      const { loser } = getMatchWinnerObj(source.matchId, teamAObj.name, teamBObj.name);
      return { 
        name: loser, 
        flag: TEAM_FLAGS[loser] || '🏳️' 
      };
    }

    return { name: 'Pendiente', flag: '🏳️' };
  };

  return (
    <div className="space-y-10 pb-20">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy className="w-48 h-48" />
        </div>
        <div className="space-y-2 relative z-10">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-black px-3.5 py-1.5 rounded-full border border-indigo-500/30 tracking-widest uppercase mb-2 inline-block">
            Mundial FIFA 2026
          </span>
          <h1 className="text-4xl font-black font-display tracking-tight">Mis Pronósticos</h1>
          <p className="text-slate-300 font-sans text-sm max-w-xl">
            Registra tus marcadores para la Fase de Grupos y Cuadro de Honor. ¡Tu tabla de posiciones grupal se actualizará en tiempo real según predigas!
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
          {profile?.role === 'admin' && matches.length !== 72 && (
            <button
              onClick={handleSeedOfficialMatches}
              disabled={isSeeding}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold transition-all text-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="w-4.5 h-4.5 animate-spin-slow" />
              Sembrar Calendario ({matches.length}/72)
            </button>
          )}

          <button 
            onClick={saveAll}
            disabled={globalSaving || isLocked}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-950/20 transition-all text-base active:scale-95 disabled:opacity-50"
          >
            {globalSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Save className="w-5 h-5" />}
            Guardar Todos los Marcadores
          </button>
        </div>
      </header>

      {/* SECCIÓN DE INSTRUCCIONES Y REGLAS (COLAPSABLE) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-slate-800 font-black font-display text-sm">
            <Info className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span>📌 Guía del Juego: ¿Cómo registrar tus Pronósticos y sumar Puntos?</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              {showRules ? "Ocultar guía" : "Ver reglas, puntajes e instrucciones"}
            </span>
            {showRules ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-slate-100"
            >
              <div className="p-6 sm:p-8 space-y-6 text-slate-600 text-sm leading-relaxed">
                
                {/* GRID DE REGLAS DE PUNTUACIÓN */}
                <div className="grid gap-6 md:grid-cols-3">
                  
                  {/* CARD 1: FASE DE GRUPOS */}
                  <div className="bg-indigo-50/40 border border-indigo-100/70 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-black text-slate-800 font-display">1. Fase de Grupos</h4>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                      <li><strong className="text-indigo-900 font-extrabold">Acierto Exacto (8 Ptos):</strong> Aciertas el ganador/empate y la cantidad exacta de goles de ambos equipos.</li>
                      <li><strong className="text-indigo-900 font-extrabold">Acierto Parcial (6 Ptos):</strong> Aciertas ganador/empate y los goles de uno de los equipos.</li>
                      <li><strong className="text-indigo-900 font-extrabold">Acierto Básico (5 Ptos):</strong> Aciertas solo el ganador o empate, pero no los goles de ninguno.</li>
                    </ul>
                  </div>

                  {/* CARD 2: CUADRO DE HONOR */}
                  <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Medal className="w-5 h-5 text-amber-600" />
                      <h4 className="font-black text-slate-800 font-display">2. Cuadro de Honor</h4>
                    </div>
                    <p className="text-xs text-slate-600">
                      Pronostica en la pestaña <span className="font-bold">"Cuadro de Honor"</span> tus selecciones de medallas para el final del campeonato.
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                      <li><strong className="text-amber-800 font-bold">Campeón:</strong> +10 Ptos directos si aciertas.</li>
                      <li><strong className="text-amber-800 font-bold">Subcampeón:</strong> +10 Ptos directos.</li>
                      <li><strong className="text-amber-800 font-bold">Tercero y Cuarto:</strong> +10 Ptos cada uno.</li>
                    </ul>
                  </div>

                  {/* CARD 3: PARLEY Y NOVEDADES */}
                  <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-black text-slate-800 font-display">3. Super Parley Especial</h4>
                    </div>
                    <p className="text-xs text-slate-600">
                      ¿Crees saber de estadísticas del torneo? Completa los pronósticos estadísticos en el menú superior con el botón de la pestaña <span className="font-bold text-indigo-650">Parley</span>.
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                      <li>Preguntas como <strong className="text-emerald-800 font-bold">monto de goles totales, tarjetas, penales y goleador</strong>.</li>
                      <li>Cada pregunta del Parley acertada te dará <strong className="text-emerald-800 font-black">+10 Puntos</strong> extras.</li>
                    </ul>
                  </div>

                </div>

                {/* USER INSTRUCTION EXPLANATION */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid md:grid-cols-2 gap-6">
                  
                  {/* COL 1: CÓMO GUARDAR */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase block w-max">
                      Método de Registro
                    </span>
                    <h5 className="font-bold text-slate-800 text-xs">Puedes guardar tus pronósticos de dos maneras:</h5>
                    <ul className="list-decimal list-inside space-y-1 text-xs text-slate-500 leading-relaxed">
                      <li>Presionando <strong className="text-slate-800">"Guardar"</strong> de manera individual en cada tarjeta de partido según cambies marcadores.</li>
                      <li>Rellenando varios partidos de un grupo y presionando el gran botón flotante de abajo <strong className="text-indigo-600">"Guardar Todos Mis Pronósticos"</strong>. ¡Es súper rápido y amigable!</li>
                    </ul>
                  </div>

                  {/* COL 2: ESCALABILIDAD EN GRUPO */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase block w-max">
                      Funcionamiento Multiusuario
                    </span>
                    <h5 className="font-bold text-slate-800 text-xs">¿Cómo funciona con múltiples participantes?</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ¡Este sistema está listo para hospedar a todos tus amigos y familiares! Cada participante inicia sesión con su cuenta y registra sus propios marcadores de manera <strong className="text-slate-800">100% independiente y privada</strong>. 
                      Los puntos se calculan automáticamente de forma personalizada cuando el administrador carga los resultados reales. Puedes ver el avance de todos en la <strong className="text-indigo-600">Tabla de Posiciones (Dashboard)</strong>.
                    </p>
                  </div>

                </div>

                {/* WARNING DEADLINE */}
                <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100/50 text-rose-800 rounded-xl text-xs">
                  <Clock className="w-5 h-5 text-rose-500 flex-shrink-0 animate-pulse" />
                  <p className="font-medium">
                    <strong className="text-rose-900 font-extrabold">🚨 FECHA LÍMITE DE REGISTRO:</strong> Todos los pronósticos se cerrarán de forma automática una vez comience el primer partido del mundial. Asegúrate de guardar todo antes del inicio oficial.
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CORE TAB SWITCHER */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-lg mx-auto shadow-inner">
        <button
          onClick={() => setActiveTab('grupos')}
          className={`flex-1 py-3 text-center rounded-xl font-black transition-all text-xs sm:text-sm ${
            activeTab === 'grupos' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏆 Grupos
        </button>
        <button
          onClick={() => setActiveTab('eliminatorias')}
          className={`flex-1 py-3 text-center rounded-xl font-black transition-all text-xs sm:text-sm ${
            activeTab === 'eliminatorias' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ⚡ Playoffs
        </button>
        <button
          onClick={() => setActiveTab('cuadro')}
          className={`flex-1 py-3 text-center rounded-xl font-black transition-all text-xs sm:text-sm ${
            activeTab === 'cuadro' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏅 Podio
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'grupos' && (
          <motion.div 
            key="grupos-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* HORIZONTAL GROUP CAROUSEL */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">
                Selecciona una zona grupal para revisar resultados y clasificaciones
              </span>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x justify-start md:justify-between px-1">
                {GROUPS_LIST.map(gp => (
                  <button
                    key={gp}
                    onClick={() => setSelectedGroup(gp)}
                    className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap text-xs transition-all snap-center flex-shrink-0 border ${
                      selectedGroup === gp
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100 scale-105'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {gp}
                  </button>
                ))}
              </div>
            </div>

            {/* TWO COLUMN GRID: matches Left, standings Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* MATCH LIST (2/3 width) */}
              <div className="lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h2 className="text-xl font-black font-display text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-600 rounded-full" />
                    Encuentros de {selectedGroup}
                  </h2>
                  <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 uppercase">
                    {groupMatches.length} partidos
                  </span>
                </div>

                {groupMatches.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-5">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                    <div className="space-y-4">
                      <p className="font-bold text-slate-700 text-lg">No se han cargado encuentros para este grupo</p>
                      <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                        {profile?.role === 'admin' 
                          ? `Tu base de datos contiene ${matches.length} partidos (se necesitan exatamente 72 para el Mundial 2026). Haz clic en el botón de abajo para sembrarlos instantáneamente.`
                          : "Por favor, espera a que el administrador publique el calendario de partidos del Mundial."
                        }
                      </p>
                      {profile?.role === 'admin' && (
                        <button
                          onClick={handleSeedOfficialMatches}
                          disabled={isSeeding}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-xs active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Sembrar 72 Partidos Oficiales (Fase de Grupos)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {groupMatches.map((match) => {
                      const pred = predictions[match.id];
                      const scoreA = pred?.scoreA !== undefined ? pred.scoreA : '';
                      const scoreB = pred?.scoreB !== undefined ? pred.scoreB : '';
                      const isFinished = match.status === 'finished';
                      const formattedTime = new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " hs";

                      return (
                        <div 
                          key={match.id} 
                          className="bg-white rounded-2xl p-5 border border-slate-200 transition-all hover:shadow-md hover:border-indigo-150 relative group"
                        >
                          {/* Top Row: Time (Left) & Group name link (Right) */}
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2 mb-4">
                            <div className="font-mono text-sm font-black text-indigo-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                              {formattedTime} - {new Date(match.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                            </div>
                            <div className="text-2xs font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              {match.group}
                            </div>
                          </div>

                          {/* Main content matching image exactly */}
                          <div className="grid grid-cols-12 items-center gap-1">
                            {/* Local Flag (Left-most) */}
                            <div className="col-span-1 flex justify-start text-3xl select-none filter drop-shadow">
                              {TEAM_FLAGS[match.teamA] || '🏳️'}
                            </div>

                            {/* Text local & inputs & text visitant & Away flag */}
                            <div className="col-span-10 flex items-center justify-center gap-3">
                              {/* Local Team Name */}
                              <span className="flex-1 text-right text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                                {match.teamA}
                              </span>

                              {/* Input A */}
                              <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={scoreA}
                                disabled={isFinished || isLocked}
                                onChange={e => handleScoreChange(match.id, 'A', e.target.value)}
                                className="w-12 h-10 sm:w-16 sm:h-12 text-center text-lg sm:text-2xl font-black rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 transition-all text-slate-800 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-inner-spin-button]:margin-0"
                              />

                              <span className="text-slate-400 font-extrabold text-lg select-none">-</span>

                              {/* Input B */}
                              <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={scoreB}
                                disabled={isFinished || isLocked}
                                onChange={e => handleScoreChange(match.id, 'B', e.target.value)}
                                className="w-12 h-10 sm:w-16 sm:h-12 text-center text-lg sm:text-2xl font-black rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 transition-all text-slate-800 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-inner-spin-button]:margin-0"
                              />

                              {/* Away Team Name */}
                              <span className="flex-1 text-left text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                                {match.teamB}
                              </span>
                            </div>

                            {/* Away Flag (Right-most) */}
                            <div className="col-span-1 flex justify-end text-3xl select-none filter drop-shadow">
                              {TEAM_FLAGS[match.teamB] || '🏳️'}
                            </div>
                          </div>

                          {/* Match footer save link */}
                          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-100 text-[11px] text-slate-400">
                            <div>
                              {isFinished ? (
                                <span className="text-indigo-600 font-extrabold flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                  ● Marcador Real: {match.scoreA} - {match.scoreB}
                                </span>
                              ) : pred?.scoreA !== undefined && pred?.scoreB !== undefined ? (
                                <span className="text-emerald-700 font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  ✓ Tu pronóstico: {pred.scoreA} - {pred.scoreB}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Escribe arriba tu pronóstico</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => savePrediction(match.id)}
                                disabled={isFinished || saving === match.id || isLocked}
                                className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${
                                  (isFinished || isLocked) ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-150' :
                                  saving === match.id ? 'bg-emerald-600 text-white shadow-sm scale-95' :
                                  pred?.scoreA !== undefined && pred?.scoreB !== undefined
                                    ? 'bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white hover:shadow-md'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-transparent'
                                }`}
                              >
                                {saving === match.id ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Guardado</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Guardar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE STANDINGS PANEL (1/3 width) */}
              <div className="lg:sticky lg:top-24 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-black font-display text-slate-800">Standings en Vivo</h3>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 shadow-xl border border-slate-800 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-white flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      Tabla {selectedGroup}
                    </h4>
                    <p className="text-2xs text-slate-400 font-medium">Reacciona automáticamente cuando ingresas marcadores.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                          <th className="py-2.5 text-center">Pos</th>
                          <th className="py-2.5">País</th>
                          <th className="py-2.5 text-center px-1">PJ</th>
                          <th className="py-2.5 text-center px-1">DG</th>
                          <th className="py-2.5 text-center px-1 text-white">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {groupStandings.map((team, index) => {
                          const isTopTwo = index < 2;
                          const flag = TEAM_FLAGS[team.name] || '🏳️';
                          const dg = team.gf - team.gc;
                          const formattedDg = dg > 0 ? `+${dg}` : dg;

                          return (
                            <tr 
                              key={team.name}
                              className={`transition-colors font-sans py-2 ${
                                isTopTwo 
                                  ? 'bg-emerald-500/5' 
                                  : ''
                              }`}
                            >
                              <td className="py-3 text-center font-bold">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-2xs font-black ${
                                  isTopTwo 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-sm max-w-[100px] truncate">
                                <span className="inline-block mr-1.5 text-base filter drop-shadow-sm">{flag}</span>
                                <span className="text-2s sm:text-xs text-slate-200 uppercase font-black tracking-tight">{team.name}</span>
                              </td>
                              <td className="py-3 text-center font-bold font-mono text-slate-400 px-1">{team.pj}</td>
                              <td className={`py-3 text-center font-bold font-mono px-1 ${
                                dg > 0 ? 'text-emerald-400' : dg < 0 ? 'text-rose-400' : 'text-slate-500'
                              }`}>
                                {formattedDg}
                              </td>
                              <td className="py-3 text-center font-black font-mono text-white text-sm px-1">{team.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 text-2xs border-t border-slate-800 text-slate-400 select-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>Zonas Verdes indican clasificación a Playoffs</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-800 space-y-1">
                  <p className="font-bold">¿Cómo sumar puntos?</p>
                  <p className="text-amber-700">Ganas <span className="font-black text-slate-900">5 pts</span> por acierto de resultado (ganador o empate) y adicionalmente <span className="font-black text-slate-900">3 pts</span> por marcador exacto ó <span className="font-black text-slate-900">1 pt</span> parcial.</p>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {activeTab === 'eliminatorias' && (
          <motion.div
            key="eliminatorias-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* SELECT PLAYOFF PHASE */}
            <div className="flex flex-wrap bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm gap-2.5 justify-center">
              {[
                { id: 'dieciseisavos', label: 'Dieciseisavos de Final' },
                { id: 'octavos', label: 'Octavos de Final' },
                { id: 'cuartos', label: 'Cuartos de Final' },
                { id: 'semis_final', label: 'Semis y Finales' }
              ].map(phase => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase.id as any)}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all focus:outline-none ${
                    selectedPhase === phase.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50'
                  }`}
                >
                  {phase.label}
                </button>
              ))}
            </div>

            {/* TWO COLUMN PLAYOFF GRID */}
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              
              {/* PLAYOFF MATCHES (2/3 width) */}
              <div className="lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-black font-display text-slate-800 uppercase tracking-tight">
                      Pronósticos: {selectedPhase === 'dieciseisavos' ? 'Dieciseisavos' : selectedPhase === 'octavos' ? 'Octavos' : selectedPhase === 'cuartos' ? 'Cuartos' : 'Semifinales y Finales'}
                    </h3>
                  </div>
                  <span className="text-2xs font-extrabold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 font-mono">
                    {KNOCKOUT_MATCHES_CONFIG.filter(cfg => {
                      if (selectedPhase === 'semis_final') {
                        return cfg.phase === 'semifinales' || cfg.phase === 'tercer_lugar' || cfg.phase === 'final';
                      }
                      return cfg.phase === selectedPhase;
                    }).length} partidos
                  </span>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const groupStandingsAll = calculateAllGroupStandings();
                    const top8Thirds = getThirdPlacedTeamsStats().slice(0, 8);

                    const filteredKoConfigs = KNOCKOUT_MATCHES_CONFIG.filter(cfg => {
                      if (selectedPhase === 'semis_final') {
                        return cfg.phase === 'semifinales' || cfg.phase === 'tercer_lugar' || cfg.phase === 'final';
                      }
                      return cfg.phase === selectedPhase;
                    });

                    return filteredKoConfigs.map(cfg => {
                      const teamAObj = resolveTeamName(cfg.teamASource, groupStandingsAll, top8Thirds);
                      const teamBObj = resolveTeamName(cfg.teamBSource, groupStandingsAll, top8Thirds);
                      const pred = predictions[cfg.id] || { scoreA: undefined, scoreB: undefined };

                      return (
                        <div 
                          key={cfg.id} 
                          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md space-y-4"
                        >
                          {/* Match Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xs font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100 font-mono font-sans">
                                {cfg.label}
                              </span>
                              <span className="text-2xs font-black bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono font-sans">
                                {cfg.phase.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col sm:items-end text-3xs sm:text-2xs text-slate-400 font-bold font-sans">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                {cfg.dateStr} — {cfg.timeStr} hrs
                              </span>
                              <span className="truncate max-w-[210px]">{cfg.stadium}</span>
                            </div>
                          </div>

                          {/* Match Row */}
                          <div className="grid grid-cols-7 items-center gap-2 py-1">
                            {/* Team A */}
                            <div className="col-span-3 flex items-center justify-end gap-3 text-right">
                              <span className="text-xs sm:text-sm text-slate-700 font-extrabold max-w-[120px] truncate uppercase tracking-tight font-sans">
                                {teamAObj.name}
                              </span>
                              <span className="text-2xl sm:text-3xl filter drop-shadow-sm select-none shrink-0 font-sans">
                                {teamAObj.flag}
                              </span>
                            </div>

                            {/* Inputs */}
                            <div className="col-span-1 flex items-center justify-center gap-1 bg-slate-50 py-1.5 px-2 rounded-2xl border border-slate-100">
                              <input
                                type="tel"
                                maxLength={2}
                                disabled={isLocked}
                                value={pred.scoreA ?? ''}
                                onChange={e => handleScoreChange(cfg.id, 'A', e.target.value)}
                                className="w-9 h-9 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl text-center font-black text-base focus:outline-none focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-slate-800 disabled:opacity-50"
                                placeholder="-"
                              />
                              <span className="text-slate-350 font-black text-3xs select-none">vs</span>
                              <input
                                type="tel"
                                maxLength={2}
                                disabled={isLocked}
                                value={pred.scoreB ?? ''}
                                onChange={e => handleScoreChange(cfg.id, 'B', e.target.value)}
                                className="w-9 h-9 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl text-center font-black text-base focus:outline-none focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-slate-800 disabled:opacity-50"
                                placeholder="-"
                              />
                            </div>

                            {/* Team B */}
                            <div className="col-span-3 flex items-center justify-start gap-3">
                              <span className="text-2xl sm:text-3xl filter drop-shadow-sm select-none shrink-0 font-sans">
                                {teamBObj.flag}
                              </span>
                              <span className="text-xs sm:text-sm text-slate-700 font-extrabold max-w-[120px] truncate uppercase tracking-tight font-sans">
                                {teamBObj.name}
                              </span>
                            </div>
                          </div>

                          {/* Tiebreaker (Tie score validation) */}
                          {pred.scoreA !== undefined && pred.scoreB !== undefined && Number(pred.scoreA) === Number(pred.scoreB) && (
                            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-2xl flex flex-col items-center gap-2 text-center animate-fade-in font-sans">
                              <span className="text-2xs font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                Resultado Empatado — ¿Quién avanza a la siguiente ronda?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleWinnerChange(cfg.id, 'A')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                    (pred as any).winnerId === 'A'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200 scale-102 font-sans'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-sans'
                                  }`}
                                >
                                  <span>{teamAObj.flag}</span>
                                  <span>Avanza {teamAObj.name}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleWinnerChange(cfg.id, 'B')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                    (pred as any).winnerId === 'B'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200 scale-102 font-sans'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-sans'
                                  }`}
                                >
                                  <span>{teamBObj.flag}</span>
                                  <span>Avanza {teamBObj.name}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action footer */}
                          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 font-sans">
                            <div className="text-[11px] font-bold font-sans">
                              {pred.scoreA !== undefined && pred.scoreB !== undefined ? (
                                <span className="text-emerald-700 font-extrabold flex items-center gap-1 uppercase tracking-tight">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  Clasifica: {getMatchWinnerObj(cfg.id, teamAObj.name, teamBObj.name).winner}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Escribe arriba tu pronóstico</span>
                              )}
                            </div>
                            <button
                              onClick={() => savePrediction(cfg.id)}
                              disabled={saving === cfg.id || isLocked}
                              className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${
                                isLocked ? 'bg-slate-50 text-slate-300 font-medium cursor-not-allowed border border-slate-150' :
                                saving === cfg.id ? 'bg-emerald-600 text-white shadow-sm' :
                                pred.scoreA !== undefined && pred.scoreB !== undefined
                                  ? 'bg-slate-100 text-slate-750 hover:bg-indigo-600 hover:text-white'
                                  : 'bg-indigo-50 text-indigo-600 border border-transparent font-sans'
                              }`}
                            >
                              {saving === cfg.id ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Guardado</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Guardar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* STICKY STANDINGS PANEL (1/3 width, Best Thirds Standings) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <BarChart2 className="w-5 h-5 text-indigo-600 font-sans" />
                  <h3 className="text-lg font-black font-display text-slate-800 font-sans">Mejores Terceros</h3>
                </div>

                <div className="bg-slate-950 text-slate-100 rounded-3xl p-5 shadow-xl border border-slate-850 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-white flex items-center gap-1.5 font-sans">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      Tabla General 3°s
                    </h4>
                    <p className="text-2xs text-slate-400 font-medium font-sans">
                      Se actualiza automáticamente con tus pronósticos del grupo. Los top 8 mejores terceros avanzan de ronda.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-2xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase font-black">
                          <th className="py-2.5 text-center">Pos</th>
                          <th className="py-2.5">País</th>
                          <th className="py-2.5 text-center px-1">Pts</th>
                          <th className="py-2.5 text-center px-1">DG</th>
                          <th className="py-2.5 text-center px-1">GF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/65 font-sans">
                        {getThirdPlacedTeamsStats().map((team, idx) => {
                          const qualifies = idx < 8;
                          const flag = TEAM_FLAGS[team.name] || '🏳️';
                          const dg = team.gf - team.gc;
                          const formattedDg = dg > 0 ? `+${dg}` : dg;

                          return (
                            <tr 
                              key={team.name}
                              className={`transition-colors py-2 ${
                                qualifies ? 'bg-emerald-500/5' : 'opacity-65'
                              }`}
                            >
                              <td className="py-2.5 text-center">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                  qualifies 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 font-bold uppercase truncate max-w-[90px] font-sans">
                                <span className="inline-block mr-1.5 text-sm filter drop-shadow-sm select-none">{flag}</span>
                                <span className="text-[10px] sm:text-xs text-slate-220 tracking-tight font-sans">{team.name}</span>
                              </td>
                              <td className="py-2.5 text-center font-black font-mono text-white text-sm px-1">{team.pts}</td>
                              <td className={`py-2.5 text-center font-bold font-mono px-1 ${
                                dg > 0 ? 'text-emerald-400' : dg < 0 ? 'text-rose-400' : 'text-slate-500'
                              }`}>
                                {formattedDg}
                              </td>
                              <td className="py-2.5 text-center font-bold font-mono text-slate-400 px-1">{team.gf}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 text-2xs border-t border-slate-800 text-slate-405 select-none font-sans mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>Zonas Verdes avanzan a Dieciseisavos</span>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-850 space-y-1.5 font-sans">
                  <p className="font-extrabold flex items-center gap-1 text-indigo-900 font-sans">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Propagación Automática
                  </p>
                  <p className="text-indigo-700 leading-relaxed text-2xs text-justify">
                    El simulador determina los cruces de playoffs basándose fielmente en tus posiciones mundialistas y la tabla general de mejores terceros de la FIFA.
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {activeTab === 'cuadro' && (
          <motion.div 
            key="cuadro-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* HONOUR PODIUM SECTIONS */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 space-y-8">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black font-display text-slate-800">Cuadro de Honor Mundialista</h2>
                  <p className="text-sm text-slate-500">¿Quién levantará la copa? Elige tus 4 mejores predicciones finales.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Champion */}
                <div className="space-y-2.5 bg-yellow-50/50 p-5 rounded-2xl border border-yellow-100/70">
                  <label className="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 fill-yellow-400 text-yellow-500" />
                    CAMPEÓN
                  </label>
                  <input 
                    value={podium.champion}
                    disabled={isLocked}
                    onChange={e => handlePodiumChange('champion', e.target.value)}
                    className="w-full p-3 bg-white border border-yellow-200 rounded-xl font-black text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none focus:border-yellow-400 transition-all uppercase disabled:opacity-50"
                    placeholder="Ej. Argentina"
                  />
                </div>

                {/* Subcampeon */}
                <div className="space-y-2.5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Medal className="w-4 h-4 text-slate-400" />
                    SUBCAMPEÓN
                  </label>
                  <input 
                    value={podium.runnerUp}
                    disabled={isLocked}
                    onChange={e => handlePodiumChange('runnerUp', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-400 focus:outline-none focus:border-slate-400 transition-all uppercase disabled:opacity-50"
                    placeholder="Ej. Francia"
                  />
                </div>

                {/* Tercero */}
                <div className="space-y-2.5 bg-amber-50/40 p-5 rounded-2xl border border-amber-100">
                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Medal className="w-4 h-4 text-amber-600" />
                    TERCER LUGAR
                  </label>
                  <input 
                    value={podium.third}
                    disabled={isLocked}
                    onChange={e => handlePodiumChange('third', e.target.value)}
                    className="w-full p-3 bg-white border border-amber-200 rounded-xl font-black text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-300 focus:outline-none focus:border-amber-300 transition-all uppercase disabled:opacity-50"
                    placeholder="Ej. Brasil"
                  />
                </div>

                {/* Cuarto */}
                <div className="space-y-2.5 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Medal className="w-4 h-4 text-indigo-400" />
                    CUARTO LUGAR
                  </label>
                  <input 
                    value={podium.fourth}
                    disabled={isLocked}
                    onChange={e => handlePodiumChange('fourth', e.target.value)}
                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl font-black text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-300 focus:outline-none focus:border-indigo-300 transition-all uppercase disabled:opacity-50"
                    placeholder="Ej. Marruecos"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={saveAll}
                  disabled={globalSaving || isLocked}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Guardar Podio
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOAT SAVE CONTROL */}
      <div className="sticky bottom-6 flex justify-center pointer-events-none z-50">
        <button 
          onClick={saveAll}
          disabled={globalSaving || isLocked}
          className="pointer-events-auto flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/35 hover:bg-indigo-700 hover:shadow-indigo-500/50 transition-all active:scale-95 disabled:opacity-50"
        >
          {globalSaving ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <Save className="w-5 h-5" />}
          Guardar Todos Mis Pronósticos
        </button>
      </div>

    </div>
  );
}
