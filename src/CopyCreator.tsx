import React, { useState } from 'react';
import { DatabaseConfig } from '../types';
import { Database, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

interface DbSettingsModalProps {
  currentStatus: {
    isUsingFallback: boolean;
    error: string;
    host: string;
    user: string;
    database: string;
    port: number;
  };
  onSave: (config: DatabaseConfig & { password?: string }) => Promise<boolean>;
  onClose: () => void;
}

export function DbSettingsModal({ currentStatus, onSave, onClose }: DbSettingsModalProps) {
  const [host, setHost] = useState(currentStatus.host);
  const [user, setUser] = useState(currentStatus.user);
  const [database, setDatabase] = useState(currentStatus.database);
  const [port, setPort] = useState(currentStatus.port.toString());
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);
    try {
      const success = await onSave({
        host,
        user,
        database,
        port: parseInt(port, 10) || 3306,
        password: password || undefined
      });
      if (success) {
        setTestResult({
          success: true,
          message: 'Conectado com sucesso ao banco de dados MySQL!'
        });
        setTimeout(() => onClose(), 1550);
      } else {
        setTestResult({
          success: false,
          message: 'Falha na conexão MySQL. Verifique se a senha não está censurada com asteriscos e se o servidor aceita tráfego externo.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao reconfigurar.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E5E2DD] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[#1A1A1A] animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-[#E5E2DD] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF6321]/15 text-[#FF6321] rounded-xl border border-[#FF6321]/10">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg italic text-[#1A1A1A] font-bold">Configurações de Banco de Dados</h3>
              <p className="text-xs text-gray-500 italic">Camadas Ativa e Conexão de Contingência</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-[#1A1A1A] text-xs font-serif italic px-3 py-1.5 bg-[#F5F2ED] hover:bg-[#E5E2DD] border border-[#E5E2DD] rounded-full transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Alert Badge */}
          {currentStatus.isUsingFallback ? (
            <div className="p-3.5 bg-[#FF6321]/10 border border-[#FF6321]/20 text-[#1A1A1A] rounded-xl flex gap-3 text-xs leading-relaxed">
              <ShieldAlert className="w-5 h-5 shrink-0 text-[#FF6321] animate-pulse" />
              <div>
                <span className="font-bold block mb-0.5 text-[#FF6321] font-serif italic text-sm">Operando no Banco de Contingência Local</span>
                A conexão com {currentStatus.host} falhou ou está inativa. O sistema ativou o banco de dados seguro local (JSON no servidor) para manter as operações 100% ativas de forma persistente.
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-xl flex gap-3 text-xs leading-relaxed shadow-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold block text-emerald-800">Conectado na Nuvem MySQL</span>
                Injetando dados em tempo real no servidor remoto ({currentStatus.host}).
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider font-sans">Host do Servidor</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium"
                placeholder="Ex: 69.6.249.194"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider font-sans">Porta</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium font-mono"
                placeholder="3306"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider font-sans">Usuário</label>
            <input
              type="text"
              required
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium"
              placeholder="Ex: fabios99_landingpages"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider font-sans">Nome do Banco (Database)</label>
              <input
                type="text"
                required
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium"
                placeholder="Ex: fabios99_landingpages"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider font-sans">Senha do Banco</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium placeholder:text-gray-300"
                placeholder="••••••••••••••"
              />
            </div>
          </div>

          <p className="text-[10px] text-gray-500 italic font-serif">
            * Se deixar a senha em branco, manterá a credencial atual. Não utilize asteriscos literais <code className="text-[#FF6321] font-bold font-mono">****</code>.
          </p>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex gap-2 border font-sans ${testResult.success ? 'bg-emerald-50 text-emerald-950 border-emerald-200' : 'bg-red-50 text-red-950 border-red-250'}`}>
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-[#E5E2DD] hover:bg-[#F5F2ED] text-[#1A1A1A] text-xs font-semibold rounded-full font-serif italic cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white text-xs font-semibold rounded-full transition-all flex items-center gap-2 justify-center cursor-pointer font-serif italic shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6321]" />
                  Conectando...
                </>
              ) : (
                'Salvar e Conectar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
