import { motion } from 'motion/react';
import { 
  Trophy, BookOpen, Clock, Users, ShieldCheck, 
  HelpCircle, ArrowRight, CheckCircle2, ChevronRight, 
  Sparkles, Star, Target, FileText, Smile, Medal
} from 'lucide-react';

export function Rules() {
  const pointsExamples = [
    {
      title: "⚽ Acierto Exacto (8 Ptos)",
      desc: "Adivinas tanto el ganador/empate como el marcador exacto de ambos equipos.",
      example: {
        real: "Argentina 2 - 1 Brasil",
        pred: "Argentina 2 - 1 Brasil",
        points: "8 Puntos"
      },
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-250",
      accentLine: "border-l-4 border-emerald-500"
    },
    {
      title: "🥅 Acierto Parcial (6 Ptos)",
      desc: "Adivinas el ganador/empate y la cantidad de goles de uno de los equipos.",
      example: {
        real: "Argentina 2 - 1 Brasil",
        pred: "Argentina 2 - 0 Brasil (ó 3 - 1)",
        points: "6 Puntos"
      },
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-250",
      accentLine: "border-l-4 border-indigo-500"
    },
    {
      title: "🏃‍♂️ Acierto Básico (5 Ptos)",
      desc: "Adivinas quién gana o si hay empate, pero no los goles de ningún equipo.",
      example: {
        real: "Argentina 2 - 1 Brasil",
        pred: "Argentina 1 - 0 Brasil (ó 3 - 0)",
        points: "5 Puntos"
      },
      badgeColor: "bg-amber-100 text-amber-800 border-amber-250",
      accentLine: "border-l-4 border-amber-500"
    },
    {
      title: "❌ Sin Puntos (0 Ptos)",
      desc: "No adivinas el resultado final (ej. si empatan o gana el otro equipo).",
      example: {
        real: "Argentina 2 - 1 Brasil",
        pred: "Argentina 1 - 1 Brasil (ó 0 - 2)",
        points: "0 Puntos"
      },
      badgeColor: "bg-rose-100 text-rose-800 border-rose-250",
      accentLine: "border-l-4 border-rose-500"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* Header Banner */}
      <header className="relative bg-slate-900 text-white p-8 sm:p-12 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 opacity-90" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-550/30">
            <BookOpen className="w-4 h-4 animate-pulse" />
            Reglamento Oficial e Instrucciones
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">
            ¿Cómo participar y ganar puntos en la <span className="text-indigo-400">Super Quiniela</span>?
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Hemos diseñado esta plataforma para que sea fácil, dinámica y emocionante. Lee atentamente esta guía completa para configurar tu cuenta, registrar tus pronósticos y escalar a la cima de la tabla de posiciones.
          </p>
        </div>
      </header>

      {/* QUICK INSTRUCTIONS (STEPS TO PARTICIPATE) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-850 font-display">Guía Paso a Paso para Participar</h2>
            <p className="text-xs text-slate-400">Sigue este camino sencillo para tener tu perfil listo antes del partido inaugural.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          
          {/* STEP 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 text-xs bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-md">
              Paso 1
            </span>
            <div className="space-y-3 mt-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Smile className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Crea tu Cuenta</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Regístrate rápidamente con tu correo y contraseña independiente en la pantalla de inicio.
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-405 font-semibold uppercase tracking-wider">
              Seguro e Individual
            </div>
          </div>

          {/* STEP 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 text-xs bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-md">
              Paso 2
            </span>
            <div className="space-y-3 mt-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Personaliza tu Perfil</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ve a tu <strong>Dashboard</strong> y sube tu foto real o escoge un emoji divertido. ¡Dile a tus amigos quién eres en la tabla!
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-indigo-605 font-semibold uppercase tracking-wider">
              Enlace Web ó Emoji
            </div>
          </div>

          {/* STEP 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 text-xs bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-md">
              Paso 3
            </span>
            <div className="space-y-3 mt-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-705">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Llenar Pronósticos</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ingresa a la sección <strong>Pronósticos</strong>. Verás los 72 partidos de grupos organizados por pestañas. Rellena tus marcadores y guarda.
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-emerald-605 font-semibold uppercase tracking-wider">
              Grupo por Grupo
            </div>
          </div>

          {/* STEP 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 text-xs bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-md">
              Paso 4
            </span>
            <div className="space-y-3 mt-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-705">
                <Trophy className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Completa el Parley</h3>
              <p className="text-xs text-slate-505 leading-relaxed">
                Responde las preguntas estadísticas del <strong>Parley</strong> (como goleador o tarjetas totales). ¡Suman 10 puntos de oro cada una!
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-rose-600 font-semibold uppercase tracking-wider">
              Estadísticas Especiales
            </div>
          </div>

        </div>
      </section>

      {/* CORE RULE COMPONENT AND SCORING DETAILS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 font-display">Reglas de Puntuación Detalladas</h2>
            <p className="text-xs text-slate-400">Así es exactamente como se calculan tus puntos automáticamente al terminar cada encuentro.</p>
          </div>
        </div>

        {/* EXAMPLES CONTAINER */}
        <div className="grid gap-6 sm:grid-cols-2">
          {pointsExamples.map((item, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs ${item.accentLine}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm font-display">{item.title}</h3>
                  <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${item.badgeColor}`}>
                    {item.example.points}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>

              {/* DEMO CARD */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Datos del encuentro</span>
                  <span className="text-slate-600">Ejemplo práctico</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Resultado Real:</span>
                    <strong className="text-slate-700">{item.example.real}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Tu Pronóstico:</span>
                    <strong className="text-indigo-600">{item.example.pred}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ADDITIONAL DETAILS: PODIUM & PARLEY & PLATFORM FEATURES */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* PODIUM RULES */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-205 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
              <Medal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base font-display">El Cuadro de Honor</h3>
              <p className="text-[11px] text-slate-400">Predicciones a largo plazo sobre los ganadores del torneo.</p>
            </div>
          </div>
          <p className="text-xs text-slate-605 leading-relaxed">
            Ubicado en la pestaña secundaria dentro de <strong>"Pronósticos"</strong>, este módulo te permite seleccionar tus candidatos a medallas:
          </p>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-550">🥇 Campeón</span>
              </div>
              <strong className="text-indigo-600 font-extrabold">+10 Pts</strong>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-400">🥈 Subcampeón</span>
              </div>
              <strong className="text-indigo-600 font-extrabold">+10 Pts</strong>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-800">🥉 Tercer Lugar</span>
              </div>
              <strong className="text-indigo-600 font-extrabold">+10 Pts</strong>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-black text-blue-800">🏅 Cuarto Lugar</span>
              </div>
              <strong className="text-indigo-600 font-extrabold">+10 Pts</strong>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100/50 text-[11px] text-amber-850">
            📌 Los puntos de Cuadro de Honor son evaluados por el Administrador al término oficial de la Copa del Mundo Mundialista.
          </div>
        </div>

        {/* SHIELD LOCKS & DEADLINES */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-205 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center">
                <Clock className="w-5 h-5 text-white animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-base font-display">Sistema Antifraude y Bloqueo</h3>
                <p className="text-[11px] text-slate-400">Reglas estrictas para mantener el juego limpio.</p>
              </div>
            </div>
            <p className="text-xs text-slate-605 leading-relaxed">
              Para garantizar que nadie obtenga ventajas indebidas modificando sus marcadores cuando los partidos ya estén en curso:
            </p>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>
                  <strong>Cierre Automático:</strong> El sistema cuenta con un temporizador inteligente visible en la parte superior. Al iniciar el primer encuentro, <strong>todos los botones de guardado se bloquearán de manera automática.</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>
                  <strong>Lecturas en tiempo real:</strong> Los marcadores cargados bajo tu correo solo pueden ser editados por ti antes del límite. Después del cierre, son visibles de forma pública por transparencia.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-rose-50/50 border border-rose-100/30 rounded-xl flex items-center gap-2 text-rose-800 text-xs mt-4">
            <ShieldCheck className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="font-medium leading-normal">
              ¡Asegúrate de llenar tus pronósticos de grupos, medallas y parley con anticipación! No habrá excepciones manuales una vez comience el evento.
            </p>
          </div>
        </div>

      </div>

      {/* PLAYOFFS RULES */}
      <section className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 font-sans">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black">
            <Trophy className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white font-display">Reglas Especiales de Playoffs</h2>
            <p className="text-xs text-slate-400">Cómo se calculan y suman los puntos en la fase de eliminación directa de forma justa.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 text-xs leading-relaxed text-slate-300 font-sans">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-3">
            <h3 className="font-black text-emerald-400 text-sm flex items-center gap-1.5">
              ⚽ Acierto de Selección Clasificada (+3 Puntos)
            </h3>
            <p>
              Sumarás <strong>+3 puntos por cada equipo real</strong> que clasifique a un partido de playoffs (Dieciseisavos, Octavos, etc.) si coincide con la selección que tú proyectaste en esa posición en tu simulación inicial.
            </p>
            <p className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">
              ¡Premia tu puntería al proyectar los clasificados de la fase de grupos!
            </p>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-3">
            <h3 className="font-black text-indigo-400 text-sm flex items-center gap-1.5">
              🎯 Acierto de Marcador (Hasta +8 Puntos)
            </h3>
            <p>
              Para sumar puntos por marcador (Acierto Exacto, Parcial o Básico) en una ranura de playoffs, <strong>los dos equipos reales que jueguen deben coincidir con tu predicción</strong>. Si tus equipos predichos no alcanzaron esta ronda real, sumas 0 por goles en ese partido.
            </p>
            <p className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">
              Evita que se ganen puntos por marcadores de equipos eliminados.
            </p>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 font-display">Preguntas Frecuentes (FAQ)</h2>
            <p className="text-xs text-slate-400">Resolviendo dudas comunes sobre el uso y las reglas de la aplicación.</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 text-xs">
          
          <div className="space-y-1.5 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <h4 className="font-bold text-slate-800">🤔 ¿Cómo invito a mis amigos?</h4>
            <p className="text-slate-500 leading-relaxed">
              Es muy simple. Pásales el enlace de esta aplicación y pídeles que se registren. Una vez registrados con sus propios correos, aparecerán de manera automática en el Dashboard de la tabla general y podrán rellenar sus puntajes.
            </p>
          </div>
          
          <div className="space-y-1.5 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <h4 className="font-bold text-slate-800">🤔 ¿Cuándo se actualiza la tabla de posiciones?</h4>
            <p className="text-slate-500 leading-relaxed">
              El administrador actualizará los resultados de los partidos tan pronto terminen los encuentros oficiales. En ese instante, tus puntos se acumularán a tu ranking final automáticamente y tu posición en el Dashboard variará en tiempo real.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <h4 className="font-bold text-slate-800">🤔 ¿Qué pasa si el administrador corrige un marcador?</h4>
            <p className="text-slate-500 leading-relaxed">
              El motor de cálculo volverá a procesar las diferencias automáticamente y ajustará el puntaje general de todos los participantes de forma transparente.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <h4 className="font-bold text-slate-800">🤔 ¿Es confidencial mi pronóstico?</h4>
            <p className="text-slate-505 leading-relaxed">
              Sí, tus pronósticos son privados para otros usuarios y solo tú los puedes modificar antes del cierre del torneo. Una vez empiece la Copa del Mundo, el sistema puede revelar los marcadores de todos para fomentar una competencia divertida y justa.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <footer className="text-center py-6">
        <p className="text-xs text-slate-400">
          Super Quiniela Mundialista © {new Date().getFullYear()} — ¡Que gane el mejor estratega!
        </p>
      </footer>
    </div>
  );
}
