import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { Trophy, Medal, Smile, Image as ImageIcon, Check, Save, Sparkles, User, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

const PRESET_FLAGS = [
  '🇲🇽', '🇿🇦', '🇺🇸', '🇨🇦', '🇦🇷', '🇧🇷', '🇨🇴', '🇪🇨', 
  '🇵🇪', '🇺🇾', '🇫🇷', '🇪🇸', '🇩🇪', '🇮🇹', '🇵🇹', '🇬🇧', 
  '🇯🇵', '🇰🇷', '🇸🇦', '🇨🇷', '🇭🇷', '🇲🇦', '🇳🇬', '🇧🇪'
];

const PRESET_FUN = [
  '⚽', '🏆', '🥇', '🥈', '🥉', '👑', '😎', '🔥', 
  '⚡', '💪', '🔮', '🦁', '🦅', '🎯', '🏃', '🤩', 
  '📣', '🏟️', '🧤', '🍕', '🍻', '🥳', '🙌', '👽'
];

export function Dashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  // Local state for profile edits
  const [editingName, setEditingName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
  const [photoUrl, setPhotoUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync profile metadata with local state when it loads
  useEffect(() => {
    if (profile) {
      setEditingName(profile.name || '');
      setSelectedEmoji(profile.avatarEmoji || '⚽');
      setPhotoUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          totalPoints: typeof data.totalPoints === 'number' ? data.totalPoints : 0
        };
      }) as UserProfile[];

      // Sort users by totalPoints descending, and by name alphabetically as fallback
      usersData.sort((a, b) => {
        const pointsA = a.totalPoints || 0;
        const pointsB = b.totalPoints || 0;
        if (pointsB !== pointsA) {
          return pointsB - pointsA;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading leaderboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setSaveSuccess(false);

    try {
      const userRef = doc(db, 'users', profile.uid);
      await setDoc(userRef, {
        name: editingName.trim() || profile.name,
        avatarEmoji: selectedEmoji,
        avatarUrl: photoUrl.trim()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Error updating user profile:", e);
      alert("Error al guardar perfil: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Tabla de Posiciones</h1>
          <p className="text-slate-500">Compite contra tus amigos y escala en el ranking oficial</p>
        </div>
        <div className="flex items-center gap-2 self-start text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
          <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
          <span>{users.length} Participantes Activos</span>
        </div>
      </header>

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEADERBOARD TABLE (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20 text-center">Rango</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Participante</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-24">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user, index) => {
                const isCurrentUser = user.uid === profile?.uid;
                
                return (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.8) }}
                    className={`${isCurrentUser ? "bg-indigo-50/25 font-semibold" : index === 0 ? "bg-amber-50/20" : ""}`}
                  >
                    {/* Rank Badge Column */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {index === 0 ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-black shadow-sm ring-4 ring-yellow-100 text-sm">
                            1
                          </div>
                        ) : index === 1 ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-black shadow-sm ring-4 ring-slate-100 text-sm">
                            2
                          </div>
                        ) : index === 2 ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700/80 flex items-center justify-center text-white font-black shadow-sm ring-4 ring-amber-150 text-sm">
                            3
                          </div>
                        ) : (
                          <span className="text-slate-400 font-bold font-mono text-sm">{index + 1}</span>
                        )}
                      </div>
                    </td>

                    {/* Participant Avatar and Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar bubble supporting photo or emoji */}
                        <div className="w-11 h-11 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 overflow-hidden shrink-0 relative shadow-sm ring-2 ring-transparent group-hover:scale-105 transition-transform">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          
                          {/* If no URL, or if URL image fails to display, show Emoji or Name character */}
                          {!user.avatarUrl ? (
                            user.avatarEmoji ? (
                              <span className="text-2xl leading-none select-none">{user.avatarEmoji}</span>
                            ) : (
                              <span className="font-bold text-indigo-600 text-base">{user.name.charAt(0).toUpperCase()}</span>
                            )
                          ) : null}
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm sm:text-base">
                            <span>{user.name}</span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-100 text-indigo-700 rounded-full uppercase tracking-wider">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 select-all font-mono">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Points Total */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-lg sm:text-2xl font-black text-indigo-600 font-mono">{user.totalPoints}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Pts</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          
          {users.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-medium">
              No hay participantes registrados.
            </div>
          )}
        </div>

        {/* PROFILE EDITOR (1/3 width, only displayed if logged in) */}
        {profile && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Personalizar mi Perfil</h2>
            </div>

            {/* LIVE PREVIEW OF CURRENT AVATAR */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vista Previa</span>
              <div className="w-20 h-20 rounded-full bg-white border-4 border-indigo-100 flex items-center justify-center text-slate-700 overflow-hidden shadow-md relative shrink-0">
                {photoUrl.trim() ? (
                  <img 
                    src={photoUrl.trim()} 
                    alt="Previsualización" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                
                {!photoUrl.trim() ? (
                  <span className="text-5xl leading-none select-none">{selectedEmoji}</span>
                ) : null}
              </div>
              <p className="mt-3 text-base font-black text-slate-800">{editingName || profile.name}</p>
              <p className="text-xs text-slate-400 select-all font-mono">{profile.email}</p>
            </div>

            {/* FORM CONTAINER */}
            <div className="space-y-4">
              
              {/* DISPLAY NAME */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Nombre de Usuario / Participante
                </label>
                <input 
                  type="text"
                  maxLength={25}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

               {/* PHOTO URL */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Enlace de Foto (URL externa)</span>
                  {photoUrl.trim() && (
                    <button 
                      onClick={() => setPhotoUrl('')}
                      className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase"
                    >
                      Remover foto ✕
                    </button>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                  <input 
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="https://ejemplo.com/mi_foto.jpg"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Si dejas este enlace vacío, se mostrará el emoji seleccionado a continuación.
                </p>

                {/* HELP CARD FOR PHOTO UPLOAD */}
                <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl text-slate-600 text-xs space-y-1.5 font-sans">
                  <p className="font-bold text-indigo-700 text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
                    Guía rápida para poner tu foto de perfil:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>Sube tu foto favorita gratis en un servicio como <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-extrabold inline-flex items-center">postimages.org</a> o Imgur.</li>
                    <li>Copia el <strong>"Enlace Directo"</strong> (debe terminar en la extensión de la imagen como <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-red-600">.jpg</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-red-600">.png</code>, etc.).</li>
                    <li>Pega ese enlace arriba y presiona <strong>"Guardar Cambios de Perfil"</strong>. ¡Listo!</li>
                  </ol>
                </div>
              </div>

              {/* SELECT EMBEDDED EMOJI */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                  Selecciona tu Emoji ⚽
                </label>
                
                {/* PRESET FLAGS */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Banderas Mundialistas</span>
                  <div className="grid grid-cols-8 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
                    {PRESET_FLAGS.map((flag) => (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => setSelectedEmoji(flag)}
                        className={`text-xl p-1.5 rounded-lg hover:bg-white active:scale-90 transition-all flex items-center justify-center ${selectedEmoji === flag ? 'bg-white ring-2 ring-indigo-500 shadow-sm' : ''}`}
                      >
                        {flag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PRESET FUN */}
                <div className="pt-1">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Fútbol y Diversión</span>
                  <div className="grid grid-cols-8 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
                    {PRESET_FUN.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`text-xl p-1.5 rounded-lg hover:bg-white active:scale-90 transition-all flex items-center justify-center ${selectedEmoji === emoji ? 'bg-white ring-2 ring-indigo-500 shadow-sm' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SAVE ACTION BUTTON */}
              <button
                onClick={handleUpdateProfile}
                disabled={savingProfile || !editingName.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/15 active:scale-95 transition-all"
              >
                {savingProfile ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingProfile ? 'Guardando...' : saveSuccess ? '¡Guardado con éxito!' : 'Guardar Cambios de Perfil'}
              </button>

              {saveSuccess && (
                <div className="text-center text-xs font-bold text-emerald-600 animate-pulse">
                  ✓ ¡Tu avatar se ha actualizado en tiempo real en la quiniela!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
