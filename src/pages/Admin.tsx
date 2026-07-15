import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, getDocsFromServer, doc, setDoc, query, orderBy, deleteDoc, where, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match, UserProfile, Prediction, calculateMatchPoints, ParleyQuestion } from '../types';
import { WORLD_CUP_TEAMS, OFFICIAL_2026_MATCHES_SEED } from '../lib/constants';
import { Plus, Trash2, RefreshCw, Trophy, Users, CheckCircle, Check, Clock, Mail, BarChart2, AlertTriangle, Search, Database, Edit2 } from 'lucide-react';
import { 
  KNOCKOUT_MATCHES_CONFIG, 
  calculateAllGroupStandingsData, 
  getThirdPlacedTeamsStatsData, 
  resolveTeamNameData, 
  calculateKnockoutPoints, 
  resolveUserPredictionsBracket,
  calculateAllKnockoutPointsForUser
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
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

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
        if (name === 'matches') {
          const existingIds = new Set(snap.docs.map(d => d.id));
          const missing: any[] = [];
          OFFICIAL_2026_MATCHES_SEED.forEach((match, idx) => {
            const matchId = `match_2026_${idx + 1}`;
            if (!existingIds.has(matchId)) {
              missing.push({ id: matchId, ...match });
            }
          });
          entry.missingGroupMatches = missing;
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

  const restoreMissingGroupMatches = async (missing: any[]) => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      missing.forEach(m => {
        const { id, ...matchData } = m;
        batch.set(doc(db, 'matches', id), matchData);
      });
      await batch.commit();
      fetchMatches();
      alert(`¡Se han restaurado los ${missing.length} partidos de fase de grupos faltantes con éxito!`);
      // Re-run diagnostic to update the view
      runDiagnostic();
    } catch (e) {
      console.error(e);
      alert('Error al restaurar los partidos: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  const resetMatch = async (matchId: string) => {
    setIsSeeding(true);
    try {
      const { deleteField } = await import('firebase/firestore');
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, { 
        scoreA: deleteField(), 
        scoreB: deleteField(), 
        status: 'scheduled' 
      });

      // Reset points to 0 for all predictions of this match
      const predsSnap = await getDocsFromServer(query(collection(db, 'predictions'), where('matchId', '==', matchId)));
      const batch = writeBatch(db);
      predsSnap.docs.forEach(pDoc => {
        batch.update(pDoc.ref, { points: 0 });
      });
      await batch.commit();

      await recalculateLeaderboard();
      fetchMatches();
      alert('¡Partido restablecido a programado con éxito!');
    } catch (e) {
      console.error(e);
      alert('Error al restablecer el partido: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
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

  const finalizeMatch = async (matchId: string, scoreA: number, scoreB: number, winnerId?: 'A' | 'B' | null) => {
    const matchRef = doc(db, 'matches', matchId);
    const updateData: Record<string, any> = { scoreA, scoreB, status: 'finished' };
    if (winnerId !== undefined) {
      updateData.winnerId = winnerId;
    }
    await updateDoc(matchRef, updateData);

    // Single pass: recalculateLeaderboard internally calls updateAllPredictionsPointsInDb
    // This avoids the race condition of double-calculating points
    await recalculateLeaderboard(false);
    fetchMatches();
  };

  const resolveParleyQuestion = async (id: string, correctAnswer: string) => {
    await updateDoc(doc(db, 'parleyQuestions', id), { correctAnswer });
    const answersSnap = await getDocs(query(collection(db, 'parleyAnswers'), where('questionId', '==', id)));
    for (const aDoc of answersSnap.docs) {
      const isCorrect = aDoc.data().answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      await updateDoc(aDoc.ref, { points: isCorrect ? 10 : 0 });
    }
    await recalculateLeaderboard(false);
    fetchParley();
  };

  const updateAllPredictionsPointsInDb = async (dbMatches: Match[]) => {
    const allPredsSnap = await getDocsFromServer(collection(db, 'predictions'));
    const predsByUser: Record<string, Prediction[]> = {};
    allPredsSnap.docs.forEach(d => {
      const pred = { id: d.id, ...d.data() } as Prediction;
      if (!predsByUser[pred.userId]) {
        predsByUser[pred.userId] = [];
      }
      predsByUser[pred.userId].push(pred);
    });

    // Collect all updates in an array first (avoids Firestore 500-op batch limit)
    const pendingUpdates: { ref: any; data: { points: number } }[] = [];

    for (const userId of Object.keys(predsByUser)) {
      const userPreds = predsByUser[userId];
      const userPredsMap: Record<string, Prediction> = {};
      userPreds.forEach(p => { userPredsMap[p.matchId] = p; });

      // Calculate all knockout points using our team-based matcher
      const koPoints = calculateAllKnockoutPointsForUser(userPredsMap, dbMatches);

      // Check and update knockout prediction points
      userPreds.filter(p => p.matchId.startsWith('ko_')).forEach(p => {
        const pts = koPoints[p.matchId] || 0;
        if (p.points !== pts) {
          pendingUpdates.push({ ref: doc(db, 'predictions', p.id!), data: { points: pts } });
        }
      });

      // Check and update group stage prediction points
      userPreds.filter(p => !p.matchId.startsWith('ko_')).forEach(p => {
        const realMatch = dbMatches.find(m => m.id === p.matchId);
        if (realMatch && realMatch.status === 'finished') {
          const pts = calculateMatchPoints(p.scoreA, p.scoreB, realMatch.scoreA!, realMatch.scoreB!);
          if (p.points !== pts) {
            pendingUpdates.push({ ref: doc(db, 'predictions', p.id!), data: { points: pts } });
          }
        }
      });
    }

    // Commit in chunked batches of 450 to stay under Firestore's 500-operation limit
    if (pendingUpdates.length > 0) {
      const BATCH_CHUNK_SIZE = 450;
      for (let i = 0; i < pendingUpdates.length; i += BATCH_CHUNK_SIZE) {
        const chunk = pendingUpdates.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(u => batch.update(u.ref, u.data));
        await batch.commit();
      }
      console.log(`[Points Sync] Recalculated and updated points for ${pendingUpdates.length} predictions in ${Math.ceil(pendingUpdates.length / BATCH_CHUNK_SIZE)} batch(es).`);
    }
  };

  const recalculateLeaderboard = async (showAlert = true) => {
    setIsSeeding(true);
    try {
      // 1. Get all active matches and parley questions FROM SERVER (not cache)
      const matchesSnap = await getDocsFromServer(collection(db, 'matches'));
      const dbMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      const activeMatchIds = new Set(dbMatches.map(d => d.id));
      
      const parleyQuestionsSnap = await getDocsFromServer(collection(db, 'parleyQuestions'));
      const activeQuestionIds = new Set(parleyQuestionsSnap.docs.map(d => d.id));
      
      // Update all prediction points first!
      await updateAllPredictionsPointsInDb(dbMatches);

      // 2. Wait for Firestore consistency before reading updated points
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Get all predictions and parley answers FROM SERVER (now with updated points)
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
      if (showAlert) {
        alert(`Sincronización masiva finalizada:\n- Perfiles existentes actualizados: ${updatedCount}\n- Perfiles huérfanos creados: ${restoredCount}`);
      }
    } catch (e) {
      console.error("Error in recalculateLeaderboard:", e);
      if (showAlert) {
        alert("Error al actualizar la tabla: " + (e instanceof Error ? e.message : String(e)));
      }
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
            winnerId: m.scoreA > m.scoreB ? 'A' : (m.scoreA < m.scoreB ? 'B' : (m as any).winnerId || null)
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

        // Check if this match already exists and is finished
        const existingMatch = dbMatches.find(m => m.id === cfg.id);
        const isAlreadyFinished = existingMatch?.status === 'finished';

        const matchData: Record<string, any> = {
          group: cfg.phase === 'dieciseisavos' ? 'Dieciseisavos' :
                 cfg.phase === 'octavos' ? 'Octavos' :
                 cfg.phase === 'cuartos' ? 'Cuartos' :
                 cfg.phase === 'semifinales' ? 'Semifinales' :
                 cfg.phase === 'tercer_lugar' ? 'Tercer Lugar' : 'Final',
          date: parseKnockoutDate(cfg.dateStr, cfg.timeStr),
        };

        // PROTECTION: Only update teamA/teamB for matches that are NOT yet finalized.
        // This prevents accidental overwrite of real results already stored in Firestore.
        if (!isAlreadyFinished) {
          matchData.teamA = teamAObj.name;
          matchData.teamB = teamBObj.name;
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

  const seedSpecificPlayoffs = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const specificMatches = [
        { id: 'ko_73', teamA: 'Sudáfrica', teamB: 'Canadá', date: '2026-06-28T15:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_74', teamA: 'Alemania', teamB: 'Paraguay', date: '2026-06-29T16:30:00Z', group: 'Dieciseisavos' },
        { id: 'ko_75', teamA: 'Países Bajos', teamB: 'Marruecos', date: '2026-06-29T21:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_76', teamA: 'Brasil', teamB: 'Japón', date: '2026-06-29T13:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_77', teamA: 'Francia', teamB: 'Suecia', date: '2026-06-30T17:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_78', teamA: 'Costa de Marfil', teamB: 'Noruega', date: '2026-06-30T13:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_79', teamA: 'México', teamB: 'Ecuador', date: '2026-06-30T21:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_80', teamA: 'Inglaterra', teamB: 'República Democrática del Congo', date: '2026-07-01T12:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_81', teamA: 'Estados Unidos', teamB: 'Bosnia y Herzegovina', date: '2026-07-01T20:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_82', teamA: 'Bélgica', teamB: 'Senegal', date: '2026-07-01T16:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_83', teamA: 'Portugal', teamB: 'Croacia', date: '2026-07-02T19:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_84', teamA: 'España', teamB: 'Austria', date: '2026-07-02T15:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_85', teamA: 'Suiza', teamB: 'Argelia', date: '2026-07-02T23:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_86', teamA: 'Argentina', teamB: 'Cabo Verde', date: '2026-07-03T18:00:00Z', group: 'Dieciseisavos' },
        { id: 'ko_87', teamA: 'Colombia', teamB: 'Ghana', date: '2026-07-03T21:30:00Z', group: 'Dieciseisavos' },
        { id: 'ko_88', teamA: 'Australia', teamB: 'Egipto', date: '2026-07-03T14:00:00Z', group: 'Dieciseisavos' }
      ];

      specificMatches.forEach(m => {
        const docRef = doc(db, 'matches', m.id);
        batch.set(docRef, {
          teamA: m.teamA,
          teamB: m.teamB,
          date: m.date,
          group: m.group,
          status: 'scheduled'
        }, { merge: true });
      });

      await batch.commit();

      // Finalize Match 73: Sudáfrica 0 - 1 Canadá
      await finalizeMatch('ko_73', 0, 1);

      fetchMatches();
      alert('¡Se han sembrado los 16 partidos oficiales de Dieciseisavos de final con éxito, y se finalizó el Partido 73 (Sudáfrica 0-1 Canadá)!');
    } catch (e) {
      console.error(e);
      alert('Error al sembrar dieciseisavos oficiales: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  const seedSpecificOctavos = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const specificMatches = [
        { id: 'ko_89', teamA: 'Canadá', teamB: 'Marruecos', date: '2026-07-04T13:03:00Z', group: 'Octavos de Final' },
        { id: 'ko_90', teamA: 'Paraguay', teamB: 'Francia', date: '2026-07-04T17:00:00Z', group: 'Octavos de Final' },
        { id: 'ko_91', teamA: 'Brasil', teamB: 'Noruega', date: '2026-07-05T16:00:00Z', group: 'Octavos de Final' },
        { id: 'ko_92', teamA: 'México', teamB: 'Inglaterra', date: '2026-07-05T20:00:00Z', group: 'Octavos de Final' },
        { id: 'ko_93', teamA: 'Portugal', teamB: 'España', date: '2026-07-06T15:00:00Z', group: 'Octavos de Final' },
        { id: 'ko_94', teamA: 'Estados Unidos', teamB: 'Bélgica', date: '2026-07-06T20:08:00Z', group: 'Octavos de Final' },
        { id: 'ko_95', teamA: 'Argentina', teamB: 'Egipto', date: '2026-07-07T12:00:00Z', group: 'Octavos de Final' },
        { id: 'ko_96', teamA: 'Suiza', teamB: 'Colombia', date: '2026-07-07T16:00:00Z', group: 'Octavos de Final' }
      ];

      specificMatches.forEach(m => {
        const docRef = doc(db, 'matches', m.id);
        batch.set(docRef, {
          teamA: m.teamA,
          teamB: m.teamB,
          date: m.date,
          group: m.group,
          status: 'scheduled'
        }, { merge: true });
      });

      await batch.commit();
      fetchMatches();
      alert('¡Se han sembrado los 8 partidos oficiales de Octavos de Final con éxito!');
    } catch (e) {
      console.error(e);
      alert('Error al sembrar octavos: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  const seedSpecificCuartos = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const specificMatches = [
        { id: 'ko_97', teamA: 'Francia', teamB: 'Marruecos', date: '2026-07-09T16:00:00Z', group: 'Cuartos de Final' },
        { id: 'ko_98', teamA: 'Argentina', teamB: 'Suiza', date: '2026-07-11T21:00:00Z', group: 'Cuartos de Final' },
        { id: 'ko_99', teamA: 'Noruega', teamB: 'Inglaterra', date: '2026-07-11T17:00:00Z', group: 'Cuartos de Final' },
        { id: 'ko_100', teamA: 'España', teamB: 'Bélgica', date: '2026-07-10T15:00:00Z', group: 'Cuartos de Final' }
      ];

      specificMatches.forEach(m => {
        const docRef = doc(db, 'matches', m.id);
        batch.set(docRef, {
          teamA: m.teamA,
          teamB: m.teamB,
          date: m.date,
          group: m.group,
          status: 'scheduled'
        }, { merge: true });
      });

      await batch.commit();
      fetchMatches();
      alert('¡Se han sembrado los 4 partidos oficiales de Cuartos de Final con éxito!');
    } catch (e) {
      console.error(e);
      alert('Error al sembrar cuartos: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  const seedSpecificSemis = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const specificMatches = [
        { id: 'ko_101', teamA: 'Francia', teamB: 'España', date: '2026-07-14T15:00:00Z', group: 'Semifinales' },
        { id: 'ko_102', teamA: 'Inglaterra', teamB: 'Argentina', date: '2026-07-15T15:00:00Z', group: 'Semifinales' }
      ];

      specificMatches.forEach(m => {
        const docRef = doc(db, 'matches', m.id);
        batch.set(docRef, {
          teamA: m.teamA,
          teamB: m.teamB,
          date: m.date,
          group: m.group,
          status: 'scheduled'
        }, { merge: true });
      });

      await batch.commit();
      fetchMatches();
      alert('¡Se han sembrado los 2 partidos oficiales de Semifinales con éxito!');
    } catch (e) {
      console.error(e);
      alert('Error al sembrar semifinales: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSeeding(false);
    }
  };

  // ============================================================
  // FASE FINAL — Tercer Lugar y Gran Final (datos oficiales)
  // Tercer Lugar: Francia vs Inglaterra — Sáb 18 Jul 2026, 17:00 UTC-4 (Miami)
  // Gran Final:   España vs Argentina   — Dom 19 Jul 2026, 15:00 UTC-4 (NJ)
  // ============================================================
  const seedFinalPhaseMatches = async () => {
    const confirmed = window.confirm(
      '⚠️ SEMBRAR FASE FINAL\n\n' +
      'Se van a registrar los siguientes partidos:\n' +
      '• ko_103 | Tercer Lugar: Francia vs Inglaterra\n' +
      '  Sáb 18 Jul 2026 | 17:00 | Hard Rock Stadium, Miami\n\n' +
      '• ko_104 | Gran Final: España vs Argentina\n' +
      '  Dom 19 Jul 2026 | 15:00 | MetLife Stadium, Nueva Jersey\n\n' +
      'Los partidos ya finalizados NO serán modificados.\n' +
      '¿Confirmas la siembra?'
    );
    if (!confirmed) return;

    setIsSeeding(true);
    try {
      const matchesSnap = await getDocsFromServer(collection(db, 'matches'));
      const dbMatchesCurrent = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));

      const finalMatches = [
        {
          id: 'ko_103',
          teamA: 'Francia',
          teamB: 'Inglaterra',
          // 18 Jul 2026 17:00 hora Miami (UTC-4) = 21:00 UTC
          date: '2026-07-18T21:00:00Z',
          group: 'Tercer Lugar',
          label: 'Tercer Lugar'
        },
        {
          id: 'ko_104',
          teamA: 'España',
          teamB: 'Argentina',
          // 19 Jul 2026 15:00 hora Nueva Jersey (UTC-4) = 19:00 UTC
          date: '2026-07-19T19:00:00Z',
          group: 'Final',
          label: 'Gran Final'
        }
      ];

      const batch = writeBatch(db);
      const skipped: string[] = [];

      finalMatches.forEach(m => {
        const existing = dbMatchesCurrent.find(e => e.id === m.id);
        const isFinished = existing?.status === 'finished';

        if (isFinished) {
          // PROTECTION: Never overwrite a finalized match's teams or result
          skipped.push(`${m.id} (${m.label}) — YA FINALIZADO, omitido`);
          return;
        }

        const docRef = doc(db, 'matches', m.id);
        batch.set(docRef, {
          teamA: m.teamA,
          teamB: m.teamB,
          date: m.date,
          group: m.group,
          status: 'scheduled'
        }, { merge: true });
      });

      await batch.commit();
      fetchMatches();

      const skippedMsg = skipped.length > 0
        ? `\n\n⚠️ Los siguientes partidos fueron omitidos porque ya están finalizados:\n${skipped.join('\n')}`
        : '';

      alert(
        '✅ Fase Final sembrada correctamente:\n\n' +
        '• ko_103 | Tercer Lugar: Francia 🇫🇷 vs 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra\n' +
        '  Sáb 18 Jul | 17:00 | Hard Rock Stadium, Miami\n\n' +
        '• ko_104 | Gran Final: España 🇪🇸 vs 🇦🇷 Argentina\n' +
        '  Dom 19 Jul | 15:00 | MetLife Stadium, Nueva Jersey' +
        skippedMsg
      );
    } catch (e) {
      console.error(e);
      alert('Error al sembrar la Fase Final: ' + (e instanceof Error ? e.message : String(e)));
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
            onClick={() => recalculateLeaderboard()}
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
          <button 
            onClick={seedSpecificPlayoffs}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-200 hover:bg-teal-700 disabled:opacity-50 transition font-bold"
            title="Sembrar los 16 partidos oficiales de dieciseisavos de final"
          >
            <Trophy className="w-4 h-4" />
            Sembrar Dieciseisavos Oficiales
          </button>
          <button 
            onClick={seedSpecificOctavos}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-700 disabled:opacity-50 transition font-bold"
            title="Sembrar los 8 partidos oficiales de octavos de final"
          >
            <Trophy className="w-4 h-4" />
            Sembrar Octavos Oficiales
          </button>
          <button 
            onClick={seedSpecificCuartos}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-50 transition font-bold"
            title="Sembrar los 4 partidos oficiales de cuartos de final"
          >
            <Trophy className="w-4 h-4" />
            Sembrar Cuartos Oficiales
          </button>
          <button 
            onClick={seedSpecificSemis}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 transition font-bold"
            title="Sembrar los 2 partidos oficiales de semifinales"
          >
            <Trophy className="w-4 h-4" />
            Sembrar Semifinales Oficiales
          </button>
          <button 
            onClick={seedFinalPhaseMatches}
            disabled={isSeeding}
            className="flex items-center gap-2 px-5 py-3 bg-yellow-500 text-white rounded-xl shadow-lg shadow-yellow-300 hover:bg-yellow-600 disabled:opacity-50 transition font-bold border-2 border-yellow-400"
            title="Sembrar Tercer Lugar (Francia vs Inglaterra) y Gran Final (España vs Argentina)"
          >
            <Trophy className="w-4 h-4 fill-white" />
            🏆 Sembrar Fase Final (3er Lugar + Gran Final)
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

          {/* Missing group stage matches */}
          {diagnosticResults.collections.matches?.missingGroupMatches?.length > 0 && (
            <div className="bg-red-900/30 p-4 rounded-xl border border-red-700">
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                ⚠️ {diagnosticResults.collections.matches.missingGroupMatches.length} Partidos de Fase de Grupos Faltantes
              </div>
              <div className="text-xs font-mono text-red-300 space-y-1 max-h-40 overflow-y-auto mb-3">
                {diagnosticResults.collections.matches.missingGroupMatches.map((m: any) => (
                  <div key={m.id}>
                    [{m.id}] {m.group} | {m.teamA} vs {m.teamB} ({new Date(m.date).toLocaleDateString()})
                  </div>
                ))}
              </div>
              <button
                onClick={() => restoreMissingGroupMatches(diagnosticResults.collections.matches.missingGroupMatches)}
                disabled={isSeeding}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                Restaurar Partidos Faltantes
              </button>
            </div>
          )}

          {diagnosticResults.collections.matches?.missingGroupMatches?.length === 0 && (
            <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700 text-emerald-300 text-sm font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> Todos los partidos de la Fase de Grupos están sembrados y presentes en la base de datos.
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
                  {(() => {
                    const isKo = m.id.startsWith('ko_') || (() => {
                      const g = (m.group || '').toLowerCase().trim();
                      return g.includes('dieciseis') || g.includes('diesiseis') || g.includes('octavo') || 
                             g.includes('cuarto') || g.includes('semi') || g.includes('final') || 
                             g.includes('tercer') || g.includes('playoff') || g.includes('eliminatoria');
                    })();
                    
                    return editingMatchId === m.id && m.status === 'scheduled' ? (
                      <div className="flex flex-col gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-900 w-full lg:w-auto">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase opacity-60">Local</label>
                            <input type="text" defaultValue={m.teamA} id={`edit_teamA_${m.id}`} className="w-full p-1.5 border rounded-lg text-xs font-bold bg-white" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase opacity-60">Visitante</label>
                            <input type="text" defaultValue={m.teamB} id={`edit_teamB_${m.id}`} className="w-full p-1.5 border rounded-lg text-xs font-bold bg-white" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase opacity-60">Fase / Grupo</label>
                            <input type="text" defaultValue={m.group} id={`edit_group_${m.id}`} className="w-full p-1.5 border rounded-lg text-xs font-bold bg-white" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase opacity-60">Fecha</label>
                            <input type="datetime-local" defaultValue={m.date ? new Date(new Date(m.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} id={`edit_date_${m.id}`} className="w-full p-1.5 border rounded-lg text-xs font-bold bg-white" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-2">
                          <button 
                            onClick={async () => {
                              const tA = (document.getElementById(`edit_teamA_${m.id}`) as HTMLInputElement).value.trim();
                              const tB = (document.getElementById(`edit_teamB_${m.id}`) as HTMLInputElement).value.trim();
                              const grp = (document.getElementById(`edit_group_${m.id}`) as HTMLInputElement).value.trim();
                              const dt = (document.getElementById(`edit_date_${m.id}`) as HTMLInputElement).value;
                              
                              if (!tA || !tB || !grp || !dt) {
                                alert("Todos los campos son obligatorios.");
                                return;
                              }
                              
                              try {
                                const matchRef = doc(db, 'matches', m.id);
                                await updateDoc(matchRef, {
                                  teamA: tA,
                                  teamB: tB,
                                  group: grp,
                                  date: new Date(dt).toISOString()
                                });
                                setEditingMatchId(null);
                                fetchMatches();
                              } catch (err: any) {
                                alert("Error al guardar cambios: " + err.message);
                              }
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition"
                          >
                            Guardar
                          </button>
                          <button 
                            onClick={() => setEditingMatchId(null)}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-300 transition"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : m.status === 'scheduled' ? (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 italic flex-wrap">
                        <input type="number" placeholder="Goles Local" id={`scoreA_${m.id}`} className="w-16 p-2 border-none bg-transparent text-center font-black focus:outline-none" />
                        <span className="text-slate-300">-</span>
                        <input type="number" placeholder="Goles Vis." id={`scoreB_${m.id}`} className="w-16 p-2 border-none bg-transparent text-center font-black focus:outline-none" />
                        {isKo && (
                          <select id={`winnerId_${m.id}`} className="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none">
                            <option value="">Ganador Penaltis...</option>
                            <option value="A">{m.teamA}</option>
                            <option value="B">{m.teamB}</option>
                          </select>
                        )}
                        <button 
                          onClick={() => {
                            const a = (document.getElementById(`scoreA_${m.id}`) as HTMLInputElement).value;
                            const b = (document.getElementById(`scoreB_${m.id}`) as HTMLInputElement).value;
                            if (a !== "" && b !== "") {
                              const scoreA = parseInt(a);
                              const scoreB = parseInt(b);
                              let wId: 'A' | 'B' | null = null;
                              if (scoreA === scoreB && isKo) {
                                const sel = (document.getElementById(`winnerId_${m.id}`) as HTMLSelectElement)?.value;
                                if (sel !== 'A' && sel !== 'B') {
                                  alert("Por favor, selecciona qué equipo avanzó por penales.");
                                  return;
                                }
                                wId = sel as 'A' | 'B';
                              }
                              finalizeMatch(m.id, scoreA, scoreB, wId);
                            }
                          }}
                          className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition"
                        >
                          Finalizar
                        </button>
                      </div>
                    ) : editingMatchId === m.id ? (
                      <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-100 italic text-amber-900 flex-wrap">
                        <input type="number" defaultValue={m.scoreA} id={`scoreA_${m.id}`} className="w-16 p-2 border-none bg-transparent text-center font-black focus:outline-none" />
                        <span className="text-amber-300">-</span>
                        <input type="number" defaultValue={m.scoreB} id={`scoreB_${m.id}`} className="w-16 p-2 border-none bg-transparent text-center font-black focus:outline-none" />
                        {isKo && (
                          <select id={`winnerId_${m.id}`} defaultValue={(m as any).winnerId || ""} className="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none">
                            <option value="">Ganador Penaltis...</option>
                            <option value="A">{m.teamA}</option>
                            <option value="B">{m.teamB}</option>
                          </select>
                        )}
                        <button 
                          onClick={() => {
                            const a = (document.getElementById(`scoreA_${m.id}`) as HTMLInputElement).value;
                            const b = (document.getElementById(`scoreB_${m.id}`) as HTMLInputElement).value;
                            if (a !== "" && b !== "") {
                              const scoreA = parseInt(a);
                              const scoreB = parseInt(b);
                              let wId: 'A' | 'B' | null = null;
                              if (scoreA === scoreB && isKo) {
                                const sel = (document.getElementById(`winnerId_${m.id}`) as HTMLSelectElement)?.value;
                                if (sel !== 'A' && sel !== 'B') {
                                  alert("Por favor, selecciona qué equipo avanzó por penales.");
                                  return;
                                }
                                wId = sel as 'A' | 'B';
                              }
                              finalizeMatch(m.id, scoreA, scoreB, wId);
                              setEditingMatchId(null);
                            }
                          }}
                          className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                        >
                          Guardar
                        </button>
                        <button 
                          onClick={() => setEditingMatchId(null)}
                          className="ml-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-300"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-black text-xl border border-green-100">
                          <span>{m.scoreA}</span>
                          <span className="opacity-30">-</span>
                          <span>{m.scoreB}</span>
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        {isKo && (m as any).winnerId && (
                          <span className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                            Avanzó: {(m as any).winnerId === 'A' ? m.teamA : m.teamB} (P)
                          </span>
                        )}
                        <button 
                          onClick={() => setEditingMatchId(m.id)}
                          className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-800"
                          title="Corregir resultado"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de restablecer el partido ${m.teamA} vs ${m.teamB} a programado? Se borrará el marcador oficial y se recalcularán los puntos de los pronósticos de todos los usuarios.`)) {
                            resetMatch(m.id);
                          }
                        }}
                        className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-amber-600"
                        title="Restablecer partido a programado"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()}
                  {m.status === 'scheduled' && editingMatchId !== m.id && (
                    <button 
                      onClick={() => setEditingMatchId(m.id)}
                      className="p-3 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition animate-pulse"
                      title="Editar detalles del encuentro"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
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
