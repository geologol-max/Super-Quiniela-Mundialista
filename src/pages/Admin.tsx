import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, setDoc, query, orderBy, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match, UserProfile, Prediction, calculateMatchPoints, ParleyQuestion } from '../types';
import { WORLD_CUP_TEAMS } from './Parley';
import { Plus, Trash2, RefreshCw, Trophy, Users, CheckCircle } from 'lucide-react';

export function Admin() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatch, setNewMatch] = useState<Partial<Match>>({ teamA: '', teamB: '', group: '', date: '', status: 'scheduled' });
  const [isSeeding, setIsSeeding] = useState(false);
  const [parleyQuestions, setParleyQuestions] = useState<ParleyQuestion[]>([]);

  useEffect(() => {
    fetchMatches();
    fetchParley();
  }, []);

  const fetchMatches = async () => {
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    setMatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
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
      return a.question.localeCompare(b.question);
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

    const predsSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', '==', matchId)));
    for (const pDoc of predsSnap.docs) {
      const pred = pDoc.data() as Prediction;
      const points = calculateMatchPoints(pred.scoreA, pred.scoreB, scoreA, scoreB);
      await updateDoc(pDoc.ref, { points });
    }
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
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const uDoc of usersSnap.docs) {
      const userId = uDoc.id;
      const predsSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', userId)));
      let total = 0;
      predsSnap.docs.forEach(d => {
        total += (d.data().points || 0);
      });
      const parleySnap = await getDocs(query(collection(db, 'parleyAnswers'), where('userId', '==', userId)));
      parleySnap.docs.forEach(d => {
        total += (d.data().points || 0);
      });
      await updateDoc(uDoc.ref, { totalPoints: total });
    }
  };

  const seedSampleMatches = async () => {
    setIsSeeding(true);
    const sampleMatches = [
      { teamA: 'Catar', teamB: 'Ecuador', group: 'A', date: '2026-06-07T15:00:00Z', status: 'scheduled' },
      { teamA: 'Inglaterra', teamB: 'Irán', group: 'B', date: '2026-06-08T13:00:00Z', status: 'scheduled' },
      { teamA: 'Senegal', teamB: 'Países Bajos', group: 'A', date: '2026-06-08T16:00:00Z', status: 'scheduled' },
      { teamA: 'EEUU', teamB: 'Gales', group: 'B', date: '2026-06-08T19:00:00Z', status: 'scheduled' },
      { teamA: 'Argentina', teamB: 'Arabia Saudita', group: 'C', date: '2026-06-09T10:00:00Z', status: 'scheduled' },
    ];
    for (const m of sampleMatches) {
      await addDoc(collection(db, 'matches'), m);
    }
    fetchMatches();
    setIsSeeding(false);
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500">Super Quiniela Mundialista - Centro de Control</p>
        </div>
        <button 
          onClick={recalculateLeaderboard}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar Leaderboard
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Usuarios
          </div>
          <div className="text-2xl font-black text-indigo-600">Sync...</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Partidos
          </div>
          <div className="text-2xl font-black text-indigo-600">{matches.length}</div>
        </div>
      </div>

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
          <div className="flex gap-4 pt-2">
            <button onClick={handleAddMatch} className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-bold hover:bg-slate-50 transition">Crear Partido</button>
            <button onClick={seedSampleMatches} disabled={isSeeding} className="px-6 py-2 border border-white/30 rounded-lg text-white/80 hover:bg-white/10 transition">Sembrar Iniciales</button>
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
                    <div className="text-xs font-bold text-slate-400">{new Date(m.date).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
