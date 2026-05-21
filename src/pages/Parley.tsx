import { useEffect, useState } from 'react';
import { collection, query, doc, setDoc, getDocs, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ParleyQuestion, ParleyAnswer } from '../types';
import { HelpCircle, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Parley() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ParleyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Seed questions if empty (Admin usually does this)
    const fetchQuestions = async () => {
      const snap = await getDocs(collection(db, 'parleyQuestions'));
      if (snap.empty) {
        // Sample questions
        const samples = [
          { question: '¿Quién será el campeón del mundo?', options: [], points: 10 },
          { question: '¿Quién será el máximo goleador?', options: [], points: 10 },
          { question: '¿Qué selección será la sorpresa del torneo?', options: [], points: 10 },
          { question: '¿Quién ganará el guante de oro (mejor portero)?', options: [], points: 10 }
        ];
        for (const s of samples) {
          await addDoc(collection(db, 'parleyQuestions'), s);
        }
        const newSnap = await getDocs(collection(db, 'parleyQuestions'));
        setQuestions(newSnap.docs.map(d => ({ id: d.id, ...d.data() } as ParleyQuestion)));
      } else {
        setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ParleyQuestion)));
      }
    };

    const fetchUserAnswers = async () => {
      if (user) {
        const qArr = query(collection(db, 'parleyAnswers'), where('userId', '==', user.uid));
        const snap = await getDocs(qArr);
        const ansMap: Record<string, string> = {};
        snap.docs.forEach(d => {
          const data = d.data() as ParleyAnswer;
          ansMap[data.questionId] = data.answer;
        });
        setAnswers(ansMap);
      }
      setLoading(false);
    };

    fetchQuestions();
    fetchUserAnswers();
  }, [user]);

  const handleSave = async (questionId: string) => {
    if (!user || !answers[questionId]) return;
    setSaving(questionId);
    
    const ansId = `${user.uid}_${questionId}`;
    await setDoc(doc(db, 'parleyAnswers', ansId), {
      userId: user.uid,
      questionId,
      answer: answers[questionId],
      updatedAt: new Date().toISOString()
    });
    
    setTimeout(() => setSaving(null), 1000);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-full mb-2">
          <HelpCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Sección Parley</h1>
        <p className="text-slate-500 italic max-w-lg mx-auto">
          "Estas preguntas tendrán un valor mucho mayor pues las probabilidades de acertar son muy azarosas."
        </p>
      </header>

      <div className="grid gap-6">
        {questions.map((q, idx) => (
          <motion.div 
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2">
               <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-bl-xl border-l border-b border-yellow-200">
                10 PUNTOS
               </span>
            </div>

            <div className="space-y-4">
              <label className="block text-lg font-bold text-slate-800">{q.question}</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Tu respuesta..."
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button 
                  onClick={() => handleSave(q.id)}
                  className={`px-4 py-3 rounded-xl transition-all ${
                    saving === q.id ? 'bg-green-100 text-green-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {saving === q.id ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p>Asegúrate de llenar todos los datos. El plazo máximo es hasta el jueves 07 de Junio.</p>
      </div>
    </div>
  );
}
