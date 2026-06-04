import React, { useState } from 'react';
import { Campaign, AnalyticsSummary } from '../types';
import { 
  PlusCircle, 
  Copy, 
  Check, 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  Users, 
  FileCheck, 
  Percent, 
  Cpu, 
  Code,
  BookOpen
} from 'lucide-react';

interface CampaignDetailsProps {
  campaigns: Campaign[];
  analytics: AnalyticsSummary[];
  onCreateCampaign: (name: string, product: string) => Promise<void>;
  appUrl: string;
}

export function CampaignDetails({ campaigns, analytics, onCreateCampaign, appUrl }: CampaignDetailsProps) {
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newBaitName, setNewBaitName] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(campaigns[0]?.id || null);
  const [creating, setCreating] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAPI, setCopiedAPI] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName || !newBaitName) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      await onCreateCampaign(newCampaignName, newBaitName);
      setNewCampaignName('');
      setNewBaitName('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Falha de conexão ou erro de sintaxe/privilégios na tabela SQL do banco.');
    } finally {
      setCreating(false);
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];
  const stats = analytics.find(a => a.campaignId === selectedCampaign?.id) || {
    campaignId: selectedCampaign?.id || '',
    campaignName: selectedCampaign?.name || '',
    productName: selectedCampaign?.product_name || '',
    visits: 0,
    ctaClicks: 0,
    conversionRate: 0,
    avgScroll: 0,
    submissions: 0
  };

  const activeCid = selectedCampaign?.id || 'CAMPAIGN_ID';
  
  // Se estiver na URL de desenvolvimento restrita do Google AI Studio, converte para o canal público
  const publicAppUrl = appUrl.includes('ais-dev-') 
    ? appUrl.replace('ais-dev-', 'ais-pre-')
    : appUrl;

  const embedScriptCode = `<!-- Script do Pixel LeadQuiz (Insira antes do final de </body>) -->
<script>
  (function(w, d, s, u, c) {
    w.LeadTracker = w.LeadTracker || {
      _q: [],
      submitLead: function(data) {
        return new Promise(function(resolve, reject) {
          w.LeadTracker._q.push({ data: data, resolve: resolve, reject: reject });
        });
      },
      trackCta: function() {
        w.LeadTracker._q.push({ type: 'cta' });
      }
    };
    var js = d.createElement(s);
    js.async = true;
    js.src = u + "?cid=" + c;
    var fjs = d.getElementsByTagName(s)[0];
    fjs.parentNode.insertBefore(js, fjs);
  })(window, document, 'script', '${publicAppUrl}/pixel.js', '${activeCid}');
</script>`;
  
  const manualApiCode = `// Chame quando o Lead submeter o quizz no seu formulário (o script acima injetará este helper):
window.LeadTracker.submitLead({
  name: "Nome do Lead",
  email: "email@lead.com",
  age: 28,
  quiz_answers: [
    { question: "Qual sua principal dor?", answer: "Gerenciar campanhas" },
    { question: "Faixa de faturamento?", answer: "R$ 5k a 10k" }
  ]
}).then(res => {
  // Redirecione ou entregue a Isca Digital aqui
  window.location.href = "/sucesso-isca";
});`;

  const copyToClipboard = (text: string, type: 'script' | 'api') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedAPI(true);
      setTimeout(() => setCopiedAPI(false), 2000);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Grid: Registration and Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registration Column */}
        <div className="lg:col-span-5 bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 flex flex-col justify-between text-[#1A1A1A]">
          <div>
            <h3 className="font-serif text-lg italic text-[#1A1A1A] mb-1 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#FF6321]" />
              Criar Nova Campanha / Produto
            </h3>
            <p className="text-xs text-gray-500 italic mb-4">
              Cada campanha gera um script de analytics exclusivo para sua landing page de destino.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/80 mb-1.5">Nome da Campanha (Interno)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: LP Tráfego Pago Ebook 2026"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/80 mb-1.5">Produto Principal / Isca Digital</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Guia Completo Tráfego Pago (E-Book)"
                  value={newBaitName}
                  onChange={(e) => setNewBaitName(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-[10.5px] leading-relaxed">
                  <p className="font-bold flex items-center gap-1 text-red-700">⚠️ Erro ao Salvar no Banco Remoto:</p>
                  <p className="font-sans italic">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white font-semibold text-xs uppercase tracking-widest py-3 px-4 rounded-full transition-colors cursor-pointer"
              >
                {creating ? 'Criando...' : 'Cadastrar e Gerar Código'}
              </button>
            </form>
          </div>
        </div>

        {/* Campaign Selector Column */}
        <div className="lg:col-span-7 bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 flex flex-col h-full text-[#1A1A1A]">
          <h3 className="font-serif text-lg italic text-[#1A1A1A] mb-1 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#FF6321]" />
            Selecione a Campanha Ativa
          </h3>
          <p className="text-xs text-gray-500 italic mb-4">
            Escolha uma campanha para monitorar estatísticas do pixel, taxas de conversão e acessar os scripts.
          </p>

          <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2">
            {campaigns.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-8 font-serif italic">Nenhuma campanha cadastrada ainda.</div>
            ) : (
              campaigns.map((camp) => {
                const isSelected = selectedCampaign?.id === camp.id;
                const matches = analytics.find(a => a.campaignId === camp.id) || { visits: 0, submissions: 0 };
                return (
                  <button
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaignId(camp.id);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-[#FF6321]/15 border-[#FF6321] text-[#1A1A1A]' 
                        : 'bg-white border-[#E5E2DD] text-[#1A1A1A]/90 hover:bg-[#F5F2ED]/50'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs truncate">{camp.name}</div>
                      <div className="text-[10px] text-gray-500 italic truncate mt-1">
                        Isca: <span className="text-[#1A1A1A] font-semibold font-mono">{camp.product_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.1 font-mono text-[9.5px] text-[#1A1A1A]/70 bg-[#F5F2ED] border border-[#E5E2DD] px-3 py-1.5 rounded-lg shadow-sm">
                      <BarChart3 className="w-3.5 h-3.5 text-[#FF6321]" />
                      <span className="font-serif italic text-[#1A1A1A]">{matches.visits} Visitas</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-[#FF6321] font-bold">{matches.submissions} Leads</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Stats Display Block (Selected Campaign Metrics) */}
      {selectedCampaign && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 text-[#1A1A1A]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-[#E5E2DD]/80 pb-4">
              <div>
                <h4 className="font-serif text-lg italic text-[#1A1A1A]">Relatório de Rastreamento</h4>
                <p className="text-xs text-gray-500 italic">Analíticos do pixel da campanha: <span className="text-[#FF6321] font-bold font-mono">{selectedCampaign.name}</span></p>
              </div>
              <div className="text-xs text-gray-400 italic">
                Cadastrada em: {formatDate(selectedCampaign.created_at)}
              </div>
            </div>

            {/* Metric grid box */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Box 1: Visits */}
              <div className="bg-[#F5F2ED] border border-[#E5E2DD] p-4.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Visitas</span>
                  <Eye className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-2xl font-serif text-[#1A1A1A]">{stats.visits}</span>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-mono">Views registradas</p>
                </div>
              </div>

              {/* Box 2: CTA clicks */}
              <div className="bg-[#F5F2ED] border border-[#E5E2DD] p-4.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Cliques CTA</span>
                  <MousePointerClick className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-2xl font-serif text-[#1A1A1A]">{stats.ctaClicks}</span>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-mono">CTR: {stats.visits > 0 ? Math.round((stats.ctaClicks / stats.visits) * 100) : 0}%</p>
                </div>
              </div>

              {/* Box 3: Lead Submissions */}
              <div className="bg-[#F5F2ED] border border-[#E5E2DD] p-4.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Leads</span>
                  <Users className="w-4 h-4 text-[#FF6321]" />
                </div>
                <div>
                  <span className="text-2xl font-serif text-[#FF6321]">{stats.submissions}</span>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-mono">Quiz finalizados</p>
                </div>
              </div>

              {/* Box 4: Conversion Rate */}
              <div className="bg-[#F5F2ED] border border-[#E5E2DD] p-4.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Conversão</span>
                  <Percent className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-2xl font-serif text-[#FF6321]">{stats.conversionRate}%</span>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-mono">Leads / Visitas</p>
                </div>
              </div>

              {/* Box 5: Scroll Level bar */}
              <div className="bg-[#F5F2ED] border border-[#E5E2DD] p-4.5 rounded-xl flex flex-col justify-between col-span-2 md:col-span-1 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Scroll Médio</span>
                  <BarChart3 className="w-4 h-4 text-[#FF6321]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-serif text-[#1A1A1A]">{stats.avgScroll}%</span>
                  </div>
                  {/* Visual gauge */}
                  <div className="w-full bg-[#E5E2DD] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-[#FF6321] h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.avgScroll}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Integration & Tracker Section */}
        <div className="bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 text-[#1A1A1A]">
          <h4 className="font-serif text-lg italic text-[#1A1A1A] mb-1.5 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#FF6321]" />
            Instalação do Pixel / Configuração de Rastreio
          </h4>
          <p className="text-xs text-gray-500 italic mb-6 leading-relaxed">
            Para fazer a inteligência de negócios funcionar na sua landing page existente, utilize um dos dois métodos abaixo para colher o analytics de visitas, cliques no CTA, taxa de scroll e gravação automática das respostas de perguntas do quiz.
          </p>

            <div className="space-y-6">
              {/* Method 1: Embed Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Code className="w-4 h-4 text-[#FF6321]" />
                    Método 1: Script de Carregamento Automático
                  </label>
                  <button
                    onClick={() => copyToClipboard(embedScriptCode, 'script')}
                    className="text-xs text-[#FF6321] hover:text-[#FF6321]/90 flex items-center gap-1.5 cursor-pointer bg-[#FF6321]/5 border border-[#FF6321]/20 px-3.5 py-1.5 rounded-full hover:bg-[#FF6321]/15 transition-all font-serif italic font-semibold"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Script
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Insira o código Javascript no final do código HTML da sua Landing Page existente (geralmente antes da tag de fechamento <code className="text-[#1A1A1A] font-bold font-mono">&lt;/body&gt;</code>):
                </p>
                <div className="relative">
                  <pre className="bg-[#1A1A1A] text-[#F5F2ED] rounded-xl p-4.5 text-[11px] font-mono overflow-x-auto border border-neutral-900 shadow-inner leading-relaxed pr-12 select-all">
                    {embedScriptCode}
                  </pre>
                </div>
              </div>

              {/* Method 2: Manual Triggers */}
              <div className="space-y-2 pt-4 border-t border-[#E5E2DD] font-medium">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <FileCheck className="w-4 h-4 text-[#FF6321]" />
                    Como Disparar as Respostas e Lead via Código (Integração)
                  </label>
                  <button
                    onClick={() => copyToClipboard(manualApiCode, 'api')}
                    className="text-xs text-[#FF6321] hover:text-[#FF6321]/90 flex items-center gap-1.5 cursor-pointer bg-[#FF6321]/5 border border-[#FF6321]/20 px-3.5 py-1.5 rounded-full hover:bg-[#FF6321]/15 transition-all font-serif italic font-semibold"
                  >
                    {copiedAPI ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Código
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 italic mb-2">
                  Quando o visitante responder a última pergunta do quiz, inserir nome, email e idade, invoque o helper <code className="text-[#1A1A1A] font-bold font-mono">window.LeadTracker.submitLead</code> injetado automaticamente pelo pixel:
                </p>
                <pre className="bg-[#1A1A1A] text-[#F5F2ED] rounded-xl p-4.5 text-[10.5px] font-mono overflow-x-auto border border-neutral-900 shadow-inner leading-relaxed select-all">
                  {manualApiCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
