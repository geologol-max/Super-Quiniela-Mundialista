import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, LayoutDashboard, ClipboardList, ShieldCheck, LogOut, LogIn, BookOpen } from 'lucide-react';

export function Navbar() {
  const { user, profile, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <Trophy className="w-8 h-8" />
          <span className="hidden sm:inline">Super Quiniela</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/dashboard" className="flex items-center gap-1 text-sm font-medium hover:text-indigo-600">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            <Link to="/predictions" className="flex items-center gap-1 text-sm font-medium hover:text-indigo-600">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden md:inline">Pronósticos</span>
            </Link>
            <Link to="/parley" className="flex items-center gap-1 text-sm font-medium hover:text-indigo-600">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="hidden md:inline">Parley</span>
            </Link>
            <Link to="/rules" className="flex items-center gap-1 text-sm font-medium hover:text-indigo-600">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Reglas</span>
            </Link>
            {profile?.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-1 text-sm font-medium hover:text-red-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-705 overflow-hidden shrink-0 relative shadow-sm">
                {profile?.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                
                {!profile?.avatarUrl ? (
                  profile?.avatarEmoji ? (
                    <span className="text-lg leading-none select-none">{profile.avatarEmoji}</span>
                  ) : (
                    <span className="font-bold text-indigo-600 text-xs">{(profile?.name || 'P').charAt(0).toUpperCase()}</span>
                  )
                ) : null}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-bold text-slate-800">{profile?.name}</span>
                <span className="text-[10px] text-indigo-600 font-bold">{profile?.totalPoints} Ptos</span>
              </div>
              <button 
                onClick={logout}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors ml-1"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        ) : (
          <Link 
            to="/auth"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Acceder
          </Link>
        )}
      </div>
    </nav>
  );
}
