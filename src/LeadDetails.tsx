import React, { useState } from 'react';
import { Lead } from '../types';
import { Search, User, Mail, Calendar, HelpCircle, ArrowRight, MessageSquare, Tag, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react';

interface LeadDetailsProps {
  leads: Lead[];
  onRefresh: () => void;
}

export function LeadDetails({ leads, onRefresh }: LeadDetailsProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', age: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return isoStr; }
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({ name: lead.name, email: lead.email, age: String(lead.age) });
    setStatusMsg(null);
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, email: editForm.email, age: parseInt(editForm.age) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'ok', text: 'Lead atualizado com sucesso!' });
        setEditingLead(null);
        onRefresh();
      } else {
        setStatusMsg({ type: 'err', text: data.error || 'Erro ao atualizar lead.' });
      }
    } catch {
      setStatusMsg({ type: 'err', text: 'Falha de rede ao atualizar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmId(null);
        if (selectedLeadId === id) setSelectedLeadId(null);
        onRefresh();
      } else {
        setStatusMsg({ type: 'err', text: data.error || 'Erro ao excluir.' });
      }
    } catch {
      setStatusMsg({ type: 'err', text: 'Falha de rede ao excluir.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-[#E5E2DD] rounded-2xl overflow-hidden min-h-[580px] shadow-sm text-[#1A1A1A]">
      {/* Left panel */}
      <div className="lg:col-span-5 border-r border-[#E5E2DD] flex flex-col h-full bg-[#F5F2ED]/40">
        <div className="p-4 border-b border-[#E5E2DD]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou campanha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E2DD] focus:border-[#FF6321] text-[#1A1A1A] text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
          <div className="mt-2 text-[10px] text-gray-400 text-right font-mono">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</div>
        </div>

        {statusMsg && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${statusMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {statusMsg.type === 'ok' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {statusMsg.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto max-h-[500px] h-full divide-y divide-[#E5E2DD]/60">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm font-serif italic">
              <User className="w-8 h-8 text-gray-300 mx-auto mb-2.5" />
              Nenhum lead encontrado
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isActive = selectedLead?.id === lead.id;
              return (
                <div key={lead.id} className={`transition-all duration-200 flex items-center gap-1 ${isActive ? 'bg-[#FF6321]/10 border-l-4 border-[#FF6321]' : 'hover:bg-white/60 border-l-4 border-transparent'}`}>
                  <button
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="flex-1 text-left p-4 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold text-xs text-[#1A1A1A] truncate max-w-[150px]">{lead.name}</span>
                        <span className="px-1.5 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/80 font-mono text-[9px] rounded-md border border-[#E5E2DD] font-medium">{lead.age}a</span>
                      </div>
                      <div className="text-[10px] text-gray-500 italic font-mono truncate">{lead.email}</div>
                      {lead.campaign_name && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#FF6321]/90 font-serif italic font-semibold">
                          <Tag className="w-3 h-3" />
                          <span className="truncate max-w-[170px]">{lead.campaign_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] text-gray-400 italic">{formatDate(lead.created_at).split(' ')[0]}</span>
                      <ArrowRight className={`w-3.5 h-3.5 mt-2 transition-transform ${isActive ? 'translate-x-1 text-[#FF6321]' : 'text-gray-350'}`} />
                    </div>
                  </button>
                  {/* Action buttons */}
                  <div className="flex flex-col gap-1 pr-2 shrink-0">
                    <button
                      onClick={() => openEdit(lead)}
                      title="Editar lead"
                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {deleteConfirmId === lead.id ? (
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deleting}
                        className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white border border-red-500 transition-colors cursor-pointer"
                        title="Confirmar exclusão"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(lead.id)}
                        title="Excluir lead"
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 border border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 bg-white">
        {/* Edit modal overlay */}
        {editingLead && (
          <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E2DD] w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#FF6321]" /> Editar Lead
                </h3>
                <button onClick={() => setEditingLead(null)} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1.5 block">Nome</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-[#E5E2DD] focus:border-[#FF6321] rounded-xl px-3 py-2.5 text-xs outline-none transition-all"
                    placeholder="Nome do lead"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1.5 block">E-mail</label>
                  <input
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-[#E5E2DD] focus:border-[#FF6321] rounded-xl px-3 py-2.5 text-xs outline-none transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1.5 block">Idade</label>
                  <input
                    value={editForm.age}
                    onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))}
                    type="number"
                    className="w-full border border-[#E5E2DD] focus:border-[#FF6321] rounded-xl px-3 py-2.5 text-xs outline-none transition-all"
                    placeholder="Idade"
                  />
                </div>
                {statusMsg && (
                  <div className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${statusMsg.type === 'err' ? 'bg-red-50 text-red-700 border border-red-200' : ''}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />{statusMsg.text}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingLead(null)}
                    className="flex-1 px-4 py-2.5 text-xs border border-[#E5E2DD] rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 text-xs bg-[#FF6321] text-white rounded-xl hover:bg-[#e5541a] cursor-pointer transition-colors font-semibold disabled:opacity-60"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedLead ? (
          <div className="space-y-6">
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
                  <span>{formatDate(selectedLead.created_at)}</span>
                </div>
                {selectedLead.campaign_name && (
                  <div className="px-2 py-0.5 bg-[#FF6321]/15 text-[#FF6321] border border-[#FF6321]/20 rounded font-serif italic text-[9px] font-bold">
                    {selectedLead.campaign_name}
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => openEdit(selectedLead)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  {deleteConfirmId === selectedLead.id ? (
                    <button
                      onClick={() => handleDelete(selectedLead.id)}
                      disabled={deleting}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white border border-red-500 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      <Check className="w-3 h-3" /> Confirmar
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(selectedLead.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-[#FF6321]" />
                <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Respostas do Quiz</h5>
                <span className="ml-auto text-[9px] font-mono bg-[#F5F2ED] border border-[#E5E2DD] px-2 py-0.5 rounded text-gray-500">
                  {selectedLead.quiz_answers?.length || 0} respostas
                </span>
              </div>

              {(!selectedLead.quiz_answers || selectedLead.quiz_answers.length === 0) ? (
                <div className="text-center p-6 bg-[#F5F2ED]/40 rounded-xl border border-[#E5E2DD] text-xs text-gray-400 font-serif italic">
                  Nenhuma pergunta respondida para este lead.
                </div>
              ) : (
                <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                  {selectedLead.quiz_answers.map((qa, index) => (
                    <div key={index} className="bg-[#F5F2ED] border border-[#E5E2DD]/80 rounded-xl p-4 space-y-2.5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#E5E2DD] text-[#1A1A1A]/80 text-[9px] font-mono rounded-bl-lg font-bold">Q{index + 1}</div>
                      <div className="flex gap-2 items-start pr-8 text-[#1A1A1A]">
                        <HelpCircle className="w-4 h-4 text-[#FF6321] shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold leading-relaxed">{qa.question}</span>
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
