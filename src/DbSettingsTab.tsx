import React, { useState } from 'react';
import { Campaign, Lead } from '../types';
import { Sparkles, RefreshCw, Copy, Check, MessageSquareCode, Flame, HelpCircle } from 'lucide-react';

interface CopyCreatorProps {
  campaigns: Campaign[];
  leads: Lead[];
}

export function CopyCreator({ campaigns, leads }: CopyCreatorProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(campaigns[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [errorMess, setErrorMess] = useState('');

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];
  const campaignLeads = leads.filter(l => l.campaign_id === selectedCampaign?.id);

  const triggerAnalysis = async () => {
    if (!selectedCampaign) return;
    setLoading(true);
    setErrorMess('');
    setAiResponse(null);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (data.canAnalyze) {
          setAiResponse(data.analysis);
        } else {
          setErrorMess(data.message);
        }
      } else {
        setErrorMess(data.error || 'Erro ao realizar análise.');
      }
    } catch (err: any) {
      setErrorMess(err.message || 'Erro inesperado ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!aiResponse) return;
    navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Beautiful render helper for raw Markdown
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-4 text-xs text-[#1A1A1A] leading-relaxed font-sans">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return <h4 key={idx} className="font-serif text-sm font-semibold text-[#1A1A1A] mt-5 mb-2.5 flex items-center gap-1.5 border-b border-[#E5E2DD] pb-1.5">{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={idx} className="font-serif text-base font-bold text-[#FF6321] mt-6 mb-3 flex items-center gap-1.5 border-b border-[#E5E2DD]/80 pb-2">{line.replace('## ', '')}</h3>;
          }
          if (line.startsWith('# ')) {
            return <h2 key={idx} className="font-serif text-lg font-extrabold text-[#1A1A1A] mt-8 mb-4 border-b border-[#E5E2DD] pb-2.5">{line.replace('# ', '')}</h2>;
          }
          
          // Lists
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const cleanContent = line.substring(2);
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5">
                <li>{parseInlineBold(cleanContent)}</li>
              </ul>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const cleanContent = line.replace(/^\d+\.\s/, '');
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1.5">
                <li>{parseInlineBold(cleanContent)}</li>
              </ol>
            );
          }

          // Plain text helper
          if (line.trim() === '') return <div key={idx} className="h-2"></div>;

          return <p key={idx} className="p-0.5">{parseInlineBold(line)}</p>;
        })}
      </div>
    );
  };

  // Helper to highlight **bold text**
  const parseInlineBold = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-[#FF6321] font-bold bg-[#FF6321]/5 px-1.5 py-0.5 rounded border border-[#FF6321]/15 font-mono">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 text-[#1A1A1A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-[#E5E2DD] pb-4.5">
          <div className="space-y-1">
            <h3 className="font-serif text-lg italic text-[#1A1A1A] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF6321]" />
              Copywriting de Elite com Gemini AI
            </h3>
            <p className="text-xs text-gray-500 italic">
              Analise as respostas coletadas no quiz para mapear as dores reais do seu público e estruturar sua comunicação de vendas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                setAiResponse(null);
                setErrorMess('');
              }}
              className="bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-3.5 py-2.5 outline-none font-sans font-medium shadow-sm cursor-pointer"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={triggerAnalysis}
              disabled={loading || !selectedCampaign || campaignLeads.length === 0}
              className="bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-xs py-3 px-5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-widest shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6321]" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#FF6321]" />
                  Criar Copy & Validar Dor
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Campaign Summary */}
        {selectedCampaign && (
          <div className="p-3 bg-[#F5F2ED] border border-[#E5E2DD] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
            <div className="flex gap-2 items-center">
              <Flame className="w-4 h-4 text-[#FF6321]" />
              <span className="text-gray-600">Produto Principal: <strong className="text-[#1A1A1A]">{selectedCampaign.product_name}</strong></span>
            </div>
            <div className="font-mono text-gray-550 flex gap-3 text-[10px]">
              <span>Leads com Respostas: <strong className="text-[#FF6321] font-bold">{campaignLeads.length}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Display Card */}
      <div className="bg-white border border-[#E5E2DD] rounded-2xl p-6 min-h-[300px] flex flex-col justify-between shadow-sm text-[#1A1A1A]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-4">
            <div className="p-3 bg-[#FF6321]/15 text-[#FF6321] rounded-full animate-pulse border border-[#FF6321]/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-serif text-base italic text-[#1A1A1A]">Gemini está lapidando suas dores...</h4>
              <p className="text-xs text-gray-500 italic max-w-sm">
                A IA está cruzando todas as respostas do seu Leads Quiz para validar o produto e digitar uma copy de altíssimo impacto.
              </p>
            </div>
          </div>
        ) : errorMess ? (
          <div className="flex-1 flex flex-col items-center justify-center py-14 text-center">
            <div className="p-2.5 bg-[#FF6321]/10 text-[#FF6321] rounded-full mb-3.5 border border-[#FF6321]/20">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h5 className="font-serif text-sm font-bold text-[#FF6321] mb-1">Atenção</h5>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed italic">{errorMess}</p>
            
            {campaignLeads.length === 0 && (
              <div className="mt-4 p-3 bg-[#F5F2ED] rounded-xl border border-[#E5E2DD] text-[11px] text-[#FF6321] flex items-center justify-center gap-1.5 max-w-sm font-serif italic shadow-inner">
                💡 Dica: Dispare testes na aba "Simulador" para ver a IA!
              </div>
            )}
          </div>
        ) : aiResponse ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2DD] pb-3">
              <span className="text-xs font-bold font-mono text-[#FF6321] uppercase tracking-widest flex items-center gap-2">
                <MessageSquareCode className="w-4 h-4 text-[#FF6321]" />
                Estudo de Copywriting Gerado com Sucesso
              </span>
              <button
                onClick={copyResult}
                className="text-xs text-[#FF6321] hover:text-[#FF6321]/90 flex items-center gap-1.5 cursor-pointer bg-[#FF6321]/5 border border-[#FF6321]/20 px-3.5 py-1.5 rounded-full hover:bg-[#FF6321]/15 transition-all font-serif italic font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Resultados
                  </>
                )}
              </button>
            </div>

            {/* Rendered content */}
            <div className="bg-[#F5F2ED]/40 border border-[#E5E2DD] rounded-2xl p-6 max-w-none shadow-inner">
              {renderMarkdown(aiResponse)}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-gray-400 font-serif italic">
            <Sparkles className="w-12 h-12 text-gray-200 mb-3" />
            <span className="text-sm font-semibold text-[#1A1A1A] mb-1">Pronto para criar copies de altíssimo impacto?</span>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed">
              Clique no botão de geração no cabeçalho acima para que o Gemini leia todas as respostas e formate um copywriting poderoso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
