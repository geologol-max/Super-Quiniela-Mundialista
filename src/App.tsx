import React, { Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Rules } from './pages/Rules';
import { useAuth } from './contexts/AuthContext';
import { CountdownBanner } from './components/CountdownBanner';

// Lazy load heavy pages for faster initial bundle
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Predictions = React.lazy(() => import('./pages/Predictions').then(m => ({ default: m.Predictions })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Parley = React.lazy(() => import('./pages/Parley').then(m => ({ default: m.Parley })));

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
  return profile?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <CountdownBanner />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/predictions" element={<PrivateRoute><Predictions /></PrivateRoute>} />
            <Route path="/parley" element={<PrivateRoute><Parley /></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
