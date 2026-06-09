import React, { useState } from 'react';
import { Campaign, AnalyticsSummary } from '../types';
import { 
  PlusCircle, Copy, Check, BarChart3, Eye, MousePointerClick, Users, 
  FileCheck, Percent, Cpu, Code, BookOpen, Pencil, Trash2, X, AlertTriangle, Zap
} from 'lucide-react';

interface CampaignDetailsProps {
  campaigns: Campaign[];
  analytics: AnalyticsSummary[];
  onCreateCampaign: (name: string, product: string) => Promise<void>;
  appUrl: string;
  onRefresh: () => void;
}

export function CampaignDetails({ campaigns, analytics, onCreateCampaign, appUrl, onRefresh }: CampaignDetailsProps) {
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newBaitName, setNewBaitName] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(campaigns[0]?.id || null);
  const [creating, setCreating] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAPI, setCopiedAPI] = useState(false);
  const [copiedGetLead, setCopiedGetLead] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit state
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: '', product_name: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Script tab: 'tracker' | 'getlead'
  const [scriptTab, setScriptTab] = useState<'tracker' | 'getlead'>('tracker');

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
      setErrorMsg(err?.message || 'Falha de conexão ou erro de sintaxe/privilégios na tabela SQL do banco.');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (camp: Campaign) => {
    setEditingCampaign(camp);
    setEditForm({ name: camp.name, product_name: camp.product_name });
    setStatusMsg(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCampaign) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, product_name: editForm.product_name })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'ok', text: 'Campanha atualizada!' });
        setEditingCampaign(null);
        onRefresh();
      } else {
        setStatusMsg({ type: 'err', text: data.error || 'Erro ao atualizar.' });
      }
    } catch {
      setStatusMsg({ type: 'err', text: 'Falha de rede.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmId(null);
        if (selectedCampaignId === id) setSelectedCampaignId(null);
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

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];
  const stats = analytics.find(a => a.campaignId === selectedCampaign?.id) || {
    campaignId: selectedCampaign?.id || '',
    campaignName: selectedCampaign?.name || '',
    productName: selectedCampaign?.product_name || '',
    visits: 0, ctaClicks: 0, conversionRate: 0, avgScroll: 0, submissions: 0
  };

  const activeCid = selectedCampaign?.id || 'CAMPAIGN_ID';
  const publicAppUrl = appUrl.includes('ais-dev-') ? appUrl.replace('ais-dev-', 'ais-pre-') : appUrl;

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

  // GetLead tracker script — integrado com o sistema local via LeadTracker
  const getLeadScriptCode = `<!-- GetLead + LeadQuiz Tracker — Cole antes de </body> -->
<!-- Carrega o pixel do LeadQuiz primeiro -->
<script>
  (function(w, d, s, u, c) {
    w.LeadTracker = w.LeadTracker || {
      _q: [],
      submitLead: function(data) {
        return new Promise(function(resolve, reject) {
          w.LeadTracker._q.push({ data: data, resolve: resolve, reject: reject });
        });
      },
      trackCta: function() { w.LeadTracker._q.push({ type: 'cta' }); }
    };
    var js = d.createElement(s); js.async = true;
    js.src = u + "?cid=" + c;
    d.getElementsByTagName(s)[0].parentNode.insertBefore(js, d.getElementsByTagName(s)[0]);
  })(window, document, 'script', '${publicAppUrl}/pixel.js', '${activeCid}');
</script>

<!-- Formulário GetLead — preencha com o slug da sua isca -->
<script>
(function(){
  var GL_ISCA_SLUG = "SEU-SLUG-AQUI"; // ← troque pelo slug da sua isca no GetLead
  var GL_BASE = 'https://getlead.up.railway.app';
  var sid = sessionStorage.getItem('gl_sid');
  if(!sid){ sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('gl_sid', sid); }
  function getUtm(k){ return new URLSearchParams(location.search).get(k) || ''; }

  // Registra visita no GetLead
  fetch(GL_BASE+'/api/iscas/'+GL_ISCA_SLUG+'/visit',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ session_id: sid, utm_source: getUtm('utm_source'),
      utm_medium: getUtm('utm_medium'), utm_campaign: getUtm('utm_campaign'), referrer: document.referrer })
  }).catch(function(){});

  // Rastreia cliques em CTAs no GetLead
  document.addEventListener('click', function(e){
    var btn = e.target.closest('[data-gl-cta]');
    if(!btn) return;
    fetch(GL_BASE+'/api/iscas/'+GL_ISCA_SLUG+'/cta',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ session_id: sid, utm_source: getUtm('utm_source') })
    }).catch(function(){});
  });

  // Intercepta envio do formulário quiz
  document.addEventListener('submit', function(e){
    var form = e.target;
    if(!form.matches('#quiz-form,.gl-quiz-form,[data-gl-quiz]')) return;
    e.preventDefault();
    var email = (form.querySelector('[name=email],[type=email]')?.value||'').trim();
    var nome  = (form.querySelector('[name=nome],[name=name]')?.value||'').trim();
    var idade = (form.querySelector('[name=idade],[name=age]')?.value||'').trim();
    var reservados = ['email','nome','name','idade','age'];
    var respostas = {};
    var quizAnswers = [];
    new FormData(form).forEach(function(val, key){
      if(!reservados.includes(key.toLowerCase()) && key){
        respostas[key] = val;
        quizAnswers.push({ question: key, answer: val });
      }
    });

    // Envia para GetLead
    fetch(GL_BASE+'/api/iscas/'+GL_ISCA_SLUG+'/lead',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: email, nome: nome||undefined, idade: idade||undefined,
        respostas: respostas, session_id: sid, utm_source: getUtm('utm_source'),
        utm_medium: getUtm('utm_medium'), utm_campaign: getUtm('utm_campaign'),
        utm_content: getUtm('utm_content'), utm_term: getUtm('utm_term') })
    }).then(function(r){ return r.json(); })
    .then(function(d){ if(d.ok){ console.log('[GetLead] Lead registrado!', d); } })
    .catch(function(){});

    // Envia também para o LeadQuiz Tracker (seu banco local/MySQL)
    if(window.LeadTracker && window.LeadTracker.submitLead){
      window.LeadTracker.submitLead({
        name: nome, email: email,
        age: parseInt(idade) || 0,
        quiz_answers: quizAnswers
      }).then(function(res){
        if(res && res.success){
          // Redirecionar após envio: window.location.href = '/obrigado';
          console.log('[LeadQuiz] Lead salvo localmente!', res);
        }
      });
    }
  });
})();
</script>`;

  const manualApiCode = `// Chame quando o Lead submeter o quiz no seu formulário:
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

  const copyToClipboard = (text: string, type: 'script' | 'api' | 'getlead') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') { setCopiedScript(true); setTimeout(() => setCopiedScript(false), 2000); }
    else if (type === 'api') { setCopiedAPI(true); setTimeout(() => setCopiedAPI(false), 2000); }
    else { setCopiedGetLead(true); setTimeout(() => setCopiedGetLead(false), 2000); }
  };

  const formatDate = (isoStr: string) => {
    try { return new Date(isoStr).toLocaleDateString('pt-BR'); } catch { return isoStr; }
  };

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E2DD] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#FF6321]" /> Editar Campanha
              </h3>
              <button onClick={() => setEditingCampaign(null)} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1.5 block">Nome da Campanha</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-[#E5E2DD] focus:border-[#FF6321] rounded-xl px-3 py-2.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1.5 block">Produto / Isca Digital</label>
                <input
                  value={editForm.product_name}
                  onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))}
                  className="w-full border border-[#E5E2DD] focus:border-[#FF6321] rounded-xl px-3 py-2.5 text-xs outline-none transition-all"
                />
              </div>
              {statusMsg?.type === 'err' && (
                <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5" />{statusMsg.text}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditingCampaign(null)} className="flex-1 px-4 py-2.5 text-xs border border-[#E5E2DD] rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2.5 text-xs bg-[#FF6321] text-white rounded-xl hover:bg-[#e5541a] cursor-pointer transition-colors font-semibold disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upper Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create campaign */}
        <div className="lg:col-span-5 bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 flex flex-col justify-between text-[#1A1A1A]">
          <div>
            <h3 className="font-serif text-lg italic text-[#1A1A1A] mb-1 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#FF6321]" /> Criar Nova Campanha
            </h3>
            <p className="text-xs text-gray-500 italic mb-4">Cada campanha gera um pixel exclusivo para sua landing page.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/80 mb-1.5">Nome da Campanha (Interno)</label>
                <input type="text" required placeholder="Ex: LP Tráfego Pago Ebook 2026" value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/80 mb-1.5">Produto Principal / Isca Digital</label>
                <input type="text" required placeholder="Ex: Guia Completo Tráfego Pago (E-Book)" value={newBaitName}
                  onChange={e => setNewBaitName(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#E5E2DD] focus:border-[#FF6321] text-xs text-[#1A1A1A] rounded-xl px-4 py-2.5 outline-none transition-colors" />
              </div>
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-[10.5px] leading-relaxed">
                  <p className="font-bold flex items-center gap-1 text-red-700">⚠️ Erro ao Salvar:</p>
                  <p className="font-sans italic">{errorMsg}</p>
                </div>
              )}
              <button type="submit" disabled={creating} className="w-full mt-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white font-semibold text-xs uppercase tracking-widest py-3 px-4 rounded-full transition-colors cursor-pointer disabled:opacity-60">
                {creating ? 'Criando...' : 'Cadastrar e Gerar Código'}
              </button>
            </form>
          </div>
        </div>

        {/* Campaign list with edit/delete */}
        <div className="lg:col-span-7 bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 flex flex-col h-full text-[#1A1A1A]">
          <h3 className="font-serif text-lg italic text-[#1A1A1A] mb-1 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#FF6321]" /> Campanhas Ativas
          </h3>
          <p className="text-xs text-gray-500 italic mb-4">Selecione uma campanha para ver métricas e scripts de integração.</p>

          {statusMsg?.type === 'ok' && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5" />{statusMsg.text}
            </div>
          )}

          <div className="flex-1 overflow-y-auto max-h-[240px] pr-1 space-y-2">
            {campaigns.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-8 font-serif italic">Nenhuma campanha cadastrada ainda.</div>
            ) : (
              campaigns.map((camp) => {
                const isSelected = selectedCampaign?.id === camp.id;
                const matches = analytics.find(a => a.campaignId === camp.id) || { visits: 0, submissions: 0 };
                return (
                  <div key={camp.id} className={`rounded-xl border flex items-center gap-1 transition-all duration-200 ${isSelected ? 'bg-[#FF6321]/15 border-[#FF6321]' : 'bg-white border-[#E5E2DD] hover:bg-[#F5F2ED]/50'}`}>
                    <button onClick={() => setSelectedCampaignId(camp.id)} className="flex-1 text-left p-3.5 flex items-center justify-between cursor-pointer">
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-xs truncate">{camp.name}</div>
                        <div className="text-[10px] text-gray-500 italic truncate mt-1">
                          Isca: <span className="text-[#1A1A1A] font-semibold font-mono">{camp.product_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[9.5px] text-[#1A1A1A]/70 bg-[#F5F2ED] border border-[#E5E2DD] px-3 py-1.5 rounded-lg shadow-sm shrink-0">
                        <BarChart3 className="w-3.5 h-3.5 text-[#FF6321]" />
                        <span className="font-serif italic">{matches.visits} Visitas</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[#FF6321] font-bold">{matches.submissions} Leads</span>
                      </div>
                    </button>
                    <div className="flex flex-col gap-1 pr-2 shrink-0">
                      <button onClick={() => openEdit(camp)} title="Editar" className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 border border-blue-200 transition-colors cursor-pointer">
                        <Pencil className="w-3 h-3" />
                      </button>
                      {deleteConfirmId === camp.id ? (
                        <button onClick={() => handleDelete(camp.id)} disabled={deleting} title="Confirmar" className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white border border-red-500 transition-colors cursor-pointer">
                          <Check className="w-3 h-3" />
                        </button>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(camp.id)} title="Excluir" className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 border border-red-200 transition-colors cursor-pointer">
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
      </div>

      {/* Stats + Scripts */}
      {selectedCampaign && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 text-[#1A1A1A]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-[#E5E2DD]/80 pb-4">
              <div>
                <h4 className="font-serif text-lg italic">Relatório de Rastreamento</h4>
                <p className="text-xs text-gray-500 italic">Analíticos do pixel: <span className="text-[#FF6321] font-bold font-mono">{selectedCampaign.name}</span></p>
              </div>
              <div className="text-xs text-gray-400 italic">Cadastrada em: {formatDate(selectedCampaign.created_at)}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Visitas', value: stats.visits, sub: 'Views registradas', icon: <Eye className="w-4 h-4 text-gray-400" />, color: '' },
                { label: 'Cliques CTA', value: stats.ctaClicks, sub: `CTR: ${stats.visits > 0 ? Math.round((stats.ctaClicks / stats.visits) * 100) : 0}%`, icon: <MousePointerClick className="w-4 h-4 text-gray-400" />, color: '' },
                { label: 'Leads', value: stats.submissions, sub: 'Quiz finalizados', icon: <Users className="w-4 h-4 text-[#FF6321]" />, color: 'text-[#FF6321]' },
                { label: 'Conversão', value: `${stats.conversionRate}%`, sub: 'Leads / Visitas', icon: <Percent className="w-4 h-4 text-gray-400" />, color: 'text-[#FF6321]' },
              ].map(m => (
                <div key={m.label} className="bg-[#F5F2ED] border border-[#E5E2DD] p-4 rounded-xl flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest">{m.label}</span>
                    {m.icon}
                  </div>
                  <div>
                    <span className={`text-2xl font-serif ${m.color || 'text-[#1A1A1A]'}`}>{m.value}</span>
                    <p className="text-[9px] text-gray-400 mt-0.5 font-mono">{m.sub}</p>
                  </div>
                </div>
              ))}
              <div className="bg-[#F5F2ED] border border-[#E5E2DD] p-4 rounded-xl flex flex-col justify-between col-span-2 md:col-span-1 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Scroll Médio</span>
                  <BarChart3 className="w-4 h-4 text-[#FF6321]" />
                </div>
                <div>
                  <span className="text-2xl font-serif text-[#1A1A1A]">{stats.avgScroll}%</span>
                  <div className="w-full bg-[#E5E2DD] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#FF6321] h-full rounded-full transition-all duration-300" style={{ width: `${stats.avgScroll}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Script section with tabs */}
          <div className="bg-white border border-[#E5E2DD] rounded-2xl shadow-sm p-6 text-[#1A1A1A]">
            <h4 className="font-serif text-lg italic mb-1.5 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#FF6321]" /> Instalação do Pixel / Integração
            </h4>
            <p className="text-xs text-gray-500 italic mb-5 leading-relaxed">
              Escolha o método de integração para sua landing page. O <strong>Tracker Local</strong> salva leads no seu banco de dados. A integração <strong>GetLead</strong> envia os dados para ambos simultaneamente.
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 border-b border-[#E5E2DD] pb-3">
              <button
                onClick={() => setScriptTab('tracker')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${scriptTab === 'tracker' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border border-[#E5E2DD] hover:bg-white'}`}
              >
                <Code className="w-3.5 h-3.5 text-[#FF6321]" /> Pixel LeadQuiz (Local)
              </button>
              <button
                onClick={() => setScriptTab('getlead')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${scriptTab === 'getlead' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border border-[#E5E2DD] hover:bg-white'}`}
              >
                <Zap className="w-3.5 h-3.5 text-[#FF6321]" /> GetLead + LeadQuiz (Duplo)
              </button>
            </div>

            {scriptTab === 'tracker' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-[#FF6321]" /> Script de Carregamento Automático
                    </label>
                    <button onClick={() => copyToClipboard(embedScriptCode, 'script')}
                      className="text-xs text-[#FF6321] hover:text-[#FF6321]/90 flex items-center gap-1.5 cursor-pointer bg-[#FF6321]/5 border border-[#FF6321]/20 px-3.5 py-1.5 rounded-full hover:bg-[#FF6321]/15 transition-all font-serif italic font-semibold">
                      {copiedScript ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Script</>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 italic">Insira antes de <code className="text-[#1A1A1A] font-bold font-mono">&lt;/body&gt;</code> na sua landing page:</p>
                  <pre className="bg-[#1A1A1A] text-[#F5F2ED] rounded-xl p-4 text-[11px] font-mono overflow-x-auto border border-neutral-900 shadow-inner leading-relaxed select-all">{embedScriptCode}</pre>
                </div>
                <div className="space-y-2 pt-4 border-t border-[#E5E2DD]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-[#FF6321]" /> Disparar Lead via Código
                    </label>
                    <button onClick={() => copyToClipboard(manualApiCode, 'api')}
                      className="text-xs text-[#FF6321] hover:text-[#FF6321]/90 flex items-center gap-1.5 cursor-pointer bg-[#FF6321]/5 border border-[#FF6321]/20 px-3.5 py-1.5 rounded-full hover:bg-[#FF6321]/15 transition-all font-serif italic font-semibold">
                      {copiedAPI ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Código</>}
                    </button>
                  </div>
                  <pre className="bg-[#1A1A1A] text-[#F5F2ED] rounded-xl p-4 text-[10.5px] font-mono overflow-x-auto border border-neutral-900 shadow-inner leading-relaxed select-all">{manualApiCode}</pre>
                </div>
              </div>
            )}

            {scriptTab === 'getlead' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                  <strong>⚡ Modo Duplo:</strong> Este script envia os leads para o <strong>GetLead</strong> (sua plataforma de isca) <em>e</em> para o <strong>banco de dados local do LeadQuiz</strong> ao mesmo tempo. Substitua <code className="font-mono bg-amber-100 px-1 rounded">SEU-SLUG-AQUI</code> pelo slug da sua isca no GetLead.
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#FF6321]" /> Script Integrado GetLead + LeadQuiz
                  </label>
                  <button onClick={() => copyToClipboard(getLeadScriptCode, 'getlead')}
                    className="text-xs text-[#FF6321] hover:text-[#FF6321]/90 flex items-center gap-1.5 cursor-pointer bg-[#FF6321]/5 border border-[#FF6321]/20 px-3.5 py-1.5 rounded-full hover:bg-[#FF6321]/15 transition-all font-serif italic font-semibold">
                    {copiedGetLead ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Script</>}
                  </button>
                </div>
                <p className="text-xs text-gray-500 italic">Cole antes de <code className="text-[#1A1A1A] font-bold font-mono">&lt;/body&gt;</code>. O formulário deve ter <code className="font-mono bg-[#F5F2ED] px-1 rounded">id="quiz-form"</code> ou <code className="font-mono bg-[#F5F2ED] px-1 rounded">data-gl-quiz</code>:</p>
                <pre className="bg-[#1A1A1A] text-[#F5F2ED] rounded-xl p-4 text-[11px] font-mono overflow-x-auto border border-neutral-900 shadow-inner leading-relaxed select-all max-h-[400px]">{getLeadScriptCode}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
