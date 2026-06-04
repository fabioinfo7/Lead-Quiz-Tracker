import React, { useState, useRef, useEffect } from 'react';
import { Campaign } from '../types';
import { 
  Laptop, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  ArrowRight,
  Info
} from 'lucide-react';

interface LandingPageSimulatorProps {
  campaigns: Campaign[];
  onNewSubmission: () => void;
}

export function LandingPageSimulator({ campaigns, onNewSubmission }: LandingPageSimulatorProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(campaigns[0]?.id || null);
  const [step, setStep] = useState(0); // 0 = Home CTA page, 1=Q1, 2=Q2, 3=Form, 4=Success
  
  // Quiz states
  const [q1Answer, setQ1Answer] = useState('');
  const [q2Answer, setQ2Answer] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAge, setLeadAge] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [pixelLogs, setPixelLogs] = useState<{ id: string; msg: string; time: string }[]>([]);
  const [sessionId] = useState(() => 'sess_sim_' + Math.random().toString(36).substring(2, 8));

  const simulationContainerRef = useRef<HTMLDivElement>(null);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [benchmarksTracked, setBenchmarksTracked] = useState<number[]>([]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  useEffect(() => {
    // Reset simulation on campaign change
    setStep(0);
    setQ1Answer('');
    setQ2Answer('');
    setLeadName('');
    setLeadEmail('');
    setLeadAge('');
    setBenchmarksTracked([]);
    setScrollDepth(0);
    setPixelLogs([{ id: 'init', msg: `Visita registrada no Pixel da campanha: ${selectedCampaign?.id}`, time: new Date().toLocaleTimeString() }]);
    
    // Automatically send initial 'visit' track
    if (selectedCampaign) {
      firePixelEvent('visit', 0);
    }
  }, [selectedCampaignId]);

  const addLog = (msg: string) => {
    setPixelLogs(prev => [{ id: Math.random().toString(), msg, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const firePixelEvent = async (type: string, scrollPct: number = 0) => {
    if (!selectedCampaign) return;
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          event_type: type,
          session_id: sessionId,
          scroll_percentage: scrollPct
        })
      });
      addLog(`[PIXEL] Disparou evento de '${type}' ${scrollPct ? `(${scrollPct}%)` : ''}`);
    } catch (e) {
      console.warn('Pixel tracking err', e);
    }
  };

  const handleSimulatedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    if (scrollHeight <= 0) return;
    
    const pct = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
    setScrollDepth(pct);

    // Track scroll events at discrete milestones
    const benchmarks = [25, 50, 75, 100];
    benchmarks.forEach(mark => {
      if (pct >= mark && !benchmarksTracked.includes(mark)) {
        setBenchmarksTracked(prev => [...prev, mark]);
        firePixelEvent('scroll', mark);
      }
    });
  };

  const trackCtaClick = () => {
    firePixelEvent('cta_click', 0);
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !selectedCampaign) return;
    setLoading(true);
    
    const answers = [
      { question: 'Qual o maior obstáculo no seu negócio hoje?', answer: q1Answer || 'Não respondido' },
      { question: 'Qual a sua faixa de faturamento mensal atual?', answer: q2Answer || 'Não respondido' }
    ];

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          name: leadName || 'Anônimo',
          email: leadEmail,
          age: parseInt(leadAge, 10) || 0,
          quiz_answers: answers,
          session_id: sessionId
        })
      });
      
      if (response.ok) {
        addLog('[PIXEL] Cadastro de Lead realizado! Enviou respostas do quiz!');
        setStep(4);
        onNewSubmission();
      }
    } catch (err) {
      addLog('[ERRO] Falha ao enviar lead para o servidor...');
    } finally {
      setLoading(false);
    }
  };

  // Pre-configured simulation options
  const defaultObstacles = [
    'Falta de tráfego qualificado para vender',
    'Dificuldade técnica para criar landing pages que convertem',
    'Destaque no criativo (satura rápido / caro)',
    'Não sei construir copies persuasivas',
    'Outros obstáculos'
  ];

  const defaultRevenues = [
    'Iniciante (Ainda não faturei)',
    'Até R$ 5.000 / mês',
    'De R$ 5.000 a R$ 20.000 / mês',
    'Acima de R$ 20.000 / mês'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Simulation browser view */}
      <div className="lg:col-span-8 space-y-4">
        {/* Browser Topbar Frame */}
        <div className="bg-[#1A1A1A] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-xl flex flex-col h-[520px]">
          <div className="bg-[#111111] px-4 py-3 border-b border-[#1A1A1A] flex items-center justify-between text-[#F5F2ED]">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
            </div>
            
            {/* Mock address bar */}
            <div className="flex-1 max-w-sm bg-[#1A1A1A] text-gray-300 font-mono text-[10px] py-1 px-3 rounded-lg text-center mx-2 truncate select-none border border-white/5">
              🌐 minha-landingpage.com.br/quiz?tracker={selectedCampaignId || 'camp_abc'}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-455">
              <Laptop className="w-3.5 h-3.5 text-[#FF6321]" />
              <span>Simulador</span>
            </div>
          </div>

          {/* Campaign Selection Row */}
          <div className="p-3 bg-[#F5F2ED] border-b border-[#E5E2DD] flex items-center justify-between gap-2 text-[#1A1A1A]">
            <div className="flex items-center gap-2 text-xs">
              <Info className="w-4 h-4 text-[#FF6321] shrink-0" />
              <span className="text-gray-600 font-serif italic">Testando Campanha:</span>
              <select
                value={selectedCampaignId || ''}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="bg-white border border-[#E5E2DD] text-[#1A1A1A] font-semibold text-xs rounded px-2.5 py-1"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => setStep(0)} 
              className="text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 text-[10px] font-serif italic hover:bg-white/60 px-2.5 py-1 border border-[#E5E2DD] rounded-full cursor-pointer transition-all"
            >
              <RefreshCw className="w-3 h-3 text-[#FF6321]" /> Reiniciar Simulação
            </button>
          </div>

          {/* Inner Simulated web core scroll area */}
          <div 
            ref={simulationContainerRef}
            onScroll={handleSimulatedScroll}
            className="flex-1 bg-[#F5F2ED] overflow-y-auto p-6 md:p-10 text-center relative scroll-smooth selection:bg-[#FF6321] selection:text-white"
          >
            {!selectedCampaign ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs font-serif italic">
                Nenhuma campanha cadastrada para simular. Crie uma campanha de isca na aba anterior!
              </div>
            ) : step === 0 ? (
              <div className="max-w-md mx-auto py-12 space-y-6 text-left animate-in fade-in zoom-in duration-300">
                <span className="inline-block px-3 py-1 bg-[#FF6321]/15 text-[#FF6321] border border-[#FF6321]/20 text-[10px] font-bold rounded-full uppercase tracking-wider font-sans">
                  Sua Isca Digital está pronta!
                </span>
                
                <h2 className="text-2xl md:text-3xl font-serif italic text-[#1A1A1A] leading-tight font-black">
                  Como ganhar o <span className="text-[#FF6321]">{selectedCampaign.product_name}</span> grátis hoje?
                </h2>
                
                <p className="text-xs text-gray-650 leading-relaxed font-sans font-medium">
                  Responda este quiz rápido de 30 segundos, valide sua maior dificuldade operacional no mercado digital, e libere o download seguro do nosso arquivo agora mesmo.
                </p>

                {/* Simulated CTA Start Button */}
                <button
                  onClick={() => {
                    trackCtaClick();
                    setStep(1);
                  }}
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white font-semibold text-xs uppercase tracking-widest py-3.5 px-7 rounded-full transition-all shadow-md cursor-pointer transform hover:scale-[1.01]"
                >
                  Começar Quiz
                  <ArrowRight className="w-4 h-4 text-[#FF6321]" />
                </button>

                <div className="text-[10px] text-gray-400 italic pt-12 text-center font-serif">
                  ↓ Role a página para ler e simular a atividade de Scroll no dashboard
                </div>
                <div className="h-[200px] flex items-end justify-center pb-8">
                  <div className="animate-bounce text-xs font-mono text-[#FF6321]">▼</div>
                </div>
                <div className="text-[10px] text-[#FF6321] italic text-center font-serif font-semibold">
                  Rolado com sucesso! (O Pixel computou a taxa de leitura).
                </div>
              </div>
            ) : step === 1 ? (
              <div className="max-w-md mx-auto space-y-5 py-6 text-left animate-in fade-in slide-in-from-right duration-200 text-[#1A1A1A]">
                <div className="flex items-center justify-between border-b border-[#E5E2DD] pb-2">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-sans">Pergunta 1 de 2</div>
                  <div className="text-[10px] text-[#FF6321] font-serif italic font-semibold">Progresso: 50%</div>
                </div>
                <h3 className="font-serif text-lg text-[#1A1A1A] leading-relaxed italic">
                  Qual o maior obstáculo no seu negócio hoje que te impede de lucrar?
                </h3>
                
                <div className="space-y-2 pt-2">
                  {defaultObstacles.map((obs, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQ1Answer(obs);
                        trackCtaClick();
                        setStep(2);
                      }}
                      className={`w-full text-left p-3.5 text-xs rounded-xl border transition-all duration-150 cursor-pointer ${
                        q1Answer === obs 
                          ? 'bg-[#FF6321]/15 border-[#FF6321] text-[#1A1A1A] font-semibold font-mono shadow-sm' 
                          : 'bg-white border-[#E5E2DD] text-[#1A1A1A]/80 hover:bg-[#FF6321]/5 hover:text-[#1A1A1A] font-mono shadow-sm'
                      }`}
                    >
                      {obs}
                    </button>
                  ))}
                </div>
              </div>
            ) : step === 2 ? (
              <div className="max-w-md mx-auto space-y-5 py-6 text-left animate-in fade-in slide-in-from-right duration-200 text-[#1A1A1A]">
                <div className="flex items-center justify-between border-b border-[#E5E2DD] pb-2">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-sans">Pergunta 2 de 2</div>
                  <div className="text-[10px] text-[#FF6321] font-serif italic font-semibold">Progresso: 100%</div>
                </div>
                <h3 className="font-serif text-lg text-[#1A1A1A] leading-relaxed italic">
                  Qual a sua faixa de faturamento mensal atual com vendas digitais?
                </h3>
                
                <div className="space-y-2 pt-2">
                  {defaultRevenues.map((rev, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQ2Answer(rev);
                        trackCtaClick();
                        setStep(3);
                      }}
                      className={`w-full text-left p-3.5 text-xs rounded-xl border transition-all duration-150 cursor-pointer ${
                        q2Answer === rev 
                          ? 'bg-[#FF6321]/15 border-[#FF6321] text-[#1A1A1A] font-semibold font-mono shadow-sm' 
                          : 'bg-white border-[#E5E2DD] text-[#1A1A1A]/80 hover:bg-[#FF6321]/5 hover:text-[#1A1A1A] font-mono shadow-sm'
                      }`}
                    >
                      {rev}
                    </button>
                  ))}
                </div>
              </div>
            ) : step === 3 ? (
              <div className="max-w-md mx-auto space-y-5 py-6 text-left animate-in fade-in slide-in-from-bottom duration-300 text-[#1A1A1A]">
                <span className="inline-block px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] rounded-full uppercase tracking-wider font-bold">
                  Respostas Registradas!
                </span>
                
                <h3 className="font-serif text-lg text-[#1A1A1A] leading-tight">
                  Último passo! Digite seus dados para liberar o download imediato de: <span className="text-[#FF6321] font-bold font-serif italic">{selectedCampaign.product_name}</span>
                </h3>

                <form onSubmit={submitLead} className="space-y-3.5 pt-2">
                  <div>
                    <label className="block text-[10px] text-[#1A1A1A]/80 font-bold mb-1 uppercase tracking-wider font-sans">Seu Primeiro Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: João (Opcional)"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full bg-white border border-[#E5E2DD]/80 focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-3.5 py-3 outline-none shadow-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-[#1A1A1A]/80 font-bold mb-1 uppercase tracking-wider font-sans">Melhor E-mail</label>
                      <input
                        type="email"
                        required
                        placeholder="joao@gmail.com"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        className="w-full bg-white border border-[#E5E2DD]/80 focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-3.5 py-3 outline-none shadow-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#1A1A1A]/80 font-bold mb-1 uppercase tracking-wider font-sans">Idade</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Ex: 25 (Opcional)"
                        value={leadAge}
                        onChange={(e) => setLeadAge(e.target.value)}
                        className="w-full bg-white border border-[#E5E2DD]/80 focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-3.5 py-3 outline-none shadow-sm font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white text-xs font-bold uppercase tracking-widest py-3.5 px-4 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      'Gravando respostas...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#FF6321]" />
                        Salvar e Baixar Isca Digital
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="max-w-md mx-auto py-12 space-y-4 animate-in fade-in zoom-in duration-400 text-[#1A1A1A]">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-lg text-[#111] italic font-semibold">Sucesso absoluto!</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-sans max-w-xs mx-auto italic">
                  O quiz terminou! Seus dados e a pesquisa foram consolidados. Seu arquivo <strong className="text-[#1A1A1A] font-bold">{selectedCampaign.product_name}</strong> começará a baixar em instantes.
                </p>

                <div className="pt-6">
                  <button
                    onClick={() => setStep(0)}
                    className="text-gray-500 hover:text-[#1A1A1A] hover:bg-white/60 px-4 py-1.5 rounded-full text-[10px] font-serif italic border border-[#E5E2DD] bg-white transition-all shadow-sm"
                  >
                    Simular Nova Visita
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live debugging simulator logs */}
      <div className="lg:col-span-4 flex flex-col justify-between">
        <div className="bg-white border border-[#E5E2DD] rounded-2xl p-5 flex flex-col h-[520px] shadow-sm text-[#1A1A1A]">
          <div className="border-b border-[#E5E2DD] pb-3 mb-3 shrink-0">
            <h4 className="font-serif text-sm italic text-[#1A1A1A] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6321] animate-pulse"></span>
              Console de Depuração do Pixel
            </h4>
            <p className="text-[10px] text-gray-500 mt-1 italic">Veja as chamadas de API geradas do pixel em tempo real ao mexer no simulador ao lado:</p>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[9.5px] space-y-2 bg-[#1A1A1A] p-4 rounded-xl border border-neutral-900 shadow-inner">
            {pixelLogs.map((log) => (
              <div key={log.id} className="text-[#F5F2ED] leading-relaxed border-b border-white/5 pb-1.5 break-all">
                <span className="text-gray-400 block text-[8px] mb-0.5 font-mono">{log.time}</span>
                <span className="text-[#FF6321] font-semibold">{log.msg}</span>
              </div>
            ))}
          </div>

          <div className="mt-3.5 pt-3.5 border-t border-[#E5E2DD] shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
              <span>Scroll Monitor: {scrollDepth}%</span>
              <span>Sessão: {sessionId.substring(5)}</span>
            </div>
            {/* mini status logs layout */}
            <div className="bg-[#F5F2ED] p-2.5 rounded-lg border border-[#E5E2DD] text-[9.5px] text-gray-500 leading-relaxed font-mono">
              🎯 <strong>Instruções de teste</strong>: Clique nos botões do simulador e acompanhe as mudanças ocorrerem instantaneamente nas abas de <strong>Relatórios</strong> e <strong>Leads</strong>!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
