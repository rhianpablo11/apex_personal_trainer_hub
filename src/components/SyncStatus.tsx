import React from 'react';
import { SyncState, Student, Payment } from '../types';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Check, ArrowRight } from 'lucide-react';

interface SyncStatusProps {
  syncState: SyncState;
  isOnline: boolean;
  onSync: () => void;
  onResolveConflict: (resolvedStudents: Student[], resolvedPayments: Payment[]) => void;
  user: any;
  onLogin: () => void;
  isGoogleConnected: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  syncState,
  isOnline,
  onSync,
  onResolveConflict,
  user,
  onLogin,
  isGoogleConnected,
}) => {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Nunca';
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('pt-BR');
  };

  // Automated merge algorithm
  const handleAutoMerge = () => {
    if (!syncState.conflictData) return;
    const { local, remote, localPayments, remotePayments } = syncState.conflictData;

    // Merge students: Union by id. If both exist, keep the active one or the one with more fields filled
    const studentMap = new Map<string, Student>();
    
    // Add remote first
    remote.forEach(s => studentMap.set(s.id, s));
    
    // Merge local. If local is active, or has newer workout info, or remote was active too, take local
    local.forEach(localS => {
      const remoteS = studentMap.get(localS.id);
      if (!remoteS) {
        studentMap.set(localS.id, localS);
      } else {
        // Merge strategy: if local is active and remote is inactive, or local has longer workout notes, we prefer local
        const preferred = (localS.ativo && !remoteS.ativo) || 
                          (localS.treino.length >= remoteS.treino.length) ? localS : remoteS;
        studentMap.set(localS.id, {
          ...remoteS,
          ...localS,
          treino: preferred.treino || remoteS.treino || localS.treino,
          pago_este_mes: localS.pago_este_mes || remoteS.pago_este_mes, // true if either paid
        });
      }
    });

    // Merge payments: Union by id
    const paymentMap = new Map<string, Payment>();
    remotePayments.forEach(p => paymentMap.set(p.id, p));
    localPayments.forEach(p => paymentMap.set(p.id, p));

    onResolveConflict(Array.from(studentMap.values()), Array.from(paymentMap.values()));
  };

  const handleKeepLocal = () => {
    if (!syncState.conflictData) return;
    onResolveConflict(syncState.conflictData.local, syncState.conflictData.localPayments);
  };

  const handleKeepRemote = () => {
    if (!syncState.conflictData) return;
    onResolveConflict(syncState.conflictData.remote, syncState.conflictData.remotePayments);
  };

  return (
    <div id="sync-status-panel" className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${isOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">
                {isGoogleConnected ? 'Banco de Dados no Google Drive' : 'Sincronização com Drive Pausada'}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${isGoogleConnected && isOnline ? 'bg-emerald-500/10 border-emerald-200/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 border-amber-200/30 text-amber-700 dark:text-amber-300'}`}>
                {isGoogleConnected && isOnline ? 'Nuvem Ativa' : 'Apenas Local'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isGoogleConnected 
                ? <>Última sincronização: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatTime(syncState.lastSynced)}</span></>
                : <span className="text-amber-600 dark:text-amber-400 font-semibold animate-pulse">Seus dados estão salvos localmente. Conecte ao Drive para subir as alterações.</span>
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isGoogleConnected ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user?.displayName || user?.email}</p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">Integração do Google desplugada</span>
              </div>
              <button
                onClick={onLogin}
                id="login-drive-btn"
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
              >
                Conectar Google Drive
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user?.displayName || user?.email}</p>
                <p className="text-[10px] text-zinc-400">Google Drive Conectado</p>
              </div>
              <button
                onClick={onSync}
                disabled={syncState.syncing || !isOnline}
                id="manual-sync-btn"
                className="flex items-center gap-1.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncState.syncing ? 'animate-spin text-purple-600' : ''}`} />
                {syncState.syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      {syncState.conflict && syncState.conflictData && (
        <div id="conflict-dialog" className="mt-4 p-4 bg-amber-500/10 border border-amber-200/30 dark:border-amber-900/30 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-display font-bold text-amber-900 dark:text-amber-200 tracking-tight">
                Conflito de Concorrência Detectado
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                Os dados no Google Drive foram atualizados por outro dispositivo em <span className="font-semibold">{formatTime(syncState.conflictData.remoteModifiedTime)}</span>. Como você também fez alterações locais, selecione como deseja resolver:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <button
                  onClick={handleAutoMerge}
                  className="flex flex-col items-center justify-between p-3.5 bg-white/50 dark:bg-zinc-950/40 border border-amber-500/20 hover:border-purple-500/50 rounded-xl text-center transition group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <Check className="w-4 h-4" />
                    Mesclar Dados
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Combina alunos locais e remotos mantendo o histórico de pagamentos completo.
                  </p>
                </button>

                <button
                  onClick={handleKeepLocal}
                  className="flex flex-col items-center justify-between p-3.5 bg-white/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 hover:border-amber-500/50 rounded-xl text-center transition cursor-pointer"
                >
                  <div className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                    Sobrescrever Drive
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Usa os dados deste dispositivo e substitui os dados que estão salvos no Drive.
                  </p>
                </button>

                <button
                  onClick={handleKeepRemote}
                  className="flex flex-col items-center justify-between p-3.5 bg-white/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 hover:border-amber-500/50 rounded-xl text-center transition cursor-pointer"
                >
                  <div className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                    Usar Dados do Drive
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Descarta as alterações locais e baixa as informações atualizadas do Drive.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
