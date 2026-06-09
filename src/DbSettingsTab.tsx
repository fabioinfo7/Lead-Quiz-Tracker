import React, { useState } from 'react';
import { DatabaseConfig } from '../types';
import { Database, Save, CheckCircle, AlertTriangle, Key, Terminal, ShieldAlert } from 'lucide-react';

interface DbSettingsTabProps {
  currentStatus: {
    isUsingFallback: boolean;
    error: string;
    host: string;
    user: string;
    database: string;
    port: number;
  };
  onSave: (config: DatabaseConfig & { password?: string }) => Promise<boolean>;
}

export function DbSettingsTab({ currentStatus, onSave }: DbSettingsTabProps) {
  const [host, setHost] = useState(currentStatus.host);
  const [user, setUser] = useState(currentStatus.user);
  const [database, setDatabase] = useState(currentStatus.database);
  const [port, setPort] = useState(currentStatus.port);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);

    // If the user inputs empty password, they might want to leave it empty or use existing.
    // In any case, we want to capture their entry.
    const result = await onSave({
      host,
      user,
      database,
      port,
      password: password || undefined
    });

    setSaving(false);
    if (result) {
      setSaveResult({
        success: true,
        message: 'Configurações salvas e conexão remota estabelecida com sucesso!'
      });
      setPassword(''); // Clear the password input for security
    } else {
      // Busca o erro detalhado do servidor para mostrar ao usuário
      let errorDetail = '';
      try {
        const statusRes = await fetch('/api/status');
        if (statusRes.ok) {
          const s = await statusRes.json();
          if (s.error) errorDetail = s.error;
        }
      } catch {}
      setSaveResult({
        success: false,
        message: errorDetail || 'Falha ao conectar no banco MySQL externo com as credenciais especificadas. O sistema continuará operando normalmente em fallback local de contingência.'
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-[#1A1A1A]">
      {/* Left panel: Connection status and notes */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-[#E5E2DD] p-6 rounded-2xl shadow-sm text-[#1A1A1A] space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif text-base italic text-[#1A1A1A] font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-[#FF6321]" />
              Conexão MySQL
            </h3>
            <p className="text-xs text-gray-405 italic">
              Conecte a plataforma diretamente ao seu servidor MySQL para armazenar campanhas, visitas e leads com segurança redundante.
            </p>
          </div>

          <div className="border-t border-[#E5E2DD] pt-4 space-y-4">
            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
              currentStatus.isUsingFallback 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-900' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900'
            }`}>
              <div className="flex items-center gap-2 font-serif italic text-xs font-bold">
                <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.isUsingFallback ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                Status Atual: {currentStatus.isUsingFallback ? 'Modo Contingência Ativa' : 'MySQL Totalmente Online'}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
                {currentStatus.isUsingFallback 
                  ? 'Como o MySQL remoto está offline ou as credenciais precisam ser corrigidas, o sistema está escrevendo dados localmente em fallback_db.json. Suas campanhas e questionários continuam funcionando perfeitamente.'
                  : `Banco remoto conectado com velocidade ultra-rápida em ${currentStatus.host}.`
                }
              </p>
            </div>

            {/* Detailed Auto-Diagnostic Panel wrapper */}
            {currentStatus.isUsingFallback && currentStatus.error && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[10.5px] uppercase tracking-wider text-rose-805">
                  <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                  Relatório Diagnóstico Inteligente
                </div>
                <p className="text-[10.5px] leading-relaxed font-medium font-sans">
                  {currentStatus.error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Informative tutorial panel for layman explanation */}
        <div className="bg-[#1A1A1A] text-[#F5F2ED] border border-[#1A1A1A] p-6 rounded-2xl shadow-lg space-y-4">
          <h4 className="font-serif italic font-bold text-xs text-[#FF6321] uppercase tracking-wider">Como o sistema funciona?</h4>
          <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
            <p>
              <strong>1. O Script Inteligente (Pixel):</strong> Cada campanha gerada te dá um pequeno código (script) para você colocar na sua Landing Page.
            </p>
            <p>
              <strong>2. Monitoramento de Passos:</strong> Esse script funciona em segundo plano, observando se o visitante está rolando o seu site (scroll depth), clicando nos botões ou preenchendo o Quiz.
            </p>
            <p>
              <strong>3. Armazenamento Blindado:</strong> Quando o visitante envia o Quiz e digita suas informações pessoais (nome, e-mail e idade), o script captura esses dados e envia para cá. Se o MySQL cair, o banco de segurança local retém imediatamente no arquivo interno de salvaguarda.
            </p>
            <p className="pt-2 text-gray-400 text-[10px] italic border-t border-white/5 flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-[#FF6321]" /> Conectividade redundante inteligente ativa.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel: Credential input form */}
      <div className="lg:col-span-8 bg-white border border-[#E5E2DD] p-6 rounded-2xl shadow-sm text-[#1A1A1A] flex flex-col justify-between">
        <div>
          <div className="border-b border-[#E5E2DD] pb-4 mb-5">
            <h3 className="font-serif text-base italic text-[#1A1A1A] font-bold">Credenciais do Servidor MySQL</h3>
            <p className="text-xs text-gray-500 italic">Insira os parâmetros de host, porta, usuário e senha para conectar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A]/80 mb-1.5">Host do Servidor MySQL</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 69.6.249.194"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A]/80 mb-1.5">Porta</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 3306"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10))}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A]/80 mb-1.5">Usuário MySQL</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: fabios99_user"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A]/80 mb-1.5">Banco de Dados (Schema Name)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: fabios99_dbname"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A1A]/80 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#FF6321]" />
                Senha MySQL
              </label>
              <input
                type="password"
                placeholder="Insira a nova senha MySQL..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-3 outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-500 italic mt-1.5">
                * Nota: Para manter seu status seguro, digite a nova senha apenas quando quiser alterá-la. Ganchos de segurança barram senhas mascaradas com asteriscos.
              </p>
            </div>

            {saveResult && (
              <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs ${
                saveResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {saveResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                )}
                <span>{saveResult.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white font-semibold text-xs py-3 px-5 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest shadow-sm mt-3"
            >
              <Save className="w-4 h-4 text-[#FF6321]" />
              {saving ? 'Testando e Salvando...' : 'Salvar Credenciais & Reconectar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
