import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDocs, where, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Match, Prediction, PodiumPrediction, isMatchLocked } from '../types';
import { Save, AlertCircle, CheckCircle2, Trophy, Medal, Eye, Lock, Globe, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Predictions() {
  const { user } = useAuth();
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

  // States for peer comparison modal
  const [comparisonMatch, setComparisonMatch] = useState<Match | null>(null);
  const [comparisonPredictions, setComparisonPredictions] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<Record<string, string>>({});
  const [loadingComparison, setLoadingComparison] = useState(false);

  useEffect(() => {
    // Load matches
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const unsubMatches = onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });

    // Load user predictions
    if (user) {
      const loadData = async () => {
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
        setLoading(false);
      };
      loadData();
    }

    return () => unsubMatches();
  }, [user]);

  const handleScoreChange = (matchId: string, team: 'A' | 'B', value: string) => {
    // Prevent modification if locked
    const match = matches.find(m => m.id === matchId);
    if (match && (match.status === 'finished' || isMatchLocked(match.date))) return;

    const score = value === '' ? 0 : parseInt(value);
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] || { userId: user!.uid, matchId, scoreA: 0, scoreB: 0 },
        [team === 'A' ? 'scoreA' : 'scoreB']: score
      }
    }));
  };

  const handlePodiumChange = (field: keyof PodiumPrediction, value: string) => {
    setPodium(prev => ({ ...prev, [field]: value }));
  };

  const savePrediction = async (matchId: string) => {
    if (!user) return;
    const match = matches.find(m => m.id === matchId);
    if (!match || match.status === 'finished' || isMatchLocked(match.date)) {
      alert('Este partido está cerrado y no se pueden modificar las predicciones.');
      return;
    }

    const pred = predictions[matchId];
    if (!pred) return;

    setSaving(matchId);
    try {
      const predId = `${user.uid}_${matchId}`;
      await setDoc(doc(db, 'predictions', predId), {
        ...pred,
        userId: user.uid,
        matchId,
        updatedAt: new Date().toISOString()
      });
      setTimeout(() => setSaving(null), 1000);
    } catch (error) {
      console.error(error);
      setSaving(null);
    }
  };

  const saveAll = async () => {
    if (!user) return;
    setGlobalSaving(true);
    try {
      // Save only match predictions that are not locked
      const validPredictions = Object.entries(predictions).filter(([matchId]) => {
        const match = matches.find(m => m.id === matchId);
        return match && match.status !== 'finished' && !isMatchLocked(match.date);
      });

      const promises = validPredictions.map(([matchId, pred]) => {
        const predId = `${user.uid}_${matchId}`;
        return setDoc(doc(db, 'predictions', predId), {
          ...pred,
          userId: user.uid,
          matchId,
          updatedAt: new Date().toISOString()
        });
      });

      // Save Podium
      promises.push(setDoc(doc(db, 'podiums', user.uid), {
        ...podium,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      }));

      await Promise.all(promises);
      alert('¡Todo guardado correctamente!');
    } catch (error) {
      console.error(error);
      alert('Error al guardar los datos.');
    } finally {
      setGlobalSaving(false);
    }
  };

  const handleOpenComparison = async (match: Match) => {
    setComparisonMatch(match);
    setLoadingComparison(true);
    setComparisonPredictions([]);
    try {
      let currentUsers = usersList;
      if (Object.keys(usersList).length === 0) {
        const usersSnap = await getDocs(collection(db, 'users'));
        const uMap: Record<string, string> = {};
        usersSnap.docs.forEach(doc => {
          uMap[doc.id] = doc.data().name || 'Participante';
        });
        setUsersList(uMap);
        currentUsers = uMap;
      }

      const q = query(collection(db, 'predictions'), where('matchId', '==', match.id));
      const predSnap = await getDocs(q);
      const preds = predSnap.docs.map(doc => {
        const data = doc.data();
        return {
          userName: currentUsers[data.userId] || 'Invitado',
          scoreA: data.scoreA,
          scoreB: data.scoreB,
          points: data.points,
          userId: data.userId
        };
      });
      setComparisonPredictions(preds);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingComparison(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const groupedMatches = matches.reduce((acc, match) => {
    const group = match.group || 'Otros';
    if (!acc[group]) acc[group] = [];
    acc[group].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  return (
    <div className="space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Mis Pronósticos</h1>
          <p className="text-slate-500">Completa tus marcadores y define a tus favoritos del Mundial.</p>
        </div>
        <button 
          onClick={saveAll}
          disabled={globalSaving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {globalSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Save className="w-5 h-5" />}
          Guardar Todo
        </button>
      </header>

      {/* PODIUM SECTION */}
      <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-600 font-display">
          <Trophy className="w-6 h-6" /> Cuadro de Honor
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-yellow-600 uppercase tracking-widest flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Campeón
            </label>
            <input 
              value={podium.champion}
              onChange={e => handlePodiumChange('champion', e.target.value)}
              className="w-full p-3 bg-yellow-50 border border-yellow-100 rounded-xl font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              placeholder="Ej. Argentina"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Medal className="w-3 h-3" /> Subcampeón
            </label>
            <input 
              value={podium.runnerUp}
              onChange={e => handlePodiumChange('runnerUp', e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-slate-300 focus:outline-none"
              placeholder="Ej. Francia"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
              <Medal className="w-3 h-3" /> Tercer Lugar
            </label>
            <input 
              value={podium.third}
              onChange={e => handlePodiumChange('third', e.target.value)}
              className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl font-bold focus:ring-2 focus:ring-amber-300 focus:outline-none"
              placeholder="Ej. Brasil"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              Cuarto Lugar
            </label>
            <input 
              value={podium.fourth}
              onChange={e => handlePodiumChange('fourth', e.target.value)}
              className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              placeholder="Ej. Marruecos"
            />
          </div>
        </div>
      </section>

      {/* MATCHES SECTION */}
      <div className="space-y-12">
        {Object.entries(groupedMatches).map(([groupName, groupMatches]) => (
          <div key={groupName} className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 font-display">
              <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">{groupName.charAt(groupName.length-1)}</span>
              Fase de Grupos: {groupName}
            </h2>
            <div className="grid gap-4">
              {groupMatches.map((match) => {
                const pred = predictions[match.id];
                const scoreA = pred !== undefined ? pred.scoreA : '';
                const scoreB = pred !== undefined ? pred.scoreB : '';
                const isFinished = match.status === 'finished';
                const isLocked = isMatchLocked(match.date);
                const isDisabled = isFinished || isLocked;
                
                return (
                  <motion.div 
                    key={match.id} 
                    layout
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-indigo-200 relative group"
                  >
                    <div className="flex-1 w-full flex items-center justify-between gap-4 md:gap-8">
                      <div className="flex-1 text-right font-black text-xl text-slate-800 tracking-tight">{match.teamA}</div>
                      
                      <div className="flex items-center gap-3">
                        <input 
                          type="number"
                          min="0"
                          disabled={isDisabled}
                          value={scoreA}
                          onChange={(e) => handleScoreChange(match.id, 'A', e.target.value)}
                          className="w-14 h-14 text-center text-2xl font-black rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                        />
                        <div className="flex flex-col items-center">
                          <span className="text-slate-300 font-black text-xs">VS</span>
                        </div>
                        <input 
                          type="number"
                          min="0"
                          disabled={isDisabled}
                          value={scoreB}
                          onChange={(e) => handleScoreChange(match.id, 'B', e.target.value)}
                          className="w-14 h-14 text-center text-2xl font-black rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                        />
                      </div>
                      
                      <div className="flex-1 text-left font-black text-xl text-slate-800 tracking-tight">{match.teamB}</div>
                    </div>

                    <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                      <div className="flex-1 md:flex-none text-xs text-slate-400 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1 justify-center md:justify-end">
                           {new Date(match.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center justify-center md:justify-end">
                           {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {isLocked || isFinished ? (
                        <button 
                          onClick={() => handleOpenComparison(match)}
                          className="p-3 bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl border border-indigo-100 transition-all shadow-sm flex items-center gap-1.5 font-bold text-xs"
                          title="Comparar pronósticos"
                        >
                          <Eye className="w-5 h-5" />
                          <span className="hidden sm:inline">Ver otros</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => savePrediction(match.id)}
                          disabled={saving === match.id}
                          className={`p-3 rounded-xl transition-all ${
                            saving === match.id ? 'bg-green-100 text-green-600 shadow-inner' :
                            'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm hover:shadow-indigo-100'
                          }`}
                          title="Guardar este pronóstico"
                        >
                          {saving === match.id ? <CheckCircle2 className="w-6 h-6 animate-pulse" /> : <Save className="w-6 h-6" />}
                        </button>
                      )}
                    </div>

                    {isFinished && (
                      <div className="absolute -top-3 right-4 flex gap-2">
                        <span className="bg-slate-800 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Marcador Final: {match.scoreA} - {match.scoreB}</span>
                        {pred?.points !== undefined && (
                          <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">+{pred.points} PUNTOS</span>
                        )}
                      </div>
                    )}

                    {isLocked && !isFinished && (
                      <div className="absolute -top-3 right-4 flex gap-2">
                        <span className="bg-amber-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Pronósticos Bloqueados
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-8 flex justify-center pointer-events-none">
        <button 
          onClick={saveAll}
          disabled={globalSaving}
          className="pointer-events-auto flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-300 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {globalSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          Guardar Todos los Cambios
        </button>
      </div>

      {/* Comparison Modal */}
      <AnimatePresence>
        {comparisonMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-50 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight font-display flex items-center gap-2">
                    <Globe className="w-6 h-6 text-indigo-600" /> Comparar Pronósticos
                  </h3>
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">
                    {comparisonMatch.group} • {new Date(comparisonMatch.date).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => setComparisonMatch(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-indigo-50/50 rounded-2xl p-4 flex items-center justify-between border border-indigo-50">
                <span className="font-extrabold text-slate-800 flex-1 text-right">{comparisonMatch.teamA}</span>
                <div className="mx-4 flex items-center gap-2">
                  {comparisonMatch.status === 'finished' ? (
                    <span className="bg-slate-800 text-white font-black text-sm px-3 py-1 rounded-full">
                      {comparisonMatch.scoreA} - {comparisonMatch.scoreB}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-bold text-xs uppercase bg-white px-2 py-1 rounded border border-slate-100">VS</span>
                  )}
                </div>
                <span className="font-extrabold text-slate-800 flex-1 text-left">{comparisonMatch.teamB}</span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {loadingComparison ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="text-xs font-bold uppercase tracking-wider">Cargando pronósticos...</span>
                  </div>
                ) : comparisonPredictions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No hay predicciones registradas para este partido.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {comparisonPredictions.map((pred, i) => {
                      const isExact = comparisonMatch.status === 'finished' && 
                        pred.scoreA === comparisonMatch.scoreA && 
                        pred.scoreB === comparisonMatch.scoreB;
                      const hasPoints = pred.points !== undefined && pred.points > 0;
                      
                      return (
                        <div key={i} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                              {pred.userName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-800">{pred.userName}</div>
                              {isExact && (
                                <span className="text-[10px] bg-green-500 text-white font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 w-max uppercase tracking-wider">
                                  <Sparkles className="w-2.5 h-2.5" /> ¡Exacto!
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-black text-lg text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                              {pred.scoreA} - {pred.scoreB}
                            </span>
                            {comparisonMatch.status === 'finished' && (
                              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                                isExact ? 'bg-green-600 text-white' : 
                                hasPoints ? 'bg-indigo-600 text-white' : 
                                'bg-slate-100 text-slate-400'
                              }`}>
                                +{pred.points || 0} PTS
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  );
}

