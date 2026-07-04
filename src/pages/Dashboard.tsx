import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs, getDocsFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { Trophy, Medal, Smile, Image as ImageIcon, Check, Save, Sparkles, User, RefreshCw, AlertCircle, Users, BarChart2, Clock, Target, Zap, Wifi, WifiOff } from 'lucide-react';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { profile } = useAuth();

  // Force reload from server by incrementing refreshKey
  const handleForceRefresh = useCallback(() => {
    setLoading(true);
    setRefreshKey(prev => prev + 1);
  }, []);

  // Local state for profile edits
  const [editingName, setEditingName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
  const [photoUrl, setPhotoUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showOctavosWelcome, setShowOctavosWelcome] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hide_octavos_welcome') !== 'true';
    }
    return true;
  });

  const handleDismissWelcome = () => {
    localStorage.setItem('hide_octavos_welcome', 'true');
    setShowOctavosWelcome(false);
  };

  // Sync profile metadata with local state when it loads
  useEffect(() => {
    if (profile) {
      setEditingName(profile.name || '');
      setSelectedEmoji(profile.avatarEmoji || '⚽');
      setPhotoUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const parseUsersSnapshot = (docs: any[]): UserProfile[] => {
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
        };
      }) as UserProfile[];
    };

    const sortUsers = (arr: UserProfile[]) => {
      arr.sort((a, b) => {
        const pointsA = a.totalPoints || 0;
        const pointsB = b.totalPoints || 0;
        if (pointsB !== pointsA) return pointsB - pointsA;
        return a.name.localeCompare(b.name);
      });
      return arr;
    };

    async function loadUsers() {
      console.log(`[Dashboard] Loading users (refresh #${refreshKey})...`);

      // STEP 1: Try to read ALL users directly from server first
      // This bypasses cache and gives us a clear success/failure signal
      try {
        const serverSnap = await getDocsFromServer(collection(db, 'users'));
        if (!isMounted) return;
        
        const serverUsers = sortUsers(parseUsersSnapshot(serverSnap.docs));
        console.log(`[Dashboard] ✅ Server read SUCCESS: ${serverUsers.length} users`);
        
        setUsers(serverUsers);
        setIsConnected(true);
        setLoadError(null);
        setLastRefresh(new Date());
        setLoading(false);
      } catch (serverError: any) {
        console.error(`[Dashboard] ❌ Server read FAILED:`, serverError);
        if (!isMounted) return;
        
        setIsConnected(false);
        
        // Try fallback with getDocs (which uses cache)
        try {
          const fallbackSnap = await getDocs(collection(db, 'users'));
          if (!isMounted) return;
          
          const fallbackUsers = sortUsers(parseUsersSnapshot(fallbackSnap.docs));
          console.log(`[Dashboard] ⚠️ Fallback (cache): ${fallbackUsers.length} users`);
          setUsers(fallbackUsers);
        } catch (e2) {
          console.error(`[Dashboard] ❌ Fallback also failed:`, e2);
        }
        
        // Set a detailed error message
        const errCode = serverError?.code || '';
        const errMsg = serverError?.message || String(serverError);
        
        if (errCode === 'permission-denied' || errMsg.includes('permission')) {
          setLoadError(
            `⛔ PERMISOS DENEGADOS: Firestore rechazó la lectura de la colección "users". ` +
            `Esto significa que las Reglas de Seguridad de Firestore NO están publicadas correctamente. ` +
            `Ve a la consola de Firebase → Firestore → Reglas, y verifica que las reglas permitan lectura para usuarios autenticados. ` +
            `Base de datos: "${db.toJSON ? JSON.stringify((db as any)._databaseId) : 'default'}". ` +
            `Error original: ${errMsg}`
          );
        } else {
          setLoadError(`Error al leer participantes del servidor: ${errMsg}. Se muestran datos locales si disponibles.`);
        }
        setLoading(false);
      }

      // STEP 2: Set up real-time listener for ongoing updates
      unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!isMounted) return;
        const source = snapshot.metadata.fromCache ? 'CACHE' : 'SERVER';
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        console.log(`[Dashboard] onSnapshot: ${snapshot.docs.length} users (source: ${source}, pendingWrites: ${hasPendingWrites})`);
        
        const usersData = sortUsers(parseUsersSnapshot(snapshot.docs));
        setUsers(usersData);
        setLastRefresh(new Date());
        
        if (!snapshot.metadata.fromCache) {
          // We got a server response — data is fresh
          setIsConnected(true);
          setLoadError(null);
        }
      }, (error) => {
        console.error("[Dashboard] onSnapshot error:", error);
        // Don't overwrite users data — keep whatever we loaded initially
        setIsConnected(false);
        if (!loadError) {
          // Only set error if we don't already have one from the initial load
          if (error.code === 'permission-denied') {
            setLoadError(
              `⛔ Error de permisos en tiempo real: Firestore rechazó la suscripción a "users". ` +
              `Las reglas de seguridad necesitan permitir lectura a usuarios autenticados. ` +
              `Código: ${error.code}`
            );
          }
        }
      });
    }

    loadUsers();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [refreshKey]);

  // Memoize current user stats
  const myStats = useMemo(() => {
    if (!profile) return null;
    const predCount = profile.predictionsCount || 0;
    const parlCount = profile.parleyCount || 0;
    const isCompleted = profile.completed || (predCount === 72 && parlCount === 8);
    const totalPending = (72 - predCount) + (8 - parlCount);
    return { predCount, parlCount, isCompleted, totalPending };
  }, [profile]);

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
      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex gap-3 items-start shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 animate-pulse" />
          <div>
            <p className="font-bold">Error de conexión con la base de datos (Firestore)</p>
            <p className="text-xs mt-1 leading-relaxed">{loadError}</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Tabla de Posiciones</h1>
          <p className="text-slate-500">Compite contra tus amigos y escala en el ranking oficial</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          {/* Connection status indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'En vivo' : 'Cache'}</span>
          </div>
          {/* Participant count */}
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
            <span>{users.length} Participantes</span>
          </div>
          {/* Refresh button */}
          <button
            onClick={handleForceRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-50 border border-slate-200"
            title="Forzar recarga de datos desde el servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recargar</span>
          </button>
        </div>
      </header>

      {/* WELCOME TO OCTAVOS BANNER */}
      {showOctavosWelcome && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 border border-purple-500/30 text-white shadow-xl shadow-purple-500/5"
        >
          {/* Subtle glow background */}
          <div className="absolute inset-0 bg-radial-gradient from-purple-500/10 via-transparent to-transparent pointer-events-none" />
          
          {/* Floating animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-purple-400/20 text-lg select-none"
                initial={{
                  x: Math.random() * 300,
                  y: Math.random() * 200,
                  scale: 0.5 + Math.random() * 0.8,
                  opacity: 0.1
                }}
                animate={{
                  y: [null, Math.random() * -100 - 50],
                  opacity: [0.1, 0.4, 0.1],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 8 + Math.random() * 6,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 5
                }}
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`
                }}
              >
                {['✨', '⭐', '⚽', '🏆'][i % 4]}
              </motion.span>
            ))}
          </div>

          <div className="relative z-10 flex gap-4 items-start justify-between">
            <div className="flex gap-3 sm:gap-4 items-start flex-col sm:flex-row">
              {/* Animated Trophy Icon Container */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  repeatType: "mirror"
                }}
                className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20 shrink-0"
              >
                <Trophy className="w-6 h-6 text-white" />
              </motion.div>

              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black tracking-widest text-purple-300 uppercase bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/25">
                    Fase Final
                  </span>
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Octavos de Final
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-white leading-tight">
                  ¡Bienvenidos a los Octavos de Final!
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium">
                  Si has llegado hasta aquí y aún sigues sumando en tu quiniela, <strong className="text-yellow-400">¡muchas felicidades!</strong> 🥳🔥
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Recuerda: los puntos de esta fase se calculan incluyendo la clasificación (+3 pts) y el marcador final oficial. ¡Que ganen tus favoritos!
                </p>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismissWelcome}
              className="p-2 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded-xl transition-all shrink-0 border border-white/5"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}

      {/* RE-SHOW PILL (Visible if closed, to be friendly to users) */}
      {!showOctavosWelcome && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-start"
        >
          <button 
            onClick={() => {
              localStorage.removeItem('hide_octavos_welcome');
              setShowOctavosWelcome(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/20 text-purple-200 hover:text-white rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm hover:shadow-purple-500/5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Ver nota de Octavos</span>
          </button>
        </motion.div>
      )}

      {/* PERSONAL STATUS CARD — Visible for logged-in users */}
      {profile && myStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`p-6 rounded-3xl border shadow-lg relative overflow-hidden ${
            myStats.isCompleted 
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200' 
              : 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200'
          }`}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 p-6 opacity-[0.07]">
            <Target className="w-32 h-32" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar and name */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-700 overflow-hidden shadow-md">
                {profile.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-3xl leading-none select-none">{profile.avatarEmoji || '⚽'}</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">{profile.name || 'Participante'}</h2>
                <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
              </div>
            </div>

            {/* Progress stats */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Match predictions */}
              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-500" />
                  Partidos
                </div>
                <div className="text-2xl font-black text-indigo-600 font-mono leading-none">{myStats.predCount}<span className="text-xs text-slate-400 font-sans font-bold">/72</span></div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${myStats.predCount === 72 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.round((myStats.predCount / 72) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Parley */}
              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Parley
                </div>
                <div className="text-2xl font-black text-amber-600 font-mono leading-none">{myStats.parlCount}<span className="text-xs text-slate-400 font-sans font-bold">/8</span></div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${myStats.parlCount === 8 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.round((myStats.parlCount / 8) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Points */}
              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  Puntos
                </div>
                <div className="text-2xl font-black text-slate-800 font-mono leading-none">{profile.totalPoints}<span className="text-xs text-slate-400 font-sans font-bold ml-1">pts</span></div>
              </div>

              {/* Status */}
              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3 text-emerald-500" />
                  Estado
                </div>
                {myStats.isCompleted ? (
                  <div className="flex items-center gap-1.5">
                    <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                    <span className="text-sm font-black text-emerald-700">Completado</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-black text-amber-700">Pendiente</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Faltan {72 - myStats.predCount} partidos y {8 - myStats.parlCount} parleys
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* UNIFIED LEADERBOARD TABLE (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-black font-display text-slate-800">Clasificación General</h3>
            <span className="ml-auto text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              {users.length} inscritos
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-16 text-center font-display">Pos</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Participante</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-32 font-display">Partidos</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-28 font-display">Parley</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24 font-display">Estado</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-20 font-display">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user, index) => {
                    const isCurrentUser = user.uid === profile?.uid;
                    const predCount = user.predictionsCount || 0;
                    const predPct = Math.round((predCount / 72) * 100);
                    const parlCount = user.parleyCount || 0;
                    const parlPct = Math.round((parlCount / 8) * 100);
                    const isCompleted = user.completed || (predCount === 72 && parlCount === 8);
                    
                    return (
                      <motion.tr 
                        key={user.uid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.6) }}
                        className={`${isCurrentUser ? "bg-indigo-50/30 font-semibold" : index === 0 ? "bg-amber-50/20" : ""}`}
                      >
                        {/* Rank */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center">
                            {index === 0 ? (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-black shadow-sm ring-4 ring-yellow-100 text-sm">1</div>
                            ) : index === 1 ? (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-black shadow-sm ring-4 ring-slate-100 text-sm">2</div>
                            ) : index === 2 ? (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700/80 flex items-center justify-center text-white font-black shadow-sm ring-4 ring-amber-100 text-sm">3</div>
                            ) : (
                              <span className="text-slate-400 font-bold font-mono text-sm">{index + 1}</span>
                            )}
                          </div>
                        </td>

                        {/* Participant */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 overflow-hidden shrink-0 shadow-sm">
                              {user.avatarUrl ? (
                                <img 
                                  src={user.avatarUrl} 
                                  alt={user.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : null}
                              {!user.avatarUrl ? (
                                user.avatarEmoji ? (
                                  <span className="text-xl leading-none select-none">{user.avatarEmoji}</span>
                                ) : (
                                  <span className="font-bold text-indigo-600 text-sm">{(user.name || 'P').charAt(0).toUpperCase()}</span>
                                )
                              ) : null}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                <span>{user.name || 'Participante'}</span>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-100 text-indigo-700 rounded-full uppercase tracking-wider">Tú</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 select-all font-mono">{user.email || 'Sin correo'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Match Predictions Progress */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1 max-w-[120px]">
                            <div className="flex justify-between text-[11px] font-mono font-black text-slate-600">
                              <span>{predCount}/72</span>
                              <span>{predPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${predCount === 72 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${predPct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Parley Progress */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1 max-w-[110px]">
                            <div className="flex justify-between text-[11px] font-mono font-black text-slate-600">
                              <span>{parlCount}/8</span>
                              <span>{parlPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${parlCount === 8 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${parlPct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm leading-none">
                              <Check className="w-3 h-3 stroke-[3]" /> Listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-sm leading-none" title={`${72 - predCount} partidos y ${8 - parlCount} parleys pendientes`}>
                              <Clock className="w-3 h-3 text-amber-500 stroke-[3]" /> Pendiente
                            </span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-lg font-black text-indigo-600 font-mono">{user.totalPoints}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">pts</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-slate-100">
              {users.map((user, index) => {
                const isCurrentUser = user.uid === profile?.uid;
                const predCount = user.predictionsCount || 0;
                const predPct = Math.round((predCount / 72) * 100);
                const parlCount = user.parleyCount || 0;
                const parlPct = Math.round((parlCount / 8) * 100);
                const isCompleted = user.completed || (predCount === 72 && parlCount === 8);

                return (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.6) }}
                    className={`p-4 ${isCurrentUser ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {/* Rank */}
                      <div className="flex-shrink-0">
                        {index === 0 ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-sm">1</div>
                        ) : index === 1 ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-black text-xs shadow-sm">2</div>
                        ) : index === 2 ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-black text-xs shadow-sm">3</div>
                        ) : (
                          <span className="w-7 h-7 flex items-center justify-center text-slate-400 font-bold font-mono text-xs">{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : user.avatarEmoji ? (
                          <span className="text-lg leading-none select-none">{user.avatarEmoji}</span>
                        ) : (
                          <span className="font-bold text-indigo-600 text-xs">{(user.name || 'P').charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name + Points */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                          {user.name || 'Participante'}
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black bg-indigo-100 text-indigo-700 rounded-full uppercase flex-shrink-0">Tú</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{user.email || 'Sin correo'}</div>
                      </div>

                      {/* Points */}
                      <div className="flex-shrink-0 text-right">
                        <span className="text-lg font-black text-indigo-600 font-mono">{user.totalPoints}</span>
                        <span className="text-[9px] text-slate-400 font-bold block">pts</span>
                      </div>
                    </div>

                    {/* Mobile progress bars */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono font-black text-slate-500 mb-0.5">
                          <span>Partidos</span>
                          <span>{predCount}/72</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${predCount === 72 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${predPct}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-mono font-black text-slate-500 mb-0.5">
                          <span>Parley</span>
                          <span>{parlCount}/8</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${parlCount === 8 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${parlPct}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="mt-2 flex justify-end">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Completado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-2.5 h-2.5 stroke-[3]" /> Pendiente
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-medium">
                No hay participantes registrados.
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-800 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Tabla unificada de todos los inscritos
            </p>
            <p className="text-indigo-700 leading-relaxed">
              Todos los participantes registrados aparecen aquí con su progreso de pronósticos y puntos. Los puntos se actualizarán automáticamente cuando el administrador cargue los resultados reales de cada partido una vez iniciado el mundial.
            </p>
          </div>
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
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
