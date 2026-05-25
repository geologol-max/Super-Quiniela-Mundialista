import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Send, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-center space-y-6"
      >
        <div className="inline-block p-4 bg-indigo-100 rounded-2xl mb-4">
          <Trophy className="w-16 h-16 text-indigo-600" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl font-display">
          Super Quiniela <span className="text-indigo-600">Mundialista</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Demuestra tu conocimiento futbolístico, talento en los pronósticos y capacidad de adivinación formidable. 
          Participa en la quiniela definitiva del Mundial.
        </p>
        
        <div className="grid sm:grid-cols-3 gap-6 pt-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="text-indigo-600 font-bold text-2xl mb-2">5+ Ptos</div>
            <p className="text-sm text-slate-500">Por acertar el ganador o empate de cada partido.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="text-indigo-600 font-bold text-2xl mb-2">8 Ptos</div>
            <p className="text-sm text-slate-500">Puntaje total si aciertas el marcador exacto.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="text-indigo-600 font-bold text-2xl mb-2">10 Ptos</div>
            <p className="text-sm text-slate-500">Por cada pregunta acertada en la sección Parley.</p>
          </div>
        </div>

        <div className="pt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {user ? (
            <Link 
              to="/predictions"
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 inline-block"
            >
              Ir a mis Pronósticos
            </Link>
          ) : (
            <Link 
              to="/auth"
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 inline-block"
            >
              Comenzar a Jugar
            </Link>
          )}
          
          <Link 
            to="/rules"
            className="px-8 py-4 bg-white border border-slate-205 text-slate-705 rounded-xl font-bold text-base hover:bg-slate-50 transition-all active:scale-95 inline-block shadow-sm"
          >
            📋 Ver Reglas e Instrucciones
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
