import React from 'react';
import { AnalyticsSummary, Lead, Campaign } from '../types';
import { 
  Users, 
  Eye, 
  TouchpadOff,
  Flame, 
  HelpCircle, 
  Database, 
  TrendingUp, 
  BadgeAlert, 
  Sparkles, 
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface DashboardProps {
  campaigns: Campaign[];
  leads: Lead[];
  analytics: AnalyticsSummary[];
  dbStatus: {
    isUsingFallback: boolean;
    error: string;
    host: string;
    user: string;
    database: string;
    port: number;
  };
  onNavigate: (tab: 'campaigns' | 'leads' | 'copy' | 'simulator' | 'settings') => void;
}

export function Dashboard({ campaigns, leads, analytics, dbStatus, onNavigate }: DashboardProps) {
  // Aggregate Metrics
  const totalVisits = analytics.reduce((acc, curr) => acc + curr.visits, 0);
  const totalLeads = leads.length;
  const totalClicks = analytics.reduce((acc, curr) => acc + curr.ctaClicks, 0);
  const avgConversionRate = totalVisits > 0 ? Math.round((totalLeads / totalVisits) * 100) : 0;
  const avgCtaRate = totalVisits > 0 ? Math.round((totalClicks / totalVisits) * 100) : 0;
  
  // Find top campaign
  const bestCampaign = [...analytics].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  return (
    <div className="space-y-6">
      {/* DB Live Header Status Indicator Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        dbStatus.isUsingFallback 
          ? 'bg-amber-500/10 border-amber-300/35 text-[#1A1A1A]' 
          : 'bg-emerald-500/10 border-emerald-300/35 text-[#1A1A1A]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            {dbStatus.isUsingFallback ? (
              <div className="p-2.5 bg-amber-500/15 text-amber-600 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-500/15 text-emerald-600 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-0.5">
              <h4 className="font-serif italic font-bold text-sm tracking-tight flex items-center gap-2">
                Status do Banco de Dados Externo: 
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dbStatus.isUsingFallback ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
                {dbStatus.isUsingFallback ? 'Banco de Contingência Ativo (Fallback Local)' : 'MySQL Conectado Ativo'}
              </h4>
              <p className="text-[10px] text-gray-500 leading-relaxed font-sans font-medium">
                {dbStatus.isUsingFallback 
                  ? `Conexão com ${dbStatus.host} não pôde ser estabelecida (${dbStatus.error || 'Timeout'}). O banco seguro local interceptou e salvou todas as campanhas e leads.` 
                  : `Injetando dados via canal seguro remoto de alta velocidade: ${dbStatus.user}@${dbStatus.host} na porta ${dbStatus.port}.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer border flex items-center gap-1.5 transition-all shadow-sm shrink-0 font-serif italic ${
              dbStatus.isUsingFallback
                ? 'bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white border-[#1A1A1A]'
                : 'bg-white hover:bg-[#F5F2ED] text-[#1A1A1A] border-[#E5E2DD]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#FF6321]" />
            {dbStatus.isUsingFallback ? 'Corrigir Conexão MySQL' : 'Gerenciar Credenciais'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Aggregate Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-[#E5E2DD] p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-sans">Visualizações Únicas</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-serif font-black text-[#1A1A1A]">{totalVisits}</h3>
              <span className="text-[9px] text-[#FF6321] font-mono font-medium">Visitas totais</span>
            </div>
          </div>
          <div className="p-3 bg-[#F5F2ED] group-hover:bg-[#FF6321]/10 text-gray-400 group-hover:text-[#FF6321] rounded-xl transition-all border border-[#E5E2DD]/40">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E5E2DD] p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-sans">Leads Cadastrados</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-serif font-black text-[#1A1A1A]">{totalLeads}</h3>
              <span className="text-[9px] text-emerald-600 font-mono font-bold">100% Retidos</span>
            </div>
          </div>
          <div className="p-3 bg-[#F5F2ED] group-hover:bg-[#FF6321]/10 text-gray-400 group-hover:text-[#FF6321] rounded-xl transition-all border border-[#E5E2DD]/40">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E5E2DD] p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-sans">Conversão Média</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-serif font-black text-[#1A1A1A]">{avgConversionRate}%</h3>
              <span className="text-[9px] text-gray-400 font-mono italic">Visitas → Lead</span>
            </div>
          </div>
          <div className="p-3 bg-[#F5F2ED] group-hover:bg-[#FF6321]/10 text-gray-400 group-hover:text-[#FF6321] rounded-xl transition-all border border-[#E5E2DD]/40">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E5E2DD] p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-sans">Engajamento CTA</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-serif font-black text-[#1A1A1A]">{avgCtaRate}%</h3>
              <span className="text-[9px] text-gray-400 font-mono italic">Clicks no Botão</span>
            </div>
          </div>
          <div className="p-3 bg-[#F5F2ED] group-hover:bg-[#FF6321]/10 text-gray-400 group-hover:text-[#FF6321] rounded-xl transition-all border border-[#E5E2DD]/40">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bento Layout Grid for campaigns and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Campaign Performance Stats */}
        <div className="lg:col-span-8 bg-white border border-[#E5E2DD] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1 mb-5">
            <h3 className="font-serif text-base italic text-[#1A1A1A] font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#FF6321]" />
              Performance por Campanha & Isca Digital
            </h3>
            <p className="text-xs text-gray-500 italic">Mapeamento em tempo real do funil e leituras de scroll completadas.</p>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {analytics.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-serif italic text-xs">
                Nenhuma campanha ativa registrada para monitorar no momento. Use o Simulador ou adicione campanhas!
              </div>
            ) : (
              analytics.map((camp) => (
                <div 
                  key={camp.campaignId}
                  className="bg-[#F5F2ED]/60 border border-[#E5E2DD] p-4.5 rounded-xl hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-[#1A1A1A]"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-[#1A1A1A] truncate">{camp.campaignName}</span>
                      <span className="px-2 py-0.5 bg-[#FF6321]/10 text-[#FF6321] border border-[#FF6321]/15 text-[8.5px] font-mono font-bold rounded">
                        ID: {camp.campaignId}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 italic font-medium">Produto/Isca: <strong className="text-[#1A1A1A] not-italic font-semibold">{camp.productName}</strong></p>
                  </div>

                  <div className="grid grid-cols-4 gap-4 md:gap-7 shrink-0 text-center font-mono text-[10.5px]">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-gray-400 font-bold block uppercase tracking-wider">Visitas</span>
                      <span className="font-bold text-[#1A1A1A]">{camp.visits}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] text-gray-400 font-bold block uppercase tracking-wider">Scroll Médio</span>
                      <span className="font-bold text-[#1A1A1A]">{camp.avgScroll}%</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] text-gray-400 font-bold block uppercase tracking-wider">Leads</span>
                      <span className="font-bold text-[#1A1A1A]">{camp.submissions}</span>
                    </div>

                    <div className="space-y-0.5 bg-neutral-900 text-[#F5F2ED] px-2 py-1 rounded-lg">
                      <span className="text-[7.5px] text-gray-400 font-bold block uppercase tracking-wider">Conversão</span>
                      <span className="font-black text-[#FF6321]">{camp.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Proactive Smart Marketing Diagnostic Panel */}
        <div className="lg:col-span-4 bg-[#1A1A1A] border border-[#1A1A1A] rounded-2xl p-6 text-[#F5F2ED] flex flex-col justify-between shadow-lg relative overflow-hidden">
          {/* subtle decoration */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6321]/10 rounded-full blur-2xl"></div>

          <div className="space-y-4">
            <div className="border-b border-white/5 pb-3">
              <span className="inline-block px-2 py-0.5 bg-[#FF6321]/25 text-[#FF6321] border border-[#FF6321]/30 text-[8.5px] font-bold uppercase tracking-widest rounded-full font-sans mb-1.5">
                Diagnóstico IA de Conversão
              </span>
              <h4 className="font-serif italic font-medium text-sm text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF6321]" />
                Insights Rápidos de Tráfego
              </h4>
            </div>

            <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
              {bestCampaign && bestCampaign.visits > 0 ? (
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-1.5">
                    <p className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[#FF6321]" />
                      Melhor Campanha: "{bestCampaign.campaignName}"
                    </p>
                    <p className="text-[10px] text-gray-400 italic">
                      Conversão estabelecida em <strong className="text-[#FF6321]">{bestCampaign.conversionRate}%</strong>. Esta oferta está com um gancho muito propício para escala automática de anúncios!
                    </p>
                  </div>

                  {bestCampaign.avgScroll < 50 ? (
                    <div className="bg-amber-500/10 border border-amber-500/15 p-3 rounded-xl space-y-1.5 text-amber-200">
                      <p className="text-[11px] font-semibold flex items-center gap-1.5">
                        <BadgeAlert className="w-3.5 h-3.5" />
                        Gargalo de Leitura Detectado
                      </p>
                      <p className="text-[10px] text-amber-100/85">
                        Leads estão rolando apenas {bestCampaign.avgScroll}% da página. Considere colocar o formulário de quiz mais alto (ou "acima da dobra") para alavancar os números.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/15 border border-emerald-500/25 p-3 rounded-xl space-y-1.5 text-emerald-200">
                      <p className="text-[11px] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Excelente Taxa de Envolvimento
                      </p>
                      <p className="text-[10px] text-emerald-100/85">
                        Com {bestCampaign.avgScroll}% de leitura média, o script comprova que o interesse está maduro. Perfeito para injetar copies mais longas na Landing Page!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10.5px] italic text-gray-400">
                  Sem dados acumulados o suficiente de visitas de leads para avaliar gargalos no funil. Comece visitando o Simulador e mandando dados!
                </p>
              )}

              <div className="border-t border-white/5 pt-3 space-y-2">
                <p className="text-[10.5px] font-serif italic font-bold text-gray-200">💡 Como usar essas respostas para lucro?</p>
                <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-400">
                  <span className="col-span-1 text-[#FF6321] font-bold">1.</span>
                  <p className="col-span-11">Abra a aba de <strong>Copywriting Inteligente</strong> para gerar copys.</p>
                  
                  <span className="col-span-1 text-[#FF6321] font-bold">2.</span>
                  <p className="col-span-11">A IA vai extrair as dores diretas do formulário e gerar ofertas <strong>Black</strong> e <strong>White</strong> prontas para uso.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-white/5 flex gap-2">
            <button
              onClick={() => onNavigate('copy')}
              className="flex-1 bg-[#FF6321] hover:bg-[#FF6321]/90 text-white font-serif italic text-xs py-2 px-3 rounded-full font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#FF6321]/15"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Criar Copys de Elite
            </button>
            <button
              onClick={() => onNavigate('simulator')}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/10 text-[10px] py-1.5 px-3 rounded-full flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              Simulador
              <ArrowRight className="w-3 h-3 text-[#FF6321]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
