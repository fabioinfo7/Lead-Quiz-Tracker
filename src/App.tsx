import React, { useState, useEffect } from 'react';
import { Campaign, Lead, AnalyticsSummary, DatabaseConfig } from './types';
import { CampaignDetails } from './components/CampaignDetails';
import { LeadDetails } from './components/LeadDetails';
import { CopyCreator } from './components/CopyCreator';
import { LandingPageSimulator } from './components/LandingPageSimulator';
import { DbSettingsModal } from './components/DbSettingsModal';
import { Dashboard } from './components/Dashboard';
import { DbSettingsTab } from './components/DbSettingsTab';
import { 
  Database, 
  Settings, 
  Layers, 
  Users, 
  Sparkles, 
  Smartphone,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  BarChart3
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'leads' | 'copy' | 'simulator' | 'settings'>('dashboard');
  
  // Data State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary[]>([]);
  const [dbStatus, setDbStatus] = useState({
    isUsingFallback: true,
    error: '',
    host: '69.6.249.194',
    user: 'fabios99_landingpages',
    database: 'fabios99_landingpages',
    port: 3306
  });

  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appUrl, setAppUrl] = useState('');

  const fetchAllData = async () => {
    try {
      const campRes = await fetch('/api/campaigns');
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData);
      }

      const leadRes = await fetch('/api/leads');
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLeads(leadData);
      }

      const analRes = await fetch('/api/analytics');
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalytics(analData);
      }

      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDbStatus(statusData);
      }
    } catch (err) {
      console.error('Error fetching data from server API:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Auto-detect browser origin for the script URL builder
    const origin = window.location.origin;
    setAppUrl(origin);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleCreateCampaign = async (name: string, product: string) => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, product_name: product })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao salvar no banco de dados remoto.');
      }
      await fetchAllData();
    } catch (err: any) {
      console.error('Erro ao cadastrar campanha:', err);
      throw err;
    }
  };

  const handleSaveDbSettings = async (config: DatabaseConfig & { password?: string }) => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.status) {
        setDbStatus(data.status);
      }
      await fetchAllData();
      return data.success;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans antialiased pb-20 selection:bg-[#FF6321] selection:text-white">
      {/* Dynamic Fonts Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #F5F2ED;
          color: #1A1A1A;
        }
        .font-serif {
          font-family: 'Lora', serif;
        }
      `}</style>
      
      {/* Upper Navigation/Header Bar */}
      <header className="bg-[#1A1A1A] text-[#F5F2ED] border-b border-[#1A1A1A] sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#FF6321] rounded-xl shadow-lg shadow-[#FF6321]/20 text-[#F5F2ED] font-black tracking-tighter">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif italic text-xl text-white tracking-tight flex items-center gap-1.5 leading-none">
                Lead<span className="text-[#FF6321]">Quiz</span> Tracker
                <span className="text-[10px] bg-white/10 border border-white/20 text-[#F5F2ED]/80 font-mono px-1.5 py-0.5 rounded font-normal not-italic">v1.1</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-medium mt-1">Gerenciador de Landing Pages, Quizzes e Copywriting de Leads</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Database status pill */}
            <button
              onClick={() => setDbModalOpen(true)}
              className={`text-[10px] font-mono font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all ${
                dbStatus.isUsingFallback
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              {dbStatus.isUsingFallback ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                  Banco Contingência (Local ativo)
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  MySQL Conectado ({dbStatus.host})
                </>
              )}
              <Settings className="w-3 h-3 text-gray-400 ml-1.5" />
            </button>

            {/* Refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 text-gray-350 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-colors cursor-pointer"
              title="Recarregar Dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FF6321]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 space-y-6">
        
        {/* Navigation Tabs bar */}
        <div className="flex flex-wrap gap-2.5 border-b border-neutral-300/60 pb-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#1A1A1A] text-white shadow-md font-serif italic'
                : 'bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] border border-neutral-300/60 shadow-sm hover:bg-white/80'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#FF6321]" />
            📈 Painel Geral
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-[#1A1A1A] text-white shadow-md font-serif italic'
                : 'bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] border border-neutral-300/60 shadow-sm hover:bg-white/80'
            }`}
          >
            <Layers className="w-4 h-4 text-[#FF6321]" />
            🎯 Campanhas & Pixel
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-[#1A1A1A] text-white shadow-md font-serif italic'
                : 'bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] border border-neutral-300/60 shadow-sm hover:bg-white/80'
            }`}
          >
            <Users className="w-4 h-4 text-[#FF6321]" />
            👥 Leads ({leads.length})
          </button>

          <button
            onClick={() => setActiveTab('copy')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'copy'
                ? 'bg-[#1A1A1A] text-white shadow-md font-serif italic'
                : 'bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] border border-neutral-300/60 shadow-sm hover:bg-white/80'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#FF6321]" />
            💡 Copy Creator AI
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#1A1A1A] text-white shadow-md font-serif italic'
                : 'bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] border border-neutral-300/60 shadow-sm hover:bg-white/80'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#FF6321]" />
            💻 Simulador LP
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ml-auto ${
              activeTab === 'settings'
                ? 'bg-[#1A1A1A] text-white shadow-md font-serif italic'
                : 'bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] border border-neutral-300/60 shadow-sm hover:bg-white/80'
            }`}
          >
            <Database className="w-4 h-4 text-[#FF6321]" />
            ⚙️ Configurar MySQL
          </button>
        </div>

        {/* Tab view handlers */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'dashboard' && (
            <Dashboard
              campaigns={campaigns}
              leads={leads}
              analytics={analytics}
              dbStatus={dbStatus}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignDetails
              campaigns={campaigns}
              analytics={analytics}
              onCreateCampaign={handleCreateCampaign}
              appUrl={appUrl}
            />
          )}

          {activeTab === 'leads' && (
            <LeadDetails 
              leads={leads} 
            />
          )}

          {activeTab === 'copy' && (
            <CopyCreator
              campaigns={campaigns}
              leads={leads}
            />
          )}

          {activeTab === 'simulator' && (
            <LandingPageSimulator
              campaigns={campaigns}
              onNewSubmission={fetchAllData}
            />
          )}

          {activeTab === 'settings' && (
            <DbSettingsTab
              currentStatus={dbStatus}
              onSave={handleSaveDbSettings}
            />
          )}
        </div>
      </main>

      {/* Database settings modal toggle */}
      {dbModalOpen && (
        <DbSettingsModal
          currentStatus={dbStatus}
          onSave={handleSaveDbSettings}
          onClose={() => setDbModalOpen(false)}
        />
      )}
    </div>
  );
}
