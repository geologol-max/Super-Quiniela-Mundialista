import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, getDocsFromServer, doc, setDoc, query, orderBy, deleteDoc, where, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match, UserProfile, Prediction, calculateMatchPoints, ParleyQuestion } from '../types';
import { WORLD_CUP_TEAMS, OFFICIAL_2026_MATCHES_SEED } from '../lib/constants';
import { Plus, Trash2, RefreshCw, Trophy, Users, CheckCircle, Check, Clock, Mail, BarChart2, AlertTriangle, Search, Database } from 'lucide-react';
import { 
  KNOCKOUT_MATCHES_CONFIG, 
  calculateAllGroupStandingsData, 
  getThirdPlacedTeamsStatsData, 
  resolveTeamNameData, 
  calculateKnockoutPoints, 
  resolveUserPredictionsBracket 
} from '../lib/tournament';

export function Admin() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatch, setNewMatch] = useState<Partial<Match>>({ teamA: '', teamB: '', group: '', date: '', status: 'scheduled' });
  const [isSeeding, setIsSeeding] = useState(false);
  const [parleyQuestions, setParleyQuestions] = useState<ParleyQuestion[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);

  // Parse Firestore user docs into UserProfile objects
  const parseUserDocs = (docs: any[]): UserProfile[] => {
    return docs.map((d: any) => {
      const data = d.data();
      return {
        uid: d.id,
        name: String(data.name || 'Participante'),
        email: String(data.email || 'Sin correo'),
        avatarUrl: String(data.avatarUrl || ''),
        avatarEmoji: String(data.avatarEmoji || '⚽'),
        role: String(data.role || 'participant'),
        totalPoints: typeof data.totalPoints === 'number' ? data.totalPoints : 0,
        predictionsCount: typeof data.predictionsCount === 'number' ? data.predictionsCount : 0,
        parleyCount: typeof data.parleyCount === 'number' ? data.parleyCount : 0,
        completed: !!data.completed
      } as UserProfile;
    }).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.name.localeCompare(b.name);
    });
  };

  useEffect(() => {
    fetchMatches();
    fetchParley();

    // Load users with server-first strategy
    let unsubUsers: (() => void) | null = null;
    let isMounted = true;

    async function loadUsers() {
      // STEP 1: Try server read first
      try {
        const serverSnap = await getDocsFromServer(collection(db, 'users'));
        if (!isMounted) return;
        console.log(`[Admin] ✅ Server read: ${serverSnap.docs.length} users`);
        setAllUsers(parseUserDocs(serverSnap.docs));
        setUsersError(null);
      } catch (err: any) {
        console.error('[Admin] ❌ Server read failed:', err);
        if (!isMounted) return;
        setUsersError(`Error leyendo usuarios del servidor: ${err?.code || ''} ${err?.message || err}`);
        // Fallback to cache
        try {
          const cacheSnap = await getDocs(collection(db, 'users'));
          if (!isMounted) return;
          setAllUsers(parseUserDocs(cacheSnap.docs));
        } catch (e2) { /* ignore fallback errors */ }
      }

      // STEP 2: Set up real-time listener
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!isMounted) return;
        const source = snapshot.metadata.fromCache ? 'CACHE' : 'SERVER';
        console.log(`[Admin] onSnapshot: ${snapshot.docs.length} users (${source})`);
        setAllUsers(parseUserDocs(snapshot.docs));
        if (!snapshot.metadata.fromCache) {
          setUsersError(null);
        }
      }, (error) => {
        console.error('[Admin] onSnapshot error:', error);
        if (!usersError) {
          setUsersError(`Error en listener de usuarios: ${error.code} ${error.message}`);
        }
      });
    }

    loadUsers();
    return () => { isMounted = false; if (unsubUsers) unsubUsers(); };
  }, []);

  const usersCount = allUsers.length;

  // ========== DIAGNOSTIC TOOL ==========
  const runDiagnostic = async () => {
    setRunningDiagnostic(true);
    const results: any = { timestamp: new Date().toISOString(), collections: {} };

    const testCollection = async (name: string) => {
      const entry: any = { serverCount: null, cacheCount: null, error: null, uniqueUserIds: null };
      try {
        const snap = await getDocsFromServer(collection(db, name));
        entry.serverCount = snap.docs.length;
        // For predictions/parleyAnswers, extract unique userIds
        if (name === 'predictions' || name === 'parleyAnswers') {
          const uids = new Set(snap.docs.map(d => d.data().userId).filter(Boolean));
          entry.uniqueUserIds = Array.from(uids);
        }
        if (name === 'users') {
          entry.details = snap.docs.map(d => ({ uid: d.id, name: d.data().name, email: d.data().email }));
        }
      } catch (err: any) {
        entry.error = `${err?.code || 'unknown'}: ${err?.message || String(err)}`;
        // Try cache fallback
        try {
          const cacheSnap = await getDocs(collection(db, name));
          entry.cacheCount = cacheSnap.docs.length;
        } catch (e2: any) {
          entry.cacheError = `${e2?.code || 'unknown'}: ${e2?.message || String(e2)}`;
        }
      }
      return entry;
    };

    for (const col of ['users', 'predictions', 'parleyAnswers', 'matches', 'parleyQuestions', 'podiums']) {
      results.collections[col] = await testCollection(col);
    }

    // Find orphaned users (have predictions but no user doc)
    const predUserIds = results.collections.predictions?.uniqueUserIds || [];
    const parleyUserIds = results.collections.parleyAnswers?.uniqueUserIds || [];
    const allDataUserIds = [...new Set([...predUserIds, ...parleyUserIds])];
    const existingUserIds = (results.collections.users?.details || []).map((u: any) => u.uid);
    results.orphanedUserIds = allDataUserIds.filter((uid: string) => !existingUserIds.includes(uid));
    results.totalUniqueUsers = allDataUserIds.length;

    setDiagnosticResults(results);
    setRunningDiagnostic(false);
  };

  const fetchMatches = async () => {
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    setMatches(snap.docs.map(doc => {
      const data = doc.data();
      let dateStr = '';
      if (data.date) {
        if (typeof data.date === 'string') {
          dateStr = data.date;
        } else if (typeof data.date.toDate === 'function') {
          dateStr = data.date.toDate().toISOString();
        } else if (data.date.seconds !== undefined) {
          dateStr = new Date(data.date.seconds * 1000).toISOString();
        }
      }
      return { id: doc.id, ...data, date: dateStr } as Match;
    }));
  };

  const fetchParley = async () => {
    const snap = await getDocs(collection(db, 'parleyQuestions'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ParleyQuestion));
    const order = ['favorite_team', 'top_scorer', 'top_scorer_goals', 'total_goals', 'yellow_cards', 'red_cards', 'penalty_goals', 'freekick_goals'];
    list.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a.question || '').localeCompare(String(b.question || ''));
    });
    setParleyQuestions(list);
  };

  const handleAddMatch = async () => {
    if (!newMatch.teamA || !newMatch.teamB || !newMatch.date) return;
    await addDoc(collection(db, 'matches'), {
      ...newMatch,
      status: 'scheduled',
      date: new Date(newMatch.date as string).toISOString()
    });
    setNewMatch({ teamA: '', teamB: '', group: '', date: '', status: 'scheduled' });
    fetchMatches();
  };

  const handleDeleteMatch = async (id: string) => {
    await deleteDoc(doc(db, 'matches', id));
    fetchMatches();
  };

  const finalizeMatch = async (matchId: string, scoreA: number, scoreB: number) => {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, { scoreA, scoreB, status: 'finished' });

    // 1. Fetch matches from server to compute resolved user brackets
    const matchesSnap = await getDocsFromServer(collection(db, 'matches'));
    const dbMatches = matchesSnap.docs.map(doc => {
      const data = doc.data();
      if (doc.id === matchId) {
        return { id: doc.id, ...data, scoreA, scoreB, status: 'finished' } as Match;
      }
      return { id: doc.id, ...data } as Match;
    });

    const isKnockout = matchId.startsWith('ko_');

    // 2. Fetch all predictions in one go to construct in-memory user maps (massive query optimization)
    const allPredsSnap = await getDocsFromServer(collection(db, 'predictions'));
    const predsByUser: Record<string, Record<string, Prediction>> = {};
    allPredsSnap.docs.forEach(d => {
      const data = d.data() as Prediction;
      if (!predsByUser[data.userId]) {
        predsByUser[data.userId] = {};
      }
      predsByUser[data.userId][data.matchId] = data;
    });

    // 3. Get all user predictions for this match to update
    const predsSnap = await getDocsFromServer(query(collection(db, 'predictions'), where('matchId', '==', matchId)));
    const batch = writeBatch(db);

    for (const pDoc of predsSnap.docs) {
      const pred = pDoc.data() as Prediction;
      let points = 0;

      if (isKnockout) {
        // Resolve user's theoretical matchup for this knockout match in-memory
        const userPredsMap = predsByUser[pred.userId] || {};
        const resolvedBracket = resolveUserPredictionsBracket(userPredsMap, dbMatches);
        const resolvedMatchup = resolvedBracket[matchId] || { teamA: 'Pendiente', teamB: 'Pendiente' };

        // Fetch real teams of this match
        const realMatch = dbMatches.find(m => m.id === matchId)!;

        points = calculateKnockoutPoints(
          resolvedMatchup.teamA,
          resolvedMatchup.teamB,
          pred.scoreA,
          pred.scoreB,
          realMatch.teamA,
          realMatch.teamB,
          scoreA,
          scoreB
        );
      } else {
        // Group stage match
        points = calculateMatchPoints(pred.scoreA, pred.scoreB, scoreA, scoreB);
      }

      batch.update(pDoc.ref, { points });
    }

    await batch.commit();
    await recalculateLeaderboard();
    fetchMatches();
  };

  const resolveParleyQuestion = async (id: string, correctAnswer: string) => {
    await updateDoc(doc(db, 'parleyQuestions', id), { correctAnswer });
    const answersSnap = await getDocs(query(collection(db, 'parleyAnswers'), where('questionId', '==', id)));
    for (const aDoc of answersSnap.docs) {
      const isCorrect = aDoc.data().answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      await updateDoc(aDoc.ref, { points: isCorrect ? 10 : 0 });
    }
    await recalculateLeaderboard();
    fetchParley();
  };

  const recalculateLeaderboard = async () => {
    setIsSeeding(true);
    try {
      // 1. Get all active matches and parley questions FROM SERVER (not cache)
      const matchesSnap = await getDocsFromServer(collection(db, 'matches'));
      const activeMatchIds = new Set(matchesSnap.docs.map(d => d.id));
      
      const parleyQuestionsSnap = await getDocsFromServer(collection(db, 'parleyQuestions'));
      const activeQuestionIds = new Set(parleyQuestionsSnap.docs.map(d => d.id));
      
      // 2. Get all predictions and parley answers FROM SERVER
      const predsSnap = await getDocsFromServer(collection(db, 'predictions'));
      const parleyAnswersSnap = await getDocsFromServer(collection(db, 'parleyAnswers'));
      
      // 3. Get existing users FROM SERVER
      const usersSnap = await getDocsFromServer(collection(db, 'users'));
      const existingUserIds = new Set(usersSnap.docs.map(d => d.id));
      
      // 4. Group data by userId
      const userStats: { 
        [userId: string]: { 
          points: number; 
          predsCount: number; 
          parleysCount: number; 
        } 
      } = {};
      
      // Process predictions
      predsSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const userId = data.userId;
        if (!userId) return;
        
        if (!userStats[userId]) {
          userStats[userId] = { points: 0, predsCount: 0, parleysCount: 0 };
        }
        
        const isMatchActive = activeMatchIds.has(data.matchId);
        const hasScores = data.scoreA !== undefined && data.scoreA !== null && !isNaN(Number(data.scoreA)) &&
                           data.scoreB !== undefined && data.scoreB !== null && !isNaN(Number(data.scoreB));
                           
        if (isMatchActive && hasScores) {
          userStats[userId].predsCount += 1;
        }
        
        userStats[userId].points += (data.points || 0);
      });
      
      // Process parley answers
      parleyAnswersSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const userId = data.userId;
        if (!userId) return;
        
        if (!userStats[userId]) {
          userStats[userId] = { points: 0, predsCount: 0, parleysCount: 0 };
        }
        
        const isQuestionActive = activeQuestionIds.has(data.questionId);
        const hasAnswer = data.answer !== undefined && data.answer !== null && String(data.answer).trim() !== '';
        
        if (isQuestionActive && hasAnswer) {
          userStats[userId].parleysCount += 1;
        }
        
        userStats[userId].points += (data.points || 0);
      });
      
      // 5. Update or create profiles using writeBatch for transaction safety and high performance
      const userUpdateBatch = writeBatch(db);
      let updatedCount = 0;
      let restoredCount = 0;
      const targetMatches = activeMatchIds.size || 72;
      const targetParleys = activeQuestionIds.size || 8;
      
      for (const userId of Object.keys(userStats)) {
        const stats = userStats[userId];
        const completed = stats.predsCount === targetMatches && stats.parleysCount === targetParleys;
        const userRef = doc(db, 'users', userId);
        
        if (existingUserIds.has(userId)) {
          // Update existing
          userUpdateBatch.update(userRef, {
            totalPoints: stats.points,
            predictionsCount: stats.predsCount,
            parleyCount: stats.parleysCount,
            completed: completed
          });
          updatedCount++;
        } else {
          // Restore orphaned profile
          const newProfile = {
            uid: userId,
            name: `Participante Recuperado (${userId.substring(0, 5)})`,
            email: 'Pendiente de inicio de sesión',
            role: 'participant',
            totalPoints: stats.points,
            avatarEmoji: '⚽',
            predictionsCount: stats.predsCount,
            parleyCount: stats.parleysCount,
            completed: completed
          };
          userUpdateBatch.set(userRef, newProfile);
          restoredCount++;
        }
      }
      
      // Sync users who exist in users but have no predictions/answers
      for (const uDoc of usersSnap.docs) {
        const userId = uDoc.id;
        if (!userStats[userId]) {
          userUpdateBatch.update(uDoc.ref, {
            predictionsCount: 0,
            parleyCount: 0,
            completed: false
          });
          updatedCount++;
        }
      }
      
      await userUpdateBatch.commit();
      
      // allUsers will auto-update via the onSnapshot listener
      alert(`Sincronización masiva finalizada:\n- Perfiles existentes actualizados: ${updatedCount}\n- Perfiles huérfanos creados: ${restoredCount}`);
    } catch (e) {
      console.error("Error in recalculateLeaderboard:", e);
      alert("Error al actualizar la tabla: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };


  const seedSampleMatches = async () => {
    setIsSeeding(true);
    try {
      const sampleMatches = [
        { teamA: 'Catar', teamB: 'Ecuador', group: 'Grupo A', date: '2026-06-07T15:00:00Z', status: 'scheduled' },
        { teamA: 'Inglaterra', teamB: 'Irán', group: 'Grupo B', date: '2026-06-08T13:00:00Z', status: 'scheduled' },
        { teamA: 'Senegal', teamB: 'Países Bajos', group: 'Grupo A', date: '2026-06-08T16:00:00Z', status: 'scheduled' },
        { teamA: 'EEUU', teamB: 'Gales', group: 'Grupo B', date: '2026-06-08T19:00:00Z', status: 'scheduled' },
        { teamA: 'Argentina', teamB: 'Arabia Saudita', group: 'Grupo C', date: '2026-06-09T10:00:00Z', status: 'scheduled' },
      ];
      for (const m of sampleMatches) {
        await addDoc(collection(db, 'matches'), m);
      }
      fetchMatches();
      alert('Partidos iniciales sembrados con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error al sembrar iniciales: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  const seedOfficialMatches = async () => {
    setIsSeeding(true);
    try {
      const querySnap = await getDocs(collection(db, 'matches'));
      const batch = writeBatch(db);
      
      // Delete old ones inside the atomic batch
      querySnap.docs.forEach(d => {
        batch.delete(doc(db, 'matches', d.id));
      });

      // Add all official World Cup 2026 Matches inside the batch
      OFFICIAL_2026_MATCHES_SEED.forEach((match, idx) => {
        const matchId = `match_2026_${idx + 1}`;
        batch.set(doc(db, 'matches', matchId), match);
      });

      await batch.commit();
      fetchMatches();
      alert('¡Calendario oficial de 72 partidos de la Fase de Grupos sembrado con éxito!');
    } catch (e) {
      console.error(e);
      alert('Error al sembrar partidos oficiales: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  const parseKnockoutDate = (dateStr: string, timeStr: string): string => {
    const monthMap: Record<string, string> = {
      'Junio': '06',
      'Julio': '07'
    };
    const parts = dateStr.split(' ');
    const day = parts[0].padStart(2, '0');
    const monthName = parts[2];
    const month = monthMap[monthName] || '06';
    return `2026-${month}-${day}T${timeStr}:00Z`;
  };

  const seedPlayoffMatches = async () => {
    setIsSeeding(true);
    try {
      const matchesSnap = await getDocsFromServer(collection(db, 'matches'));
      const dbMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));

      const groupStandingsAll = calculateAllGroupStandingsData(dbMatches, {});
      const top8Thirds = getThirdPlacedTeamsStatsData(dbMatches, {}).slice(0, 8);

      const realMatchesAsPredictions: Record<string, Prediction> = {};
      dbMatches.forEach(m => {
        if (m.status === 'finished' && m.scoreA !== undefined && m.scoreB !== undefined) {
          realMatchesAsPredictions[m.id] = {
            userId: 'real',
            matchId: m.id,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            winnerId: m.scoreA > m.scoreB ? 'A' : (m.scoreA < m.scoreB ? 'B' : null)
          };
        }
      });

      const batch = writeBatch(db);
      let count = 0;

      // Seed all 32 knockout matches (ko_73 to ko_104) dynamically
      KNOCKOUT_MATCHES_CONFIG.forEach(cfg => {
        const teamAObj = resolveTeamNameData(cfg.teamASource, groupStandingsAll, top8Thirds, realMatchesAsPredictions);
        const teamBObj = resolveTeamNameData(cfg.teamBSource, groupStandingsAll, top8Thirds, realMatchesAsPredictions);

        const matchDocRef = doc(db, 'matches', cfg.id);

        // Check if this match already exists and is finished — don't revert its status
        const existingMatch = dbMatches.find(m => m.id === cfg.id);
        const isAlreadyFinished = existingMatch?.status === 'finished';

        const matchData: Record<string, any> = {
          teamA: teamAObj.name,
          teamB: teamBObj.name,
          group: cfg.phase === 'dieciseisavos' ? 'Dieciseisavos' : 
                 cfg.phase === 'octavos' ? 'Octavos' :
                 cfg.phase === 'cuartos' ? 'Cuartos' :
                 cfg.phase === 'semifinales' ? 'Semifinales' :
                 cfg.phase === 'tercer_lugar' ? 'Tercer Lugar' : 'Final',
          date: parseKnockoutDate(cfg.dateStr, cfg.timeStr),
        };

        // Only set status to 'scheduled' for new or non-finalized matches
        if (!isAlreadyFinished) {
          matchData.status = 'scheduled';
        }

        batch.set(matchDocRef, matchData, { merge: true });
        count++;
      });

      await batch.commit();
      fetchMatches();
      alert(`¡Se han sembrado/actualizado los ${count} partidos de la Fase Eliminatoria reales basados en el estado actual del mundial!`);
    } catch (e) {
      console.error(e);
      alert('Error al sembrar playoffs: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500">Super Quiniela Mundialista - Centro de Control</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={runDiagnostic}
            disabled={runningDiagnostic}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-600 disabled:opacity-50 transition font-bold"
          >
            <Search className={`w-4 h-4 ${runningDiagnostic ? 'animate-spin' : ''}`} />
            Diagnóstico
          </button>
          <button 
            onClick={recalculateLeaderboard}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
            Sincronizar y Recuperar Usuarios
          </button>
          <button 
            onClick={seedPlayoffMatches}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition font-bold"
          >
            <Trophy className="w-4 h-4" />
            Sembrar Playoffs Reales
          </button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {usersError && (
        <div className="p-5 bg-red-50 border-2 border-red-300 rounded-2xl text-red-800 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-black text-red-900 text-base">⛔ Error Crítico de Base de Datos</p>
              <p className="text-sm mt-1 leading-relaxed">{usersError}</p>
              <p className="text-xs mt-3 font-bold text-red-700">→ Haz clic en "Diagnóstico" arriba para obtener un reporte detallado del estado de cada colección.</p>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC RESULTS PANEL */}
      {diagnosticResults && (
        <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black">Resultado del Diagnóstico</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">{diagnosticResults.timestamp}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(diagnosticResults.collections).map(([name, data]: [string, any]) => (
              <div key={name} className={`p-4 rounded-xl border ${
                data.error ? 'bg-red-900/30 border-red-700' : 'bg-slate-800 border-slate-700'
              }`}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{name}</div>
                {data.error ? (
                  <div>
                    <span className="text-red-400 font-bold text-lg">❌ ERROR</span>
                    <p className="text-red-300 text-xs mt-1 break-all">{data.error}</p>
                    {data.cacheCount !== null && (
                      <p className="text-amber-400 text-xs mt-1">Cache local: {data.cacheCount} docs</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-emerald-400 font-black text-2xl">{data.serverCount}</span>
                    <span className="text-slate-400 text-xs ml-1">docs (servidor)</span>
                    {data.uniqueUserIds && (
                      <p className="text-amber-300 text-xs mt-1">{data.uniqueUserIds.length} usuarios únicos</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Users detail */}
          {diagnosticResults.collections.users?.details && (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Usuarios en Firestore (directo del servidor)</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {diagnosticResults.collections.users.details.map((u: any, i: number) => (
                  <div key={u.uid} className="text-xs font-mono flex gap-4">
                    <span className="text-slate-500 w-6">{i+1}.</span>
                    <span className="text-white font-bold w-32 truncate">{u.name}</span>
                    <span className="text-slate-400 truncate">{u.email}</span>
                    <span className="text-slate-600 text-[10px]">{u.uid.substring(0, 10)}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orphaned users */}
          {diagnosticResults.orphanedUserIds?.length > 0 && (
            <div className="bg-amber-900/30 p-4 rounded-xl border border-amber-700">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                ⚠️ {diagnosticResults.orphanedUserIds.length} Usuarios Huérfanos (tienen pronósticos pero NO tienen perfil)
              </div>
              <div className="text-xs font-mono text-amber-300 space-y-1">
                {diagnosticResults.orphanedUserIds.map((uid: string) => (
                  <div key={uid}>{uid}</div>
                ))}
              </div>
              <p className="text-xs text-amber-200 mt-2 font-bold">
                → Presiona "Sincronizar y Recuperar Usuarios" para crear sus perfiles automáticamente.
              </p>
            </div>
          )}

          {diagnosticResults.orphanedUserIds?.length === 0 && diagnosticResults.collections.users?.serverCount !== null && (
            <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700 text-emerald-300 text-sm font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> Todos los usuarios con pronósticos tienen perfil creado. Total usuarios con datos: {diagnosticResults.totalUniqueUsers}
            </div>
          )}

          <button onClick={() => setDiagnosticResults(null)} className="text-xs text-slate-500 hover:text-white transition">
            Cerrar diagnóstico
          </button>
        </section>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Usuarios Registrados
          </div>
          <div className="text-2xl font-black text-indigo-600">{usersCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Partidos
          </div>
          <div className="text-2xl font-black text-indigo-600">{matches.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Completados
          </div>
          <div className="text-2xl font-black text-emerald-600">{allUsers.filter(u => u.completed).length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pendientes
          </div>
          <div className="text-2xl font-black text-amber-600">{allUsers.filter(u => !u.completed).length}</div>
        </div>
      </div>

      {/* PARTICIPANTS TABLE — Real-time view of all registered users */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-800">Participantes Inscritos (Tiempo Real)</h2>
          </div>
          <span className="text-xs font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            {allUsers.length} inscritos
          </span>
        </div>
        
        {allUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">
            No hay participantes registrados aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Participante</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider"><Mail className="w-3.5 h-3.5 inline mr-1" />Correo</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Partidos</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Parley</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-20">Pts</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Estado</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-16">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((user, index) => {
                  const predCount = user.predictionsCount || 0;
                  const parlCount = user.parleyCount || 0;
                  const isCompleted = user.completed || (predCount === 72 && parlCount === 8);
                  
                  return (
                    <tr key={user.uid} className={`hover:bg-slate-50 transition-colors ${user.role === 'admin' ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-slate-400 font-mono">{index + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <span>{user.avatarEmoji || '⚽'}</span>
                            )}
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 font-mono select-all">{user.email}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-black font-mono ${predCount === 72 ? 'text-emerald-600' : 'text-slate-600'}`}>{predCount}/72</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-black font-mono ${parlCount === 8 ? 'text-emerald-600' : 'text-slate-600'}`}>{parlCount}/8</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black text-indigo-600 font-mono">{user.totalPoints}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 stroke-[3]" /> Listo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 stroke-[3]" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>{user.role === 'admin' ? 'Admin' : 'User'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Control Tabs (Implicit) */}
      <div className="space-y-8">
        
        {/* ADD MATCH */}
        <section className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-6 h-6" /> Nuevo Encuentro</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-70">Local</label>
              <input value={newMatch.teamA} onChange={e => setNewMatch({...newMatch, teamA: e.target.value})} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg placeholder-white/40 focus:outline-none focus:bg-white/20" placeholder="Ej. Argentina" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-70">Visitante</label>
              <input value={newMatch.teamB} onChange={e => setNewMatch({...newMatch, teamB: e.target.value})} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg placeholder-white/40 focus:outline-none focus:bg-white/20" placeholder="Ej. Francia" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-70">Grupo / Fase</label>
              <input value={newMatch.group} onChange={e => setNewMatch({...newMatch, group: e.target.value})} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg placeholder-white/40 focus:outline-none focus:bg-white/20" placeholder="Ej. Grupo C" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-70">Fecha</label>
              <input type="datetime-local" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:bg-white/20" />
            </div>
          </div>
          <div className="flex gap-4 pt-2 flex-wrap">
            <button onClick={handleAddMatch} className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-bold hover:bg-slate-50 transition">Crear Partido</button>
            <button onClick={seedSampleMatches} disabled={isSeeding} className="px-6 py-2 border border-white/30 rounded-lg text-white/80 hover:bg-white/10 transition">Sembrar Iniciales</button>
            <button onClick={seedOfficialMatches} disabled={isSeeding} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition">Sembrar 72 Partidos Mundiales</button>
          </div>
        </section>

        {/* RESOLVE PARLEY */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 font-display text-slate-800"><Trophy className="w-6 h-6 text-yellow-500" /> Resultados Parley</h2>
          <div className="divide-y divide-slate-100">
            {parleyQuestions.map(q => (
              <div key={q.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{q.question}</p>
                  <p className="text-xs text-slate-400">Respuesta oficial actual: <span className="text-indigo-600 font-extrabold">{q.correctAnswer || 'Pendiente'}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {q.type === 'select' || q.id === 'favorite_team' ? (
                    <select id={`parley_${q.id}`} className="p-2 border rounded-lg text-sm w-48 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Seleccionar País --</option>
                      {WORLD_CUP_TEAMS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      placeholder={q.type === 'number' ? "Cifra numérica..." : "Resultado oficial..."} 
                      type={q.type === 'number' ? 'number' : 'text'}
                      id={`parley_${q.id}`} 
                      className="p-2 border rounded-lg text-sm w-48 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  )}
                  <button 
                    onClick={() => {
                      const val = (document.getElementById(`parley_${q.id}`) as HTMLInputElement).value;
                      if (val) resolveParleyQuestion(q.id, val);
                    }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center justify-center"
                    title="Registrar respuesta oficial"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MATCHES LIST */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-sans">Gestión de Partidos</h2>
          <div className="grid gap-4">
            {matches.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-6 hover:shadow-md transition">
                <div className="flex items-center gap-6 flex-1 w-full">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-400">{m.group}</div>
                  <div className="flex items-center gap-4 flex-1">
                    <span className="font-extrabold text-lg text-slate-900 w-24 text-right">{m.teamA}</span>
                    <span className="text-slate-300 font-black">VS</span>
                    <span className="font-extrabold text-lg text-slate-900 w-24">{m.teamB}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full lg:w-auto">
                  <div className="text-right hidden md:block">
                    {(() => {
                      const matchDate = m.date ? new Date(m.date) : null;
                      const isValidDate = matchDate && !isNaN(matchDate.getTime());
                      return (
                        <>
                          <div className="text-xs font-bold text-slate-400">
                            {isValidDate ? matchDate.toLocaleDateString() : "Pendiente"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {isValidDate ? matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pendiente"}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {m.status === 'scheduled' ? (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                      <input type="number" placeholder="Goles Local" id={`scoreA_${m.id}`} className="w-16 p-2 border-none bg-transparent text-center font-black focus:outline-none" />
                      <span className="text-slate-300">-</span>
                      <input type="number" placeholder="Goles Vis." id={`scoreB_${m.id}`} className="w-16 p-2 border-none bg-transparent text-center font-black focus:outline-none" />
                      <button 
                        onClick={() => {
                          const a = (document.getElementById(`scoreA_${m.id}`) as HTMLInputElement).value;
                          const b = (document.getElementById(`scoreB_${m.id}`) as HTMLInputElement).value;
                          if (a && b) finalizeMatch(m.id, parseInt(a), parseInt(b));
                        }}
                        className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                      >
                        Finalizar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-black text-xl border border-green-100">
                      <span>{m.scoreA}</span>
                      <span className="opacity-30">-</span>
                      <span>{m.scoreB}</span>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  <button onClick={() => handleDeleteMatch(m.id)} className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
