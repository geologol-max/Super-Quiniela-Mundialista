import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentVerification, setSentVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        navigate('/dashboard');
      } else {
        await registerWithEmail(email, password, name);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Authentication error details:", err);
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";
      
      if (errorCode === 'auth/email-already-in-use' || errorMsg.includes('email-already-in-use')) {
        setError('Este correo ya está en uso. Intenta iniciar sesión.');
      } else if (errorCode === 'auth/weak-password' || errorMsg.includes('weak-password')) {
        setError('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
      } else if (errorCode === 'auth/invalid-email' || errorMsg.includes('invalid-email')) {
        setError('El formato del correo electrónico no es válido.');
      } else if (errorCode === 'auth/operation-not-allowed' || errorMsg.includes('operation-not-allowed')) {
        setError('El registro de cuentas nuevas por correo no está habilitado en tu proyecto Firebase. Si eres administrador de este sitio, por favor activa el proveedor "Correo electrónico/contraseña" en la sección de Firebase Auth de tu consola de Firebase.');
      } else if (errorCode === 'auth/user-not-found' || errorMsg.includes('user-not-found') || errorCode === 'auth/wrong-password' || errorMsg.includes('wrong-password') || errorMsg.includes('invalid-credential')) {
        setError('Correo o contraseña incorrectos. Por favor, verifícalos.');
      } else {
        setError(`Error al procesar la solicitud: ${err.message || errorCode || 'Verifica tus datos e intenta de nuevo.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError('Error al iniciar sesión con Google.');
    }
  };

  if (sentVerification) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full">
          <Mail className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold font-display">Verifica tu correo</h1>
        <p className="text-slate-600">
          Hemos enviado un enlace de confirmación a <strong>{email}</strong>. 
          Por favor revisa tu bandeja de entrada para activar tu cuenta.
        </p>
        <button 
          onClick={() => setIsLogin(true)}
          className="text-indigo-600 font-bold hover:underline"
        >
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 sm:mt-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <Trophy className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-black font-display tracking-tight">
            {isLogin ? '¡Bienvenido de nuevo!' : 'Únete a la Quiniela'}
          </h1>
          <p className="text-slate-500">
            {isLogin ? 'Ingresa tus credenciales para continuar.' : 'Crea tu cuenta para empezar a pronosticar.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div 
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                placeholder={showPassword ? "Contraseña" : "••••••••"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Acceder' : 'Registrarme'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">O continuar con</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-3 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all text-slate-700"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Google
        </button>

        <p className="text-center text-slate-500 text-sm">
          {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-indigo-600 font-bold hover:underline"
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      </motion.div>
      
      <p className="mt-8 text-center text-slate-400 text-xs">
        Al continuar, aceptas nuestros términos y condiciones de la Quiniela.
      </p>
    </div>
  );
}
