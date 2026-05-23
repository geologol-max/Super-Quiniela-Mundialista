import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDocs, where, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDeadline } from '../components/CountdownBanner';
import { Match, Prediction, PodiumPrediction } from '../types';
import { Save, AlertCircle, CheckCircle2, Trophy, Medal, Clock, RefreshCw, BarChart2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// TEAM FLAGS EMOJI DICTIONARY
export const TEAM_FLAGS: Record<string, string> = {
  "Alemania": "🇩🇪",
  "Arabia Saudita": "🇸🇦",
  "Argelia": "🇩🇿",
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Bélgica": "🇧🇪",
  "Bosnia y Herzegovina": "🇧🇦",
  "Brasil": "🇧🇷",
  "Cabo Verde": "🇨🇻",
  "Canadá": "🇨🇦",
  "Colombia": "🇨🇴",
  "Corea del Sur": "🇰🇷",
  "Costa de Marfil": "🇨🇮",
  "Croacia": "🇭🇷",
  "Curazao": "🇨🇼",
  "Dinamarca": "🇩🇰",
  "Ecuador": "🇪🇨",
  "Egipto": "🇪🇬",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "España": "🇪🇸",
  "Estados Unidos": "🇺🇸",
  "Francia": "🇫🇷",
  "Ghana": "🇬🇭",
  "Haití": "🇭🇹",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Irak": "🇮🇶",
  "Irán": "🇮🇷",
  "Japón": "🇯🇵",
  "Jordania": "🇯🇴",
  "Marruecos": "🇲🇦",
  "México": "🇲🇽",
  "Noruega": "🇳🇴",
  "Nueva Zelanda": "🇳🇿",
  "Países Bajos": "🇳🇱",
  "Panamá": "🇵🇦",
  "Paraguay": "🇵🇾",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "República Checa": "🇨🇿",
  "República Democrática del Congo": "🇨🇩",
  "Senegal": "🇸🇳",
  "Sudáfrica": "🇿🇦",
  "Suecia": "🇸🇪",
  "Suiza": "🇨🇭",
  "Túnez": "🇹🇳",
  "Turquía": "🇹🇷",
  "Uruguay": "🇺🇾",
  "Uzbekistán": "🇺🇿"
};

// 72 Group stage matches representing 48 teams in 12 groups of 4 teams
export const OFFICIAL_2026_MATCHES_SEED = [
  // Grupo A
  { teamA: 'México', teamB: 'Sudáfrica', group: 'Grupo A', date: '2026-06-11T20:00:00Z', status: 'scheduled' },
  { teamA: 'Corea del Sur', teamB: 'República Checa', group: 'Grupo A', date: '2026-06-12T13:00:00Z', status: 'scheduled' },
  { teamA: 'República Checa', teamB: 'Sudáfrica', group: 'Grupo A', date: '2026-06-16T15:00:00Z', status: 'scheduled' },
  { teamA: 'México', teamB: 'Corea del Sur', group: 'Grupo A', date: '2026-06-16T19:00:00Z', status: 'scheduled' },
  { teamA: 'República Checa', teamB: 'México', group: 'Grupo A', date: '2026-06-20T21:00:00Z', status: 'scheduled' },
  { teamA: 'Sudáfrica', teamB: 'Corea del Sur', group: 'Grupo A', date: '2026-06-20T21:00:00Z', status: 'scheduled' },

  // Grupo B
  { teamA: 'Canadá', teamB: 'Bosnia y Herzegovina', group: 'Grupo B', date: '2026-06-12T16:00:00Z', status: 'scheduled' },
  { teamA: 'Qatar', teamB: 'Suiza', group: 'Grupo B', date: '2026-06-12T19:00:00Z', status: 'scheduled' },
  { teamA: 'Bosnia y Herzegovina', teamB: 'Qatar', group: 'Grupo B', date: '2026-06-17T13:00:00Z', status: 'scheduled' },
  { teamA: 'Canadá', teamB: 'Suiza', group: 'Grupo B', date: '2026-06-17T17:00:00Z', status: 'scheduled' },
  { teamA: 'Bosnia y Herzegovina', teamB: 'Suiza', group: 'Grupo B', date: '2026-06-21T18:00:00Z', status: 'scheduled' },
  { teamA: 'Canadá', teamB: 'Qatar', group: 'Grupo B', date: '2026-06-21T18:00:00Z', status: 'scheduled' },

  // Grupo C
  { teamA: 'Brasil', teamB: 'Marruecos', group: 'Grupo C', date: '2026-06-13T13:00:00Z', status: 'scheduled' },
  { teamA: 'Haití', teamB: 'Escocia', group: 'Grupo C', date: '2026-06-13T16:00:00Z', status: 'scheduled' },
  { teamA: 'Marruecos', teamB: 'Haití', group: 'Grupo C', date: '2026-06-18T15:00:00Z', status: 'scheduled' },
  { teamA: 'Brasil', teamB: 'Escocia', group: 'Grupo C', date: '2026-06-18T19:00:00Z', status: 'scheduled' },
  { teamA: 'Marruecos', teamB: 'Escocia', group: 'Grupo C', date: '2026-06-22T21:00:00Z', status: 'scheduled' },
  { teamA: 'Brasil', teamB: 'Haití', group: 'Grupo C', date: '2026-06-22T21:00:00Z', status: 'scheduled' },

  // Grupo D
  { teamA: 'Estados Unidos', teamB: 'Paraguay', group: 'Grupo D', date: '2026-06-12T22:00:00Z', status: 'scheduled' },
  { teamA: 'Australia', teamB: 'Turquía', group: 'Grupo D', date: '2026-06-13T19:00:00Z', status: 'scheduled' },
  { teamA: 'Paraguay', teamB: 'Australia', group: 'Grupo D', date: '2026-06-18T13:00:00Z', status: 'scheduled' },
  { teamA: 'Estados Unidos', teamB: 'Turquía', group: 'Grupo D', date: '2026-06-18T17:00:00Z', status: 'scheduled' },
  { teamA: 'Estados Unidos', teamB: 'Australia', group: 'Grupo D', date: '2026-06-22T18:00:00Z', status: 'scheduled' },
  { teamA: 'Paraguay', teamB: 'Turquía', group: 'Grupo D', date: '2026-06-22T18:00:00Z', status: 'scheduled' },

  // Grupo E
  { teamA: 'Alemania', teamB: 'Ecuador', group: 'Grupo E', date: '2026-06-14T13:00:00Z', status: 'scheduled' },
  { teamA: 'Costa de Marfil', teamB: 'Curazao', group: 'Grupo E', date: '2026-06-14T16:00:00Z', status: 'scheduled' },
  { teamA: 'Ecuador', teamB: 'Costa de Marfil', group: 'Grupo E', date: '2026-06-19T15:00:00Z', status: 'scheduled' },
  { teamA: 'Alemania', teamB: 'Curazao', group: 'Grupo E', date: '2026-06-19T19:00:00Z', status: 'scheduled' },
  { teamA: 'Ecuador', teamB: 'Curazao', group: 'Grupo E', date: '2026-06-23T21:00:00Z', status: 'scheduled' },
  { teamA: 'Alemania', teamB: 'Costa de Marfil', group: 'Grupo E', date: '2026-06-23T21:00:00Z', status: 'scheduled' },

  // Grupo F
  { teamA: 'Países Bajos', teamB: 'Japón', group: 'Grupo F', date: '2026-06-14T19:00:00Z', status: 'scheduled' },
  { teamA: 'Túnez', teamB: 'Suecia', group: 'Grupo F', date: '2026-06-15T13:00:00Z', status: 'scheduled' },
  { teamA: 'Japón', teamB: 'Túnez', group: 'Grupo F', date: '2026-06-20T13:00:00Z', status: 'scheduled' },
  { teamA: 'Países Bajos', teamB: 'Suecia', group: 'Grupo F', date: '2026-06-20T17:00:00Z', status: 'scheduled' },
  { teamA: 'Países Bajos', teamB: 'Túnez', group: 'Grupo F', date: '2026-06-24T18:00:00Z', status: 'scheduled' },
  { teamA: 'Japón', teamB: 'Suecia', group: 'Grupo F', date: '2026-06-24T18:00:00Z', status: 'scheduled' },

  // Grupo G
  { teamA: 'Bélgica', teamB: 'Egipto', group: 'Grupo G', date: '2026-06-15T16:00:00Z', status: 'scheduled' },
  { teamA: 'Irán', teamB: 'Nueva Zelanda', group: 'Grupo G', date: '2026-06-15T19:00:00Z', status: 'scheduled' },
  { teamA: 'Egipto', teamB: 'Irán', group: 'Grupo G', date: '2026-06-21T15:00:00Z', status: 'scheduled' },
  { teamA: 'Bélgica', teamB: 'Nueva Zelanda', group: 'Grupo G', date: '2026-06-21T19:00:00Z', status: 'scheduled' },
  { teamA: 'Egipto', teamB: 'Nueva Zelanda', group: 'Grupo G', date: '2026-06-25T21:00:00Z', status: 'scheduled' },
  { teamA: 'Bélgica', teamB: 'Irán', group: 'Grupo G', date: '2026-06-25T21:00:00Z', status: 'scheduled' },

  // Grupo H
  { teamA: 'España', teamB: 'Cabo Verde', group: 'Grupo H', date: '2026-06-16T13:00:00Z', status: 'scheduled' },
  { teamA: 'Arabia Saudita', teamB: 'Uruguay', group: 'Grupo H', date: '2026-06-16T16:00:00Z', status: 'scheduled' },
  { teamA: 'Cabo Verde', teamB: 'Arabia Saudita', group: 'Grupo H', date: '2026-06-22T13:00:00Z', status: 'scheduled' },
  { teamA: 'España', teamB: 'Uruguay', group: 'Grupo H', date: '2026-06-22T17:00:00Z', status: 'scheduled' },
  { teamA: 'Cabo Verde', teamB: 'Uruguay', group: 'Grupo H', date: '2026-06-26T18:00:00Z', status: 'scheduled' },
  { teamA: 'España', teamB: 'Arabia Saudita', group: 'Grupo H', date: '2026-06-26T18:00:00Z', status: 'scheduled' },

  // Grupo I
  { teamA: 'Francia', teamB: 'Senegal', group: 'Grupo I', date: '2026-06-17T13:00:00Z', status: 'scheduled' },
  { teamA: 'Irak', teamB: 'Noruega', group: 'Grupo I', date: '2026-06-17T16:00:00Z', status: 'scheduled' },
  { teamA: 'Senegal', teamB: 'Irak', group: 'Grupo I', date: '2026-06-23T13:00:00Z', status: 'scheduled' },
  { teamA: 'Francia', teamB: 'Noruega', group: 'Grupo I', date: '2026-06-23T17:00:00Z', status: 'scheduled' },
  { teamA: 'Francia', teamB: 'Irak', group: 'Grupo I', date: '2026-06-27T21:00:00Z', status: 'scheduled' },
  { teamA: 'Senegal', teamB: 'Noruega', group: 'Grupo I', date: '2026-06-27T21:00:00Z', status: 'scheduled' },

  // Grupo J
  { teamA: 'Argentina', teamB: 'Argelia', group: 'Grupo J', date: '2026-06-15T22:00:00Z', status: 'scheduled' },
  { teamA: 'Austria', teamB: 'Jordania', group: 'Grupo J', date: '2026-06-16T19:00:00Z', status: 'scheduled' },
  { teamA: 'Argelia', teamB: 'Austria', group: 'Grupo J', date: '2026-06-21T13:00:00Z', status: 'scheduled' },
  { teamA: 'Argentina', teamB: 'Jordania', group: 'Grupo J', date: '2026-06-21T17:00:00Z', status: 'scheduled' },
  { teamA: 'Argentina', teamB: 'Austria', group: 'Grupo J', date: '2026-06-25T18:00:00Z', status: 'scheduled' },
  { teamA: 'Argelia', teamB: 'Jordania', group: 'Grupo J', date: '2026-06-25T18:00:00Z', status: 'scheduled' },

  // Grupo K
  { teamA: 'Portugal', teamB: 'República Democrática del Congo', group: 'Grupo K', date: '2026-06-18T13:00:00Z', status: 'scheduled' },
  { teamA: 'Uzbekistán', teamB: 'Colombia', group: 'Grupo K', date: '2026-06-18T16:00:00Z', status: 'scheduled' },
  { teamA: 'República Democrática del Congo', teamB: 'Uzbekistán', group: 'Grupo K', date: '2026-06-24T13:00:00Z', status: 'scheduled' },
  { teamA: 'Portugal', teamB: 'Colombia', group: 'Grupo K', date: '2026-06-24T17:00:00Z', status: 'scheduled' },
  { teamA: 'Portugal', teamB: 'Uzbekistán', group: 'Grupo K', date: '2026-06-28T18:00:00Z', status: 'scheduled' },
  { teamA: 'República Democrática del Congo', teamB: 'Colombia', group: 'Grupo K', date: '2026-06-28T18:00:00Z', status: 'scheduled' },

  // Grupo L
  { teamA: 'Inglaterra', teamB: 'Croacia', group: 'Grupo L', date: '2026-06-19T13:00:00Z', status: 'scheduled' },
  { teamA: 'Ghana', teamB: 'Panamá', group: 'Grupo L', date: '2026-06-19T16:00:00Z', status: 'scheduled' },
  { teamA: 'Croacia', teamB: 'Ghana', group: 'Grupo L', date: '2026-06-25T13:00:00Z', status: 'scheduled' },
  { teamA: 'Inglaterra', teamB: 'Panamá', group: 'Grupo L', date: '2026-06-25T17:00:00Z', status: 'scheduled' },
  { teamA: 'Inglaterra', teamB: 'Ghana', group: 'Grupo L', date: '2026-06-29T21:00:00Z', status: 'scheduled' },
  { teamA: 'Croacia', teamB: 'Panamá', group: 'Grupo L', date: '2026-06-29T21:00:00Z', status: 'scheduled' }
];

export function Predictions() {
  const { user } = useAuth();
  const isLocked = useDeadline();
  const [activeTab, setActiveTab] = useState<'grupos' | 'cuadro'>('grupos');
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Group standup state
  const GROUPS_LIST = [
    'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
    'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'
  ];

  useEffect(() => {
    // Load matches with real-time listener
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const unsubMatches = onSnapshot(q, (snapshot) => {
      const dbMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(dbMatches);
    });

    // Load user predictions & podium data
    if (user) {
      const loadData = async () => {
        try {
          const qPred = query(collection(db, 'predictions'), where('userId', '==', user.uid));
          const predSnap = await getDocs(qPred);
          const predMap: Record<string, Prediction> = {};
          predSnap.docs.forEach(doc => {
            const data = doc.data() as Prediction;
            predMap[data.matchId] = data;
          });
          setPredictions(predMap);

          const podiumSnap = await getDoc(doc(db, 'podiums', user.uid));
          if (podiumSnap.exists()) {
            setPodium(podiumSnap.data() as PodiumPrediction);
          } else {
            setPodium(prev => ({ ...prev, userId: user.uid }));
          }
        } catch (error) {
          console.error("Error loading predictions/podium:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else {
      setLoading(false);
    }

    return () => unsubMatches();
  }, [user]);

  // Self-heal / Seed system:
  // If the admin/system loaded matches list is completely empty or mismatching, we seed the correct 72 tournament matches
  const handleSeedOfficialMatches = async () => {
    setIsSeeding(true);
    try {
      // 1. Delete any old matches
      const querySnap = await getDocs(collection(db, 'matches'));
      for (const d of querySnap.docs) {
        // True deletion instead of empty objects
        await deleteDoc(doc(db, 'matches', d.id));
      }

      // 2. Add all official World Cup 2026 Matches
      const promises = OFFICIAL_2026_MATCHES_SEED.map((match, idx) => {
        const matchId = `match_2026_${idx + 1}`;
        return setDoc(doc(db, 'matches', matchId), match);
      });
      await Promise.all(promises);
      alert('¡Calendario Oficial de 72 partidos de Fase de Grupos sembrado correctamente en la base de datos!');
    } catch (error) {
      console.error("Error seeding matches:", error);
      alert('Error al sembrar el calendario.');
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
        updatedAt: new Date().toISOString()
      }, { merge: true });
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
      // Save all match predictions that have input
      const promises = Object.entries(predictions)
        .filter(([_, pred]) => {
          return (
            pred &&
            pred.scoreA !== undefined &&
            pred.scoreB !== undefined &&
            !isNaN(Number(pred.scoreA)) &&
            !isNaN(Number(pred.scoreB))
          );
        })
        .map(([matchId, pred]) => {
          const predId = `${user.uid}_${matchId}`;
          return setDoc(doc(db, 'predictions', predId), {
            userId: user.uid,
            matchId,
            scoreA: Number(pred.scoreA),
            scoreB: Number(pred.scoreB),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

      // Save Honour Podium
      promises.push(setDoc(doc(db, 'podiums', user.uid), {
        userId: user.uid,
        champion: podium?.champion || '',
        runnerUp: podium?.runnerUp || '',
        third: podium?.third || '',
        fourth: podium?.fourth || '',
        updatedAt: new Date().toISOString()
      }, { merge: true }));

      await Promise.all(promises);
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
        sA = pred.scoreA;
        sB = pred.scoreB;
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
          {matches.length === 0 && (
            <button
              onClick={handleSeedOfficialMatches}
              disabled={isSeeding}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-2xl font-bold transition-all text-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="w-4.5 h-4.5 animate-spin-slow" />
              Sembrar Calendario 2026
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

      {/* CORE TAB SWITCHER */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md mx-auto shadow-inner">
        <button
          onClick={() => setActiveTab('grupos')}
          className={`flex-1 py-3 text-center rounded-xl font-black transition-all text-sm ${
            activeTab === 'grupos' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏆 Fase de Grupos
        </button>
        <button
          onClick={() => setActiveTab('cuadro')}
          className={`flex-1 py-3 text-center rounded-xl font-black transition-all text-sm ${
            activeTab === 'cuadro' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏅 Cuadro de Honor
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'grupos' ? (
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
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
                    <div>
                      <p className="font-bold text-slate-700 text-lg">No se han cargado encuentros para este grupo</p>
                      <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">Siembre el fixture de 72 partidos del mundial 2026 usando el botón en la cabecera.</p>
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
        ) : (
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
