import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Trophy, Medal, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Tabla de Posiciones</h1>
          <p className="text-slate-500">Actualizado al término de cada jornada</p>
        </div>
        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm font-bold">
          <Trophy className="w-4 h-4" />
          {users.length} Participantes
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20">Rango</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Participante</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user, index) => (
              <motion.tr 
                key={user.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={index === 0 ? "bg-yellow-50/30" : ""}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    {index === 0 ? (
                      <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold shadow-sm ring-4 ring-yellow-100">
                        1
                      </div>
                    ) : index === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-white font-bold shadow-sm ring-4 ring-slate-100">
                        2
                      </div>
                    ) : index === 2 ? (
                      <div className="w-8 h-8 rounded-full bg-amber-600/60 flex items-center justify-center text-white font-bold shadow-sm ring-4 ring-amber-100">
                        3
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">{index + 1}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xl font-black text-indigo-600">{user.totalPoints}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
