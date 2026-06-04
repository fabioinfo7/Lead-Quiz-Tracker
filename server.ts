import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { 
  initDb, 
  getDbStatus, 
  updateDbConfig, 
  getCampaigns, 
  createCampaign, 
  getLeads, 
  createLead, 
  trackEvent, 
  getAnalytics 
} from './src/server-db';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/api/status', (req, res) => {
  const status = getDbStatus();
  res.json(status);
});

app.post('/api/config', async (req, res) => {
  const { host, user, database, port, password } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ error: 'Campos host, user e database são obrigatórios.' });
  }
  const success = await updateDbConfig({
    host,
    user,
    database,
    port: parseInt(port, 10) || 3306,
    password
  });
  const status = getDbStatus();
  res.json({ success, status });
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await getCampaigns();
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const { name, product_name } = req.body;
  if (!name || !product_name) {
    return res.status(400).json({ error: 'Nome da campanha e nome do produto são obrigatórios.' });
  }
  const id = 'camp_' + Math.random().toString(36).substring(2, 9);
  const newCampaign = {
    id,
    name,
    product_name,
    created_at: new Date().toISOString()
  };
  try {
    await createCampaign(newCampaign);
    res.json(newCampaign);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getLeads();
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FIX: Endpoint de leads agora valida campaign_id contra campanhas existentes
app.post('/api/leads', async (req, res) => {
  const { campaign_id, name, email, age, quiz_answers, session_id } = req.body;
  if (!campaign_id || !email) {
    return res.status(400).json({ error: 'campaign_id e email são obrigatórios.' });
  }

  // FIX: Verifica se a campanha existe antes de gravar o lead
  try {
    const campaigns = await getCampaigns();
    const campaignExists = campaigns.some(c => c.id === campaign_id);
    if (!campaignExists) {
      return res.status(404).json({ 
        error: `Campanha "${campaign_id}" não encontrada. Crie a campanha no painel antes de receber leads, e use o campaign_id gerado no pixel da landing page.` 
      });
    }
  } catch (err: any) {
    // Se não conseguir checar, continua mesmo assim (evita bloquear o lead)
    console.warn('[Leads] Não foi possível validar campaign_id:', err.message);
  }

  const leadId = 'lead_' + Math.random().toString(36).substring(2, 11);
  const newLead = {
    id: leadId,
    campaign_id,
    name: name ? String(name).trim() : 'Anônimo',
    email: String(email).trim(),
    age: parseInt(age, 10) || 0,
    quiz_answers: Array.isArray(quiz_answers) ? quiz_answers : [],
    created_at: new Date().toISOString()
  };

  try {
    await createLead(newLead);

    if (session_id) {
      await trackEvent({
        id: 'ev_' + Math.random().toString(36).substring(2, 11),
        campaign_id,
        event_type: 'submit',
        scroll_percentage: 100,
        session_id,
        created_at: new Date().toISOString()
      });
    }

    res.json({ success: true, lead: newLead });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/track', async (req, res) => {
  const { campaign_id, event_type, scroll_percentage, session_id } = req.body;
  if (!campaign_id || !event_type || !session_id) {
    return res.status(400).json({ error: 'campaign_id, event_type e session_id são obrigatórios.' });
  }

  const event = {
    id: 'ev_' + Math.random().toString(36).substring(2, 11),
    campaign_id,
    event_type,
    scroll_percentage: parseFloat(scroll_percentage) || 0,
    session_id,
    created_at: new Date().toISOString()
  };

  try {
    await trackEvent(event);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const summary = await getAnalytics();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/:id/analyze', async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaigns = await getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const allLeads = await getLeads();
    const campaignLeads = allLeads.filter(l => l.campaign_id === campaignId);

    if (campaignLeads.length === 0) {
      return res.json({
        canAnalyze: false,
        message: 'Nenhum lead cadastrado nesta campanha para analisar ainda.'
      });
    }

    let quizCompilationText = '';
    campaignLeads.forEach((lead, index) => {
      quizCompilationText += `Lead #${index + 1} (${lead.name}, ${lead.age} anos):\n`;
      lead.quiz_answers.forEach((qa: any) => {
        quizCompilationText += `- Pergunta: ${qa.question}\n  Resposta: ${qa.answer}\n`;
      });
      quizCompilationText += `\n`;
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const prompt = `
Campanha: ${campaign.name}
Isca Digital/Produto Associado: ${campaign.product_name}
Total de Leads Analisados: ${campaignLeads.length} leads

Aqui estão as perguntas e as respostas reais coletadas via quiz:
${quizCompilationText}

Por favor, faça uma análise profunda das respostas deste quiz e atue como um Copywriter de Elite de Alta Conversão, Especialista em Lançamento de Infoprodutos e Estrategista de Vendas Digitais de Alto Nível de Performance.

Gere um mapeamento ultra-estruturado, inteligente e perspicaz em português contendo os seguintes módulos exatamente:

## 1. Mapeamento Psicológico e Validação das Dores Latentes
- Quais são as **Top 3 dores e maiores barreiras operacionais ou emocionais** reais que as pessoas entrevistadas estão sofrendo?
- Como essas dores afetam o dia a dia delas? (Agite a dor de forma profunda e realista).

## 2. Ideias de Infoprodutos Estratégicos para Curar as Dores Mapeadas

### A. Produtos Categoria Black (Carga Forte / Promessa Provocativa e Alta Transformação)
- Desenvolva **2 ideias de infoprodutos do tipo "Black"**.
- Para cada um, defina: **Nome Sugerido**, **Formato**, **A Grande Promessa (Big Idea)** e o **Mecanismo de Desejo Agitado**.

### B. Produtos Categoria Simples / White (Conformidade Total / Entrada Facilitada e Segura)
- Desenvolva **2 ideias de infoprodutos do tipo "White/Simples"**.
- Para cada um, defina: **Nome Sugerido**, **Formato**, **A Promessa Prática** e **Vantagem de Entrada**.

## 3. Copies Poderosas de Vendas (Neuromarketing de Extrema Persuasão)

### ⚡ LP Copy: Carta de Vendas Curta e Persuasiva (Framework AIDA / Agitação de Dor)
- Escreva uma estrutura completa de venda.

### ⚡ Sequência de E-mail de Vendas no Estilo "Injeção de Caixa de 48 Horas"
- Escreva **2 e-mails de vendas** de tiro rápido.

## 4. Modelos de Anúncios de Alta Conversão para Meta Ads
Crie **5 modelos fortes de anúncios de alta conversão completos**.

## 5. Trio de Headlines de Elite para Teste A/B/C
- 3 Headlines magnéticas.

Formate toda a resposta em Markdown limpo e direto.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    res.json({ canAnalyze: true, analysis: response.text });

  } catch (err: any) {
    console.error('[AI] Erro:', err);
    res.status(500).json({ error: 'Erro ao gerar análise: ' + err.message });
  }
});

// FIX: Serve tanto /tracker.js quanto /pixel.js (ambos funcionam)
app.get(['/tracker.js', '/pixel.js'], (req, res) => {
  const cid = req.query.cid || '';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const appUrl = process.env.APP_URL || `${protocol}://${req.get('host')}`;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`/**
 * Lead Quiz Tracking script v1.2.0 — CORRIGIDO
 */
(function() {
  var campaignId = "${cid}";
  var serverUrl = "${appUrl}";
  
  if (!campaignId) {
    console.error("[Tracker] Erro: Campaign ID (cid) ausente no script. Passe ?cid=SEU_CAMPAIGN_ID");
    return;
  }
  
  var sessionId = localStorage.getItem('lead_tracker_sess_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('lead_tracker_sess_id', sessionId);
  }
  
  function sendTrackEvent(type, payload) {
    fetch(serverUrl + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        event_type: type,
        session_id: sessionId,
        scroll_percentage: payload && payload.scroll_percentage ? payload.scroll_percentage : 0
      })
    }).catch(function(e) {
      console.warn('[Tracker] Falha no evento de tracking:', e);
    });
  }
  
  sendTrackEvent('visit');
  
  var scrollBenchmarks = [25, 50, 75, 100];
  var hitBenchmarks = {};
  
  window.addEventListener('scroll', function() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) return;
    var currentPct = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
    scrollBenchmarks.forEach(function(mark) {
      if (currentPct >= mark && !hitBenchmarks[mark]) {
        hitBenchmarks[mark] = true;
        sendTrackEvent('scroll', { scroll_percentage: mark });
      }
    });
  });
  
  document.addEventListener('click', function(e) {
    var element = e.target;
    if (!element) return;
    var isCta = element.closest('[data-tracker-cta]') || 
                element.closest('#cta-button') || 
                element.closest('.cta-button') || 
                element.closest('a[href*="#quiz"]') || 
                element.tagName === 'BUTTON';
    if (isCta) {
      sendTrackEvent('cta_click');
    }
  });
  
  var previousLeadTracker = window.LeadTracker;
  window.LeadTracker = {
    trackCta: function() {
      sendTrackEvent('cta_click');
    },
    // FIX: submitLead agora inclui campaign_id automaticamente a partir do cid do pixel
    submitLead: function(leadData) {
      return fetch(serverUrl + '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: leadData.name,
          email: leadData.email,
          age: parseInt(leadData.age, 10) || 0,
          quiz_answers: leadData.quiz_answers || leadData.quizAnswers || [],
          session_id: sessionId
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.error) {
          console.error('[Tracker] Erro ao salvar lead:', res.error);
        } else {
          sendTrackEvent('submit');
          console.log('[Tracker] Lead salvo com sucesso!', res);
        }
        return res;
      })
      .catch(function(err) {
        console.error('[Tracker] Falha de rede ao salvar lead:', err);
        throw err;
      });
    }
  };

  // Processa fila de eventos emitidos antes do pixel carregar
  if (previousLeadTracker && previousLeadTracker._q) {
    previousLeadTracker._q.forEach(function(item) {
      if (item.data) {
        window.LeadTracker.submitLead(item.data)
          .then(item.resolve)
          .catch(item.reject);
      } else if (item.type === 'cta') {
        window.LeadTracker.trackCta();
      }
    });
  }
  
  console.log("[Tracker v1.2] Inicializado para campanha: " + campaignId + " | Server: " + serverUrl);
})();`);
});

async function startServer() {
  const success = await initDb();
  console.log(`[DB] Inicialização concluída. MySQL: ${success ? 'CONECTADO' : 'FALLBACK LOCAL ATIVO'}`);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
