import { useState, useEffect } from 'react';
import { collection, getDocs, getDocsFromServer, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match, UserProfile, Prediction, PodiumPrediction, ParleyAnswer, ParleyQuestion } from '../types';
import { TEAM_FLAGS } from '../lib/constants';
import { 
  KNOCKOUT_MATCHES_CONFIG,
  calculateAllGroupStandingsData, 
  getThirdPlacedTeamsStatsData, 
  resolveTeamNameData,
  calculateKnockoutPoints,
  resolveUserPredictionsBracket
} from '../lib/tournament';
import { calculateMatchPoints } from '../types';
import { Search, Printer, Trophy, Calendar, FileText, CheckCircle2, ChevronRight, AlertCircle, BarChart3, HelpCircle } from 'lucide-react';
import '../components/PrintReport.css';

export function Audit() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [podium, setPodium] = useState<PodiumPrediction | null>(null);
  const [parleyAnswers, setParleyAnswers] = useState<ParleyAnswer[]>([]);
  const [parleyQuestions, setParleyQuestions] = useState<ParleyQuestion[]>([]);
  
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'grupos' | 'playoffs' | 'parley'>('grupos');

  // Load all users for the selector
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), orderBy('totalPoints', 'desc')));
        const list = snap.docs.map(d => d.data() as UserProfile);
        setUsers(list);
        if (list.length > 0) {
          // Default to first user (highest points)
          setSelectedUserId(list[0].uid);
        }
      } catch (e) {
        console.error("Error loading users for audit:", e);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Load predictions and matching database matches for selected user
  useEffect(() => {
    if (!selectedUserId) return;
    const fetchUserData = async () => {
      setLoadingData(true);
      try {
        // Fetch selected user's profile info
        const userDoc = users.find(u => u.uid === selectedUserId);
        if (userDoc) setSelectedUser(userDoc);

        // Fetch matches from server
        const matchesSnap = await getDocsFromServer(collection(db, 'matches'));
        const dbMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
        setMatches(dbMatches);

        // Fetch all predictions for the selected user
        const predsSnap = await getDocsFromServer(query(collection(db, 'predictions'), where('userId', '==', selectedUserId)));
        const predsMap: Record<string, Prediction> = {};
        predsSnap.docs.forEach(docSnap => {
          predsMap[docSnap.data().matchId] = docSnap.data() as Prediction;
        });
        setPredictions(predsMap);

        // Fetch podium prediction
        const podiumRef = doc(db, 'podiums', selectedUserId);
        const podiumSnap = await getDoc(podiumRef);
        if (podiumSnap.exists()) {
          setPodium(podiumSnap.data() as PodiumPrediction);
        } else {
          setPodium(null);
        }

        // Fetch parley questions and answers
        const parleyQuestionsSnap = await getDocsFromServer(collection(db, 'parleyQuestions'));
        const pQuestions = parleyQuestionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ParleyQuestion));
        setParleyQuestions(pQuestions);

        const parleyAnswersSnap = await getDocsFromServer(query(collection(db, 'parleyAnswers'), where('userId', '==', selectedUserId)));
        const pAnswers = parleyAnswersSnap.docs.map(doc => doc.data() as ParleyAnswer);
        setParleyAnswers(pAnswers);

      } catch (e) {
        console.error("Error loading user audit data:", e);
      } finally {
        setLoadingData(false);
      }
    };
    fetchUserData();
  }, [selectedUserId, users]);

  const normalizeStr = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredUsers = users.filter(u => {
    const normSearch = normalizeStr(searchTerm);
    const normName = normalizeStr(u.name || '');
    const normEmail = normalizeStr(u.email || '');
    return normName.includes(normSearch) || normEmail.includes(normSearch);
  });

  // Auto-select the first user in the filtered list if the current selected user is not in it
  useEffect(() => {
    if (searchTerm.trim() !== '' && filteredUsers.length > 0) {
      const isStillInFiltered = filteredUsers.some(u => u.uid === selectedUserId);
      if (!isStillInFiltered) {
        setSelectedUserId(filteredUsers[0].uid);
      }
    }
  }, [searchTerm, filteredUsers, selectedUserId]);

  const handlePrint = () => {
    window.print();
  };

  const getPhaseName = (phase: string) => {
    switch (phase) {
      case 'dieciseisavos': return 'Dieciseisavos';
      case 'octavos': return 'Octavos de Final';
      case 'cuartos': return 'Cuartos de Final';
      case 'semifinales': return 'Semifinales';
      case 'tercer_lugar': return 'Tercer Lugar';
      case 'final': return 'Gran Final';
      default: return phase;
    }
  };

  // Group Matches by Group name (e.g. Grupo A, Grupo B)
  const groupNames = [
    'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
    'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'
  ];

  // Resolve Playoffs Bracket for this specific user
  const userResolvedBracket = selectedUser ? resolveUserPredictionsBracket(predictions, matches) : {};

  if (loadingUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-sm font-bold text-slate-400">Cargando lista de participantes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SCREEN-ONLY CONTROLS PANEL */}
      <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 font-display flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-600" />
            Auditoría de Pronósticos
          </h2>
          <p className="text-xs text-slate-400">Revisa con total transparencia y descarga en PDF los pronósticos cargados por cualquier participante.</p>
        </div>
        
        <button 
          onClick={handlePrint}
          disabled={!selectedUser || loadingData}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-750 disabled:opacity-50 transition-all font-bold text-xs self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          Descargar PDF / Imprimir
        </button>
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* SIDEBAR: PARTICIPANT SEARCH & LIST */}
        <div className="no-print lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 self-start">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Buscar Participante</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Nombre, apellido o correo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 font-bold" />
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] lg:max-h-[600px] overflow-y-auto pr-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Participantes ({filteredUsers.length})</span>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const rank = users.findIndex(user => user.uid === u.uid) + 1;
                const isSelected = u.uid === selectedUserId;
                
                return (
                  <button
                    key={u.uid}
                    onClick={() => setSelectedUserId(u.uid)}
                    className={`flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-transparent shadow-md shadow-indigo-150'
                        : 'bg-white text-slate-800 border-slate-100 hover:border-slate-200 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl filter drop-shadow-sm shrink-0 select-none">
                        {u.avatarEmoji || '⚽'}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <span className="block font-bold text-xs truncate">
                          {u.name}
                        </span>
                        <span className={`block text-[10px] truncate ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400'
                        }`}>
                          {u.email || 'Invitado'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-550'
                      }`}>
                        #{rank}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {u.totalPoints || 0}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No hay coincidencias
              </div>
            )}
          </div>
        </div>

        {/* MAIN AUDIT AREA */}
        <div className="lg:col-span-3">
          {loadingData ? (
            <div className="no-print bg-white p-20 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs font-bold text-slate-400">Cargando pronósticos del participante...</p>
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {/* SCREEN-ONLY USER HEADER & TABS */}
              <div className="no-print space-y-6">
                {/* Participant Profile Banner */}
                <div className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between border border-slate-850">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl filter drop-shadow-md select-none">{selectedUser.avatarEmoji || '⚽'}</span>
                    <div>
                      <h3 className="text-lg font-black">{selectedUser.name}</h3>
                      <p className="text-xs text-slate-400">{selectedUser.email || 'Invitado'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Puntaje Total</span>
                    <span className="text-3xl font-extrabold text-indigo-400">{selectedUser.totalPoints || 0} Ptos</span>
                  </div>
                </div>

            {/* View Tabs */}
            <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
              <button 
                onClick={() => setActiveTab('grupos')}
                className={`pb-3 border-b-2 transition-colors ${activeTab === 'grupos' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
              >
                Fase de Grupos
              </button>
              <button 
                onClick={() => setActiveTab('playoffs')}
                className={`pb-3 border-b-2 transition-colors ${activeTab === 'playoffs' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
              >
                Playoffs (Llave)
              </button>
              <button 
                onClick={() => setActiveTab('parley')}
                className={`pb-3 border-b-2 transition-colors ${activeTab === 'parley' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
              >
                Parley y Podio
              </button>
            </div>

            {/* TAB CONTENT: GROUPS */}
            {activeTab === 'grupos' && (
              <div className="grid md:grid-cols-2 gap-6">
                {groupNames.map(groupName => {
                  const groupMatches = matches.filter(m => m.group === groupName);
                  return (
                    <div key={groupName} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <h4 className="font-extrabold text-slate-800 border-b border-slate-100 pb-2 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        {groupName}
                      </h4>
                      <div className="space-y-2.5">
                        {groupMatches.map(match => {
                          const pred = predictions[match.id];
                          const isFinished = match.status === 'finished';
                          const flagA = TEAM_FLAGS[match.teamA] || '🏳️';
                          const flagB = TEAM_FLAGS[match.teamB] || '🏳️';

                          return (
                            <div key={match.id} className="flex justify-between items-center text-2xs p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="w-[45%] flex items-center justify-between">
                                <span className="truncate pr-1 font-bold">{flagA} {match.teamA}</span>
                                <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-sm">
                                  {pred?.scoreA !== undefined ? pred.scoreA : '-'}
                                </span>
                              </div>
                              <span className="px-1 text-slate-400 font-bold">vs</span>
                              <div className="w-[45%] flex items-center justify-between">
                                <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-sm">
                                  {pred?.scoreB !== undefined ? pred.scoreB : '-'}
                                </span>
                                <span className="truncate pl-1 font-bold text-right">{match.teamB} {flagB}</span>
                              </div>
                              <div className="ml-3 shrink-0">
                                {isFinished ? (
                                  <span className="inline-block text-[10px] font-black px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-md">
                                    +{pred?.points || 0} pts ({match.scoreA}-{match.scoreB})
                                  </span>
                                ) : (
                                  <span className="text-3xs text-slate-400 italic">Pendiente</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: PLAYOFFS */}
            {activeTab === 'playoffs' && (
              <div className="space-y-8">
                {['dieciseisavos', 'octavos', 'cuartos', 'semifinales', 'tercer_lugar', 'final'].map(phase => {
                  const phaseConfigs = KNOCKOUT_MATCHES_CONFIG.filter(c => c.phase === phase);
                  
                  return (
                    <div key={phase} className="space-y-4">
                      <h4 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-emerald-600" />
                        {getPhaseName(phase)}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {phaseConfigs.map(cfg => {
                          const pred = (predictions[cfg.id] || { scoreA: undefined, scoreB: undefined, points: undefined }) as Prediction;
                          const userMatchup = userResolvedBracket[cfg.id] || { teamA: 'Pendiente', teamB: 'Pendiente' };
                          const realMatch = matches.find(m => m.id === cfg.id);
                          const isFinished = realMatch?.status === 'finished';

                          return (
                            <div key={cfg.id} className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-xs gap-3">
                              {/* Predicted matchup & prediction */}
                              <div className="flex justify-between items-center text-xs">
                                <div className="space-y-1 w-[45%]">
                                  <span className="block truncate font-bold text-slate-750">
                                    {TEAM_FLAGS[userMatchup.teamA] || '🏳️'} {userMatchup.teamA}
                                  </span>
                                  <span className="inline-block px-2.5 py-0.5 font-bold font-mono bg-slate-100 rounded text-slate-800 text-[11px]">
                                    {pred.scoreA !== undefined ? pred.scoreA : '-'}
                                  </span>
                                </div>
                                <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">vs</span>
                                <div className="space-y-1 w-[45%] text-right">
                                  <span className="block truncate font-bold text-slate-750">
                                    {userMatchup.teamB} {TEAM_FLAGS[userMatchup.teamB] || '🏳️'}
                                  </span>
                                  <span className="inline-block px-2.5 py-0.5 font-bold font-mono bg-slate-100 rounded text-slate-800 text-[11px]">
                                    {pred.scoreB !== undefined ? pred.scoreB : '-'}
                                  </span>
                                </div>
                              </div>

                              {/* Real match & outcome details */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs font-semibold text-slate-400">
                                <div>
                                  {isFinished ? (
                                    <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      Real: {realMatch.teamA} {realMatch.scoreA} - {realMatch.scoreB} {realMatch.teamB}
                                    </span>
                                  ) : realMatch ? (
                                    <span className="italic">Real programado: {realMatch.teamA} vs {realMatch.teamB}</span>
                                  ) : (
                                    <span className="italic">Partido real por sembrar</span>
                                  )}
                                </div>

                                <div>
                                  {isFinished ? (
                                    <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      +{pred.points || 0} Ptos
                                    </span>
                                  ) : (
                                    <span>Pendiente</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: PARLEY AND PODIUM */}
            {activeTab === 'parley' && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* podium cards */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Podio de Honor Elegido
                  </h4>
                  <div className="space-y-3 font-sans">
                    {[
                      { label: '🥇 Campeón', val: podium?.champion },
                      { label: '🥈 Subcampeón', val: podium?.runnerUp },
                      { label: '🥉 Tercer Lugar', val: podium?.third },
                      { label: '🏅 Cuarto Lugar', val: podium?.fourth },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl text-2xs">
                        <span className="font-bold text-slate-700">{item.label}</span>
                        <strong className="text-indigo-600 font-extrabold text-right">
                          {item.val ? `${TEAM_FLAGS[item.val] || '🏳️'} ${item.val}` : 'No seleccionado'}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* parley list */}
                <div className="bg-white p-5 rounded-3xl border border-slate-205 shadow-xs space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    Respuestas del Parley Estadístico
                  </h4>
                  <div className="space-y-3">
                    {parleyQuestions.map(q => {
                      const ans = parleyAnswers.find(a => a.questionId === q.id);
                      const isResolved = q.correctAnswer !== undefined && q.correctAnswer !== '';
                      
                      return (
                        <div key={q.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-2xs">
                          <p className="font-bold text-slate-850 leading-relaxed">{q.question}</p>
                          <div className="flex justify-between items-center text-3xs font-semibold pt-1 border-t border-slate-150">
                            <div>
                              <span className="text-slate-400">Predicción: </span>
                              <strong className="text-indigo-600">{ans?.answer || 'Sin respuesta'}</strong>
                            </div>
                            <div>
                              {isResolved ? (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
                                  Real: {q.correctAnswer} (+{ans?.points || 0} pts)
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Pendiente</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HIDDEN DOSSIER PRINT VIEW (100% styled for paper printing) */}
          <div className="hidden print:block font-sans print-only">
            
            {/* Header / Cover block */}
            <div className="print-header">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">DOSSIER DE PRONÓSTICOS OFICIAL</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Super Quiniela Mundialista 2026</p>
              </div>
              <div className="text-right">
                <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Participante</span>
                <span className="text-sm font-bold text-slate-950">{selectedUser.avatarEmoji || '⚽'} {selectedUser.name}</span>
                <span className="block text-[11px] font-extrabold text-indigo-700 mt-1">{selectedUser.totalPoints || 0} PUNTOS TOTALES</span>
              </div>
            </div>

            {/* Page 1: Group Stage */}
            <div className="print-section">
              <h2 className="text-xs font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase tracking-wider mb-3">1. FASE DE GRUPOS</h2>
              <div className="print-grid-groups">
                {groupNames.map(groupName => {
                  const groupMatches = matches.filter(m => m.group === groupName);
                  return (
                    <div key={groupName} className="border border-slate-200 p-2.5 rounded-lg">
                      <h3 className="font-extrabold text-slate-800 text-[9px] border-b border-slate-100 pb-1 mb-1.5 uppercase">{groupName}</h3>
                      <div className="space-y-1">
                        {groupMatches.map(match => {
                          const pred = predictions[match.id];
                          const isFinished = match.status === 'finished';
                          
                          return (
                            <div key={match.id} className="flex justify-between items-center text-[9px] border-b border-slate-100/50 pb-0.5">
                              <span className="truncate w-[40%] font-medium">{TEAM_FLAGS[match.teamA] || '🏳️'} {match.teamA}</span>
                              <span className="font-bold font-mono bg-slate-100 px-1 rounded text-slate-700">
                                {pred?.scoreA !== undefined ? pred.scoreA : '-'} - {pred?.scoreB !== undefined ? pred.scoreB : '-'}
                              </span>
                              <span className="truncate w-[40%] text-right font-medium">{match.teamB} {TEAM_FLAGS[match.teamB] || '🏳️'}</span>
                              <span className="text-[8px] text-slate-550 font-bold ml-1.5">
                                {isFinished ? `+${pred?.points || 0}` : 'P'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Page 2: Playoffs */}
            <div className="print-section print-page-break">
              <h2 className="text-xs font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase tracking-wider mb-3">2. FASE ELIMINATORIA (PLAYOFFS)</h2>
              <div className="print-grid-playoffs">
                {['dieciseisavos', 'octavos', 'cuartos', 'semifinales', 'tercer_lugar', 'final'].map(phase => {
                  const phaseConfigs = KNOCKOUT_MATCHES_CONFIG.filter(c => c.phase === phase);
                  
                  return phaseConfigs.map(cfg => {
                    const pred = (predictions[cfg.id] || { scoreA: undefined, scoreB: undefined, points: undefined }) as Prediction;
                    const userMatchup = userResolvedBracket[cfg.id] || { teamA: 'Pendiente', teamB: 'Pendiente' };
                    const realMatch = matches.find(m => m.id === cfg.id);
                    const isFinished = realMatch?.status === 'finished';

                    return (
                      <div key={cfg.id} className="print-match-card">
                        <div className="font-extrabold text-[8px] text-slate-400 mb-1 uppercase tracking-widest border-b border-slate-200/55 pb-0.5">
                          {getPhaseName(cfg.phase)} - {cfg.label}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-800 truncate max-w-[45%]">
                            {TEAM_FLAGS[userMatchup.teamA] || '🏳️'} {userMatchup.teamA}
                          </span>
                          <span className="font-extrabold font-mono bg-slate-200/50 px-1.5 py-0.5 rounded text-[9px]">
                            {pred.scoreA !== undefined ? pred.scoreA : '-'} - {pred.scoreB !== undefined ? pred.scoreB : '-'}
                          </span>
                          <span className="font-semibold text-slate-800 truncate max-w-[45%] text-right">
                            {userMatchup.teamB} {TEAM_FLAGS[userMatchup.teamB] || '🏳️'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[7px] text-slate-400 mt-1 border-t border-slate-100 pt-0.5">
                          <span>
                            {isFinished ? `Real: ${realMatch.teamA} ${realMatch.scoreA}-${realMatch.scoreB} ${realMatch.teamB}` : 'Pendiente'}
                          </span>
                          <span className="font-bold text-slate-800">
                            {isFinished ? `+${pred.points || 0} pts` : 'Programado'}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>

            {/* Page 3: Podium and Parley */}
            <div className="print-section print-page-break">
              <h2 className="text-xs font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase tracking-wider mb-3">3. PARLEY Y CUADRO DE HONOR</h2>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Podium table */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide border-b border-slate-100 pb-1">Cuadro de Honor (Podio)</h3>
                  <table className="w-full text-left text-[9px] border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-bold text-slate-500">🥇 Campeón:</td>
                        <td className="py-1 font-extrabold text-slate-900 text-right">{podium?.champion ? `${TEAM_FLAGS[podium.champion] || '🏳️'} ${podium.champion}` : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-bold text-slate-500">🥈 Subcampeón:</td>
                        <td className="py-1 font-extrabold text-slate-900 text-right">{podium?.runnerUp ? `${TEAM_FLAGS[podium.runnerUp] || '🏳️'} ${podium.runnerUp}` : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-bold text-slate-500">🥉 Tercer Lugar:</td>
                        <td className="py-1 font-extrabold text-slate-900 text-right">{podium?.third ? `${TEAM_FLAGS[podium.third] || '🏳️'} ${podium.third}` : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-bold text-slate-500">🏅 Cuarto Lugar:</td>
                        <td className="py-1 font-extrabold text-slate-900 text-right">{podium?.fourth ? `${TEAM_FLAGS[podium.fourth] || '🏳️'} ${podium.fourth}` : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Parley table */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide border-b border-slate-100 pb-1">Parley Estadístico</h3>
                  <div className="space-y-1.5">
                    {parleyQuestions.map(q => {
                      const ans = parleyAnswers.find(a => a.questionId === q.id);
                      const isResolved = q.correctAnswer !== undefined && q.correctAnswer !== '';
                      
                      return (
                        <div key={q.id} className="text-[8px] leading-snug border-b border-slate-100/50 pb-1">
                          <p className="font-bold text-slate-700 truncate">{q.question}</p>
                          <div className="flex justify-between items-center text-[7px] text-slate-400 mt-0.5">
                            <span>Predicción: <strong className="text-slate-900">{ans?.answer || 'Sin respuesta'}</strong></span>
                            <span>{isResolved ? `Real: ${q.correctAnswer} (+${ans?.points || 0} pts)` : 'Pendiente'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* print footer */}
              <div className="text-center text-[8px] text-slate-400 pt-10 border-t border-slate-200 mt-12">
                Documento oficial de predicciones mundialistas. Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}.
              </div>
            </div>

          </div>
            </div>
          ) : (
            <div className="no-print bg-amber-50 border border-amber-250 p-4 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>No se ha seleccionado ningún participante o el usuario no existe.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
