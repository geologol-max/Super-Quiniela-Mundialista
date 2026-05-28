import { useEffect, useState } from 'react';
import { collection, query, doc, setDoc, getDocs, where, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDeadline } from '../components/CountdownBanner';
import { ParleyQuestion, ParleyAnswer } from '../types';
import { HelpCircle, Save, CheckCircle2, AlertCircle, Trophy, Loader2, Info, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const qArr = user ? query(collection(db, 'parleyAnswers'), where('userId', '==', user.uid)) : null;
        
        let [snap, ansSnap] = await Promise.all([
          getDocs(collection(db, 'parleyQuestions')),
          qArr ? getDocs(qArr) : Promise.resolve(null)
        ]);

        const existingIds = snap.docs.map(d => d.id);
        const hasAllSeeds = PARLEY_SEEDS.every(s => existingIds.includes(s.id));
        const isAdminUser = user?.email?.toLowerCase() === 'geologol@gmail.com';
        
        if (isAdminUser && (snap.empty || !hasAllSeeds)) {
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

        // 2. Map user answers
        if (ansSnap) {
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

      {/* SECCIÓN DE INSTRUCCIONES Y REGLAS DE PARLEY (COLAPSABLE) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-slate-800 font-black font-display text-sm">
            <Info className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span>📌 Guía del Parley: ¿Cómo registrar tus respuestas y sumar Puntos?</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-505 font-semibold hidden sm:inline">
              {showRules ? "Ocultar guía" : "Ver reglas del Parley, puntajes e instrucciones"}
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
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* CARD 1: REGLAS Y PUNTOS */}
                  <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-600" />
                      <h4 className="font-black text-slate-800 font-display">Reglas del Super Parley</h4>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                      <li>Cada respuesta correcta al finalizar el torneo otorga <strong className="text-amber-800 font-extrabold">+10 Puntos</strong> directos a tu acumulado.</li>
                      <li>Las opciones involucran estadísticas de alta precisión como: <span className="font-bold">goleador, total de tarjetas amarillas/rojas, total de goles totales, penales anotados y tiros libres</span>.</li>
                      <li>No se admiten aciertos parciales; la respuesta declarada oficialmente por el Administrador al término del torneo decidirá quién suma de forma perfecta.</li>
                    </ul>
                  </div>

                  {/* CARD 2: CÓMO LLENAR Y ESCALABILIDAD */}
                  <div className="bg-indigo-50/40 border border-indigo-100/70 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-black text-slate-800 font-display">Instrucciones de Llenado y Respaldo</h4>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                      <li><strong className="text-indigo-900 font-bold">Respuesta Individual:</strong> Escribe tu predicción y presiona el botón gris con forma de disco al lado de la pregunta. Esto guardará de manera independiente esa sola respuesta en tiempo real.</li>
                      <li><strong className="text-indigo-900 font-bold">Llenado Masivo:</strong> Completa las preguntas y haz clic arriba en el botón negro de cabecera <strong className="font-extrabold">"Guardar Todo el Parley"</strong> para guardar todas juntas de manera atómica de una sola vez.</li>
                      <li><strong className="text-indigo-900 font-bold">Soporte Multiusuario:</strong> ¡Tus predicciones son totalmente seguras, independientes de otros participantes y privadas bajo tu correo!</li>
                    </ul>
                  </div>

                </div>

                {/* WARNING DEADLINE */}
                <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100/50 text-rose-800 rounded-xl text-xs">
                  <Clock className="w-5 h-5 text-rose-500 flex-shrink-0 animate-pulse" />
                  <p className="font-medium">
                    <strong className="text-rose-900 font-extrabold">🚨 CIERRE DE INSCRIPCIÓN:</strong> Al igual que la fase de grupos, no se podrán realizar ni modificar predicciones de Parley una vez inicie el partido inaugural del Mundial. ¡Sé preventivo!
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
