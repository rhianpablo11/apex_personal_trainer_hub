import React from 'react';
import { 
  Dribbble, Users, Calendar, DollarSign, 
  Settings, LogOut, Sun, Moon, Monitor, RefreshCw 
} from 'lucide-react';
import { ThemeMode } from '../types';
// @ts-ignore
import logoImg from '../assets/images/apex_modern_icon_1783622188640.jpg';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  user: any;
  onLogout: () => void;
  syncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  theme,
  onThemeChange,
  user,
  onLogout,
  syncing,
}) => {
  const [showSettings, setShowSettings] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: Dribbble },
    { id: 'students', label: 'Alunos', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside id="desktop-sidebar" className="hidden md:flex flex-col justify-between w-64 h-screen bg-zinc-50/50 dark:bg-slate-950/60 backdrop-blur-xl border-r border-zinc-200 dark:border-white/10 fixed left-0 top-0 z-30 p-5 font-sans">
        <div className="space-y-8">
          {/* Brand/Logo */}
          <div className="flex items-center gap-3">
            {!imgError ? (
              <img 
                src={logoImg} 
                alt="Apex Logo" 
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-10 h-10 rounded-xl shadow-lg shadow-purple-500/10 border border-purple-500/20 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-zinc-950 dark:bg-zinc-900 border border-purple-500/30 rounded-xl shadow-lg flex items-center justify-center text-zinc-50 relative overflow-hidden shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl opacity-35 blur-xs" />
                <span className="relative font-display font-black text-sm bg-gradient-to-br from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  A
                </span>
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-zinc-900 dark:text-zinc-50 leading-tight tracking-tight">Apex</h1>
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 tracking-wider uppercase">Trainer Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id || (tab.id === 'students' && (currentTab === 'student-detail' || currentTab === 'add-student' || currentTab === 'edit-student'));
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer select-none border ${isActive ? 'bg-purple-600/10 text-purple-600 dark:bg-white/5 border-purple-200/50 dark:border-white/10 dark:text-white shadow-xs font-bold' : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-100 hover:bg-zinc-100/50 dark:hover:bg-white/5 border-transparent'}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Settings & Auth */}
        <div className="space-y-4">
          {/* Theme Selector Toggle */}
          <div className="bg-zinc-100/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg p-1 flex items-center justify-around">
            <button
              onClick={() => onThemeChange('light')}
              title="Modo Claro"
              className={`p-1.5 rounded-md cursor-pointer transition-all ${theme === 'light' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              title="Modo Escuro"
              className={`p-1.5 rounded-md cursor-pointer transition-all ${theme === 'dark' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('system')}
              title="Modo do Sistema"
              className={`p-1.5 rounded-md cursor-pointer transition-all ${theme === 'system' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* User Signout */}
          {user && (
            <div className="pt-3 border-t border-zinc-200/50 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.displayName || user.email}</p>
                <p className="text-[10px] text-zinc-400">Personal Trainer</p>
              </div>
              <button
                onClick={onLogout}
                title="Sair"
                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVBAR */}
      <nav id="mobile-navbar" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 px-2 py-2 flex items-center justify-around shadow-lg font-sans">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id || (tab.id === 'students' && (currentTab === 'student-detail' || currentTab === 'add-student' || currentTab === 'edit-student'));
          return (
            <button
              key={tab.id}
              onClick={() => {
                setShowSettings(false);
                onNavigate(tab.id);
              }}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer select-none ${isActive ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200'}`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[9px]">{tab.label}</span>
            </button>
          );
        })}

        {/* Mobile Settings trigger */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer select-none ${showSettings ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200'}`}
        >
          <Settings className="w-4.5 h-4.5" />
          <span className="text-[9px]">Ajustes</span>
        </button>
      </nav>

      {/* MOBILE SETTINGS BOTTOM SHEET */}
      {showSettings && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setShowSettings(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          {/* Bottom Sheet Container */}
          <div className="relative bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-white/10 rounded-t-3xl p-6 z-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drag Handle indicator */}
            <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-5" />
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-purple-500" />
                Configurações do Aplicativo
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 px-2 py-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition"
              >
                Fechar
              </button>
            </div>

            {/* Profile Info Section */}
            {user && (
              <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 dark:bg-purple-500/15 border border-purple-200/50 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'IP'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-xs text-zinc-400 font-medium">Personal Trainer</p>
                </div>
              </div>
            )}

            {/* Segmented Theme Selector (matches desktop experience) */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Tema do Aplicativo
              </label>
              <div className="bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 rounded-2xl p-1 grid grid-cols-3 gap-1">
                <button
                  onClick={() => onThemeChange('light')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer transition-all text-xs font-medium ${theme === 'light' ? 'bg-white text-purple-600 dark:bg-white/10 dark:text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Claro</span>
                </button>
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer transition-all text-xs font-medium ${theme === 'dark' ? 'bg-white text-purple-600 dark:bg-white/10 dark:text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Escuro</span>
                </button>
                <button
                  onClick={() => onThemeChange('system')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer transition-all text-xs font-medium ${theme === 'system' ? 'bg-white text-purple-600 dark:bg-white/10 dark:text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200'}`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Sistema</span>
                </button>
              </div>
            </div>

            {/* Logout Action */}
            {user && (
              <button
                onClick={() => {
                  setShowSettings(false);
                  onLogout();
                }}
                className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sair da Conta
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
