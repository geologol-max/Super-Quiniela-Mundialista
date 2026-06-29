import { Navbar } from './components/Navbar';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Predictions } from './pages/Predictions';
import { Admin } from './pages/Admin';
import { Parley } from './pages/Parley';
import { Rules } from './pages/Rules';
import { Audit } from './pages/Audit';
import { useAuth } from './contexts/AuthContext';
import { CountdownBanner } from './components/CountdownBanner';

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      <p className="text-sm font-bold text-slate-400">Cargando...</p>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return user ? <>{children}</> : <Navigate to="/" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  // TEMPORAL: Permitir acceso a cualquier usuario autenticado para diagnóstico y restauración
  return profile ? <>{children}</> : <Navigate to="/auth" />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <CountdownBanner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/predictions" element={<PrivateRoute><Predictions /></PrivateRoute>} />
          <Route path="/parley" element={<PrivateRoute><Parley /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute><Audit /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
}
