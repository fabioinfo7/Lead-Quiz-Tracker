import React, { useState } from 'react';
import { Lead } from '../types';
import { Search, User, Mail, Calendar, HelpCircle, ArrowRight, MessageSquare, Tag } from 'lucide-react';

interface LeadDetailsProps {
  leads: Lead[];
}

export function LeadDetails({ leads }: LeadDetailsProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter leads based on search query
  const filteredLeads = leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      (lead.campaign_name && lead.campaign_name.toLowerCase().includes(q))
    );
  });

  const selectedLead = filteredLeads.find(l => l.id === selectedLeadId) || filteredLeads[0];

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-[#E5E2DD] rounded-2xl overflow-hidden min-h-[580px] shadow-sm text-[#1A1A1A]">
      {/* Left panel: List leads */}
      <div className="lg:col-span-5 border-r border-[#E5E2DD] flex flex-col h-full bg-[#F5F2ED]/40">
        <div className="p-4 border-b border-[#E5E2DD]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-450" />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou campanha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
        </div>

        {/* Lead scrollable container */}
        <div className="flex-1 overflow-y-auto max-h-[500px] h-full divide-y divide-[#E5E2DD]/60">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-405 text-sm font-serif italic">
              <User className="w-8 h-8 text-gray-300 mx-auto mb-2.5" />
              Nenhum lead encontrado
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isActive = selectedLead?.id === lead.id;
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full text-left p-4.5 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isActive 
                      ? 'bg-[#FF6321]/10 border-l-4 border-[#FF6321]' 
                      : 'hover:bg-white/60 border-l-4 border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-11">
                      <span className="font-semibold text-xs text-[#1A1A1A] truncate max-w-[150px]">{lead.name}</span>
                      <span className="px-1.5 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/80 font-mono text-[9px] rounded-md border border-[#E5E2DD] font-medium">
                        {lead.age} anos
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 italic font-mono truncate">{lead.email}</div>
                    
                    {/* Campaign tag */}
                    {lead.campaign_name && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-[#FF6321]/90 font-serif italic font-semibold">
                        <Tag className="w-3 h-3" />
                        <span className="truncate max-w-[170px]">{lead.campaign_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] text-gray-450 italic">{formatDate(lead.created_at).split(' ')[0]}</span>
                    <ArrowRight className={`w-3.5 h-3.5 mt-2 transition-transform ${isActive ? 'translate-x-1 text-[#FF6321]' : 'text-gray-350'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Detailed Quiz Answers */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 bg-white">
        {selectedLead ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 bg-[#F5F2ED] border border-[#E5E2DD] rounded-xl shadow-sm text-[#1A1A1A]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FF6321] text-white flex items-center justify-center font-bold text-xs shrink-0 font-serif">
                    {selectedLead.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">{selectedLead.name}</h4>
                </div>
                
                <div className="flex flex-col gap-1 text-[11px] text-gray-600 pl-9">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedLead.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedLead.age} anos</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end text-right border-t md:border-t-0 pt-3 md:pt-0 md:pl-4 border-[#E5E2DD] text-[10px] space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#FF6321]" />
                  <span>Cadastrado em: {formatDate(selectedLead.created_at)}</span>
                </div>
                {selectedLead.campaign_name && (
                  <div className="px-2 py-0.5 bg-[#FF6321]/15 text-[#FF6321] border border-[#FF6321]/20 rounded font-serif italic text-[9px] font-bold">
                    Campanha: {selectedLead.campaign_name}
                  </div>
                )}
                {selectedLead.product_name && (
                  <div className="text-[10px] text-gray-500 italic mt-0.5">
                    Isca: <span className="text-[#1A1A1A] font-bold font-mono">{selectedLead.product_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Questions list */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-[#FF6321]" />
                <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Respostas do Quiz (Material de Copy)</h5>
              </div>

              {(!selectedLead.quiz_answers || selectedLead.quiz_answers.length === 0) ? (
                <div className="text-center p-6 bg-[#F5F2ED]/40 rounded-xl border border-[#E5E2DD] text-xs text-gray-400 font-serif italic">
                  Nenhuma pergunta respondida para este lead.
                </div>
              ) : (
                <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                  {selectedLead.quiz_answers.map((qa, index) => (
                    <div 
                      key={index}
                      className="bg-[#F5F2ED] border border-[#E5E2DD]/80 rounded-xl p-4 space-y-2.5 relative overflow-hidden"
                    >
                      {/* Decorative index badge */}
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#E5E2DD] text-[#1A1A1A]/80 text-[9px] font-mono rounded-bl-lg font-bold">
                        Q{index + 1}
                      </div>

                      <div className="flex gap-2 items-start pr-8 text-[#1A1A1A]">
                        <HelpCircle className="w-4 h-4 text-[#FF6321] shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold leading-relaxed">
                          {qa.question}
                        </span>
                      </div>

                      <div className="pl-6 pt-1 border-t border-[#E5E2DD]/40">
                        <div className="text-xs text-[#1A1A1A] italic font-serif leading-relaxed bg-[#FF6321]/5 p-2.5 rounded-lg border border-[#FF6321]/10 relative">
                          <span className="text-[#FF6321] font-extrabold mr-1">"</span>
                          {qa.answer}
                          <span className="text-[#FF6321] font-extrabold ml-1">"</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-400 font-serif italic">
            <User className="w-12 h-12 text-gray-350 mb-3" />
            <span className="text-sm">Selecione um lead ao lado para explorar as respostas do Quiz.</span>
          </div>
        )}
      </div>
    </div>
  );
}
