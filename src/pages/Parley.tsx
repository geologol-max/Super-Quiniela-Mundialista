import { useEffect, useState } from 'react';
import { collection, query, doc, setDoc, getDocs, where, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDeadline } from '../components/CountdownBanner';
import { ParleyQuestion, ParleyAnswer } from '../types';
import { HelpCircle, Save, CheckCircle2, AlertCircle, Trophy, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export const WORLD_CUP_TEAMS = [
  "Alemania", "Arabia Saudita", "Argelia", "Argentina", "Australia", "Austria", 
  "Bélgica", "Bosnia y Herzegovina", "Brasil", "Cabo Verde", "Canadá", "Colombia", 
  "Corea del Sur", "Costa de Marfil", "Croacia", "Curazao", "Dinamarca", "Ecuador", 
  "Egipto", "Escocia", "España", "Estados Unidos", "Francia", "Ghana", "Haití", 
  "Inglaterra", "Irak", "Irán", "Japón", "Jordania", "Marruecos", "México", 
  "Noruega", "Nueva Zelanda", "Países Bajos", "Panamá", "Paraguay", "Portugal", 
  "Qatar", "República Checa", "República Democrática del Congo", "Senegal", 
  "Sudáfrica", "Suecia", "Túnez", "Turquía", "Uruguay", "Uzbekistán"
];

export const PARLEY_SEEDS: Omit<ParleyQuestion, 'correctAnswer'>[] = [
  { id: 'favorite_team', question: '1) Equipo Favorito (Selección Mundial 2026)', options: WORLD_CUP_TEAMS, points: 10, type: 'select' },
  { id: 'top_scorer', question: '2) Goleador del Mundial (Nombre del Jugador)', options: [], points: 10, type: 'text' },
  { id: 'top_scorer_goals', question: '3) Cantidad de Goles del Goleador del Mundial', options: [], points: 10, type: 'number' },
  { id: 'total_goals', question: '4) Cantidad de Goles Anotados en el Mundial', options: [], points: 10, type: 'number' },
  { id: 'yellow_cards', question: '5) Cantidad de Tarjetas Amarillas', options: [], points: 10, type: 'number' },
  { id: 'red_cards', question: '6) Cantidad de Tarjetas Rojas', options: [], points: 10, type: 'number' },
  { id: 'penalty_goals', question: '7) Cantidad de Goles de Penales (Solo en Fase de Grupos)', options: [], points: 10, type: 'number' },
  { id: 'freekick_goals', question: '8) Cantidad de Goles de Tiro Libre', options: [], points: 10, type: 'number' }
];

export function Parley() {
  const { user } = useAuth();
  const isLocked = useDeadline();
  const [questions, setQuestions] = useState<ParleyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        // 1. Fetch questions and check if healing / seeding is needed
        let snap = await getDocs(collection(db, 'parleyQuestions'));
        const existingIds = snap.docs.map(d => d.id);
        const hasAllSeeds = PARLEY_SEEDS.every(s => existingIds.includes(s.id));
        
        if (snap.empty || !hasAllSeeds) {
          try {
            for (const s of PARLEY_SEEDS) {
              await setDoc(doc(db, 'parleyQuestions', s.id), s);
            }
            snap = await getDocs(collection(db, 'parleyQuestions'));
          } catch (writeErr) {
            console.warn("Could not seed parley questions:", writeErr);
          }
        }
        
        // Ensure accurate order based on PARLEY_SEEDS ordering
        const loadedQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() } as ParleyQuestion));
        const sortedQuestions = PARLEY_SEEDS.map(seed => {
          const found = loadedQuestions.find(q => q.id === seed.id);
          return found || { ...seed, id: seed.id } as ParleyQuestion;
        });
        
        setQuestions(sortedQuestions);

        // 2. Fetch user answers
        if (user) {
          const qArr = query(collection(db, 'parleyAnswers'), where('userId', '==', user.uid));
          const ansSnap = await getDocs(qArr);
          const ansMap: Record<string, string> = {};
          ansSnap.docs.forEach(d => {
            const data = d.data() as ParleyAnswer;
            ansMap[data.questionId] = data.answer;
          });
          setAnswers(ansMap);
        }
      } catch (error) {
        console.error("Error loading parley page:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [user]);

  const handleSave = async (questionId: string) => {
    if (!user || answers[questionId] === undefined) return;
    if (isLocked) {
      alert("El mundial ha comenzado. Registro de parley cerrado.");
      return;
    }
    setSaving(questionId);
    
    try {
      const ansId = `${user.uid}_${questionId}`;
      await setDoc(doc(db, 'parleyAnswers', ansId), {
        userId: user.uid,
        questionId,
        answer: answers[questionId],
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error saving parley answer:", err);
    } finally {
      setTimeout(() => setSaving(null), 1000);
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    if (isLocked) {
      alert("El mundial ha comenzado. Registro de parley cerrado.");
      return;
    }
    setGlobalSaving(true);
    try {
      const promises = Object.entries(answers).map(([questionId, ansVal]) => {
        const ansId = `${user.uid}_${questionId}`;
        return setDoc(doc(db, 'parleyAnswers', ansId), {
          userId: user.uid,
          questionId,
          answer: ansVal,
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(promises);
      alert('¡Todos tus pronósticos de Parley han sido guardados correctamente!');
    } catch (err) {
      console.error("Error saving all parley answers:", err);
      alert('Ocurrió un error al guardar tus respuestas.');
    } finally {
      setGlobalSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-2xl mb-1 text-indigo-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black font-display tracking-tight">Super Parley Mundialista</h1>
          <p className="text-slate-400 font-sans text-sm max-w-xl">
            Suma <span className="text-white font-bold text-indigo-300">10 Puntos</span> por cada acierto perfecto. Estos pronósticos especiales recompensan el conocimiento profundo y el análisis estadístico del torneo.
          </p>
        </div>
        <div>
          <button
            onClick={handleSaveAll}
            disabled={globalSaving || isLocked}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {globalSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Todo el Parley
          </button>
        </div>
      </header>

      <div className="grid gap-6">
        {questions.map((q, idx) => (
          <motion.div 
            key={q.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md hover:border-indigo-150 transition-all group"
          >
            <div className="absolute top-0 right-0 p-2">
              <span className="bg-amber-50 text-amber-700 text-[10px] font-black tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-amber-100 uppercase">
                +10 PTS
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <label className="block text-base font-black text-slate-800 font-display tracking-tight leading-snug">
                {q.question}
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {q.type === 'select' ? (
                  <select
                    value={answers[q.id] || ''}
                    disabled={isLocked}
                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800 text-sm transition-all disabled:opacity-50"
                  >
                    <option value="">-- Selecciona un País --</option>
                    {WORLD_CUP_TEAMS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type={q.type || 'text'}
                    placeholder={q.type === 'number' ? "Ingresa una cifra numérica..." : "Escribe tu respuesta aquí..."}
                    value={answers[q.id] || ''}
                    disabled={isLocked}
                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800 text-sm transition-all disabled:opacity-50"
                    min={q.type === 'number' ? "0" : undefined}
                  />
                )}

                <button 
                  onClick={() => handleSave(q.id)}
                  disabled={saving === q.id || isLocked}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    saving === q.id 
                      ? 'bg-green-100 text-green-600 shadow-inner' 
                      : 'bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white hover:shadow-md hover:shadow-indigo-100'
                  }`}
                  title="Guardar esta única respuesta"
                >
                  {saving === q.id ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <span>Guardado</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 flex-shrink-0" />
                      <span className="sm:hidden">Guardar Pregunta</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex gap-4 text-amber-800 text-sm shadow-sm">
        <AlertCircle className="w-6 h-6 flex-shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="font-bold">Instrucciones Importantes del Parley</p>
          <p className="text-amber-700">
            Asegúrate de llenar cada uno de los campos correctamente. Puedes guardar de forma individual usando el botón al costado de cada pregunta o guardar todo el formulario de una sola vez con el botón superior.
          </p>
        </div>
      </div>
    </div>
  );
}
