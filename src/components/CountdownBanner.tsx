import { useState, useEffect } from 'react';
import { Clock, Lock, CheckCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Deadline of inaugural match: Thursday, June 11, 2026, 13:00 Mexico City Time (19:00:00 UTC)
export const WORLD_CUP_DEADLINE = new Date('2026-06-11T19:00:00Z');

export function getIsDeadlineReached(): boolean {
  return Date.now() >= WORLD_CUP_DEADLINE.getTime();
}

export function useDeadline() {
  const [isLocked, setIsLocked] = useState(getIsDeadlineReached());

  useEffect(() => {
    // Immediate check
    setIsLocked(getIsDeadlineReached());

    const interval = setInterval(() => {
      const current = getIsDeadlineReached();
      setIsLocked(current);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return isLocked;
}

export function CountdownBanner() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const isLocked = useDeadline();

  useEffect(() => {
    function updateCountdown() {
      const now = Date.now();
      const difference = WORLD_CUP_DEADLINE.getTime() - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format with leading zero if needed
  const pad = (num: number) => String(num).padStart(2, '0');

  return (
    <div id="countdown-banner-container" className="w-full mb-6">
      <AnimatePresence mode="wait">
        {isLocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-red-500/10 via-rose-500/5 to-amber-500/10 border-2 border-red-500/40 rounded-2xl shadow-md text-red-950"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="p-3 bg-red-600/20 text-red-600 rounded-xl animate-pulse">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-red-700">PRONÓSTICOS CERRADOS</h3>
                <p className="text-xs text-red-600 font-medium">
                  El Mundial FIFA 2026 ha comenzado (México vs Sudáfrica, Estadio Azteca). Ya no se permiten modificaciones.
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-red-600 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow">
              Fase bloqueada 🔒
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Cuenta Regresiva al Mundial 2026</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                    México vs Sudáfrica 🇲🇽🇿🇦
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los pronósticos del torneo y parley se bloquearán permanentemente al inicio del silbatazo inaugural.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Days */}
              <div className="flex flex-col items-center">
                <span className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white font-mono text-xl font-bold rounded-lg shadow-sm">
                  {pad(timeLeft.days)}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Días</span>
              </div>
              <span className="font-mono text-xl font-semibold text-slate-400 -mt-5">:</span>

              {/* Hours */}
              <div className="flex flex-col items-center">
                <span className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white font-mono text-xl font-bold rounded-lg shadow-sm">
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Hrs</span>
              </div>
              <span className="font-mono text-xl font-semibold text-slate-400 -mt-5">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <span className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white font-mono text-xl font-bold rounded-lg shadow-sm">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Min</span>
              </div>
              <span className="font-mono text-xl font-semibold text-slate-400 -mt-5">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <span className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white font-mono text-xl font-bold rounded-lg shadow-sm">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Seg</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
