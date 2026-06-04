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

// Set up CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Primary Endpoint: Database Status
app.get('/api/status', (req, res) => {
  const status = getDbStatus();
  res.json(status);
});

// Update Database Settings dynamically from UI
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

// Campaigns - Get all
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await getCampaigns();
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns - Create new
app.post('/api/campaigns', async (req, res) => {
  const { name, product_name } = req.body;
  if (!name || !product_name) {
    return res.status(400).json({ error: 'Nome da campanha e nome da isca digital / produto são obrigatórios.' });
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

// Leads - Get all
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getLeads();
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Leads - Submit lead (Quiz Form and User Info)
app.post('/api/leads', async (req, res) => {
  const { campaign_id, name, email, age, quiz_answers, session_id } = req.body;
  if (!campaign_id || !email) {
    return res.status(400).json({ error: 'campaign_id e email são obrigatórios.' });
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
    
    // Track submission event
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

// Analytics - Track Event
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

// Analytics - Get Overall Summary
app.get('/api/analytics', async (req, res) => {
  try {
    const summary = await getAnalytics();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gemini Analysis of Quiz Answers
app.post('/api/campaigns/:id/analyze', async (req, res) => {
  const campaignId = req.params.id;
  try {
    // 1. Get all campaigns to find the campaign name and product
    const campaigns = await getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    // 2. Fetch all leads
    const allLeads = await getLeads();
    const campaignLeads = allLeads.filter(l => l.campaign_id === campaignId);

    if (campaignLeads.length === 0) {
      return res.json({
        canAnalyze: false,
        message: 'Nenhum lead cadastrado nesta campanha para analisar ainda. Quando houver leads com respostas, a IA gerará insights profundos!'
      });
    }

    // 3. Compile all quiz questions and answers
    let quizCompilationText = '';
    campaignLeads.forEach((lead, index) => {
      quizCompilationText += `Lead #${index + 1} (${lead.name}, ${lead.age} anos):\n`;
      lead.quiz_answers.forEach((qa: any) => {
        quizCompilationText += `- Pergunta: ${qa.question}\n  Resposta: ${qa.answer}\n`;
      });
      quizCompilationText += `\n`;
    });

    // 4. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada nas variáveis de ambiente do servidor.' });
    }

    console.log('[AI] Solicitando análise no modelo gemini-3.5-flash com compiler answers...');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
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
Apresente ideias altamente lucrativas de infoprodutos criados especificamente para suprir as dores coletadas nas respostas:

### A. Produtos Categoria Black (Carga Forte / Promessa Provocativa e Alta Transformação)
- Desenvolva **2 ideias de infoprodutos do tipo "Black"** (com copys de altíssimo apelo, ganchos de curiosidade irresistíveis, alta percepção de valor, promessas fortes de grande impacto financeiro, de tempo ou status para cura imediata da dor).
- Para cada um, defina: **Nome Sugerido**, **Formato** (Ex: VSL + Kit Secreto, Desafio Gravado, Funil de 3 Dias), **A Grande Promessa (Big Idea)** e o **Mecanismo de Desejo Agitado**.

### B. Produtos Categoria Simples / White (Conformidade Total / Entrada Facilitada e Segura)
- Desenvolva **2 ideias de infoprodutos do tipo "White/Simples"** (produtos fáceis de anunciar em qualquer plataforma sem risco de bloqueio, focados em soluções passo a passo, templates práticos de simples execução, ferramentas ou guias instrucionais simples).
- Para cada um, defina: **Nome Sugerido**, **Formato** (Ex: Checklist, Coleção de Modelos, Minicurso em Clipes), **A Promessa Prática** e **Vantagem de Entrada**.

## 3. Copies Poderosas de Vendas (Neuromarketing de Extrema Persuasão)
Crie copies que literalmente convertem leitores em compradores agitando as dores informadas:

### ⚡ LP Copy: Carta de Vendas Curta e Persuasiva (Framework AIDA / Agitação de Dor)
- Escreva uma estrutura completa de venda (Headline, Gancho, Agitação da Dor Real que os leads citaram no quiz, Introdução da Solução via ${campaign.product_name} ou produto sugerido, Quebra de Objeções Técnica e Chamada para Ação irresistível).

### ⚡ Sequência de E-mail de Vendas no Estilo "Injeção de Caixa de 48 Horas"
- Escreva **2 e-mails de vendas** de tiro rápido, focados puramente na dor mencionada nas respostas, usando ganchos de urgência e quebra de padrão.

## 4. Modelos de Anúncios de Alta Conversão para Meta Ads (Facebook / Instagram Ads)
Crie **5 modelos fortes de anúncios de alta conversão completos** estruturados com diferentes técnicas consagradas de storytelling, gatilhos mentais e formatos de atração (ex: Quebra de Padrão, Dor x Prazer, Curiosidade Infinita, História de Superação de Obstáculo Operacional, Autoridade Expressa).

Para cada um dos 5 modelos, descreva de forma didática e estruturada:
- **Modelo de Atração e Persuasão**: (Ex: Modelo #1 - Gancho de Curiosidade Máximo, Modelo #2 - Quebra de Padrão Irracional, Modelo #3 - Dor x Prazer, etc.)
- **Técnica / Gatilho Mental Focado**: (Ex: Urgência e Prova de Conceito)
- **Headline Forte (Título do Criativo na Imagem/Vídeo)**: (Texto curto e impactante)
- **Texto Principal (Copy do Corpo do Anúncio / Primary Text)**: (Uma copy persuasiva, agitando a dor real extraída do quiz, agredindo a inércia e chamando para a solução com maestria)
- **Título do Link (Headline do Botão)**: (Texto de até 40 caracteres chamando para clique)
- **Descrição**: (Texto explicativo discreto que fica abaixo do título do link)
- **Chamada para Ação (CTA indicado)**: (Ex: "Saiba mais", "Cadastrar-se", "Baixar")

## 5. Trio de Headlines de Elite para Teste A/B/C
- 3 Headlines magnéticas e com alto apelo de clique/leitura focadas em agitar as respostas mais emblemáticas encontradas nas pesquisas.

Trabalhe com o mais refinado vocabulário de copywriting de alta conversão. Formate toda a resposta de forma limpa, direta, visualmente deslumbrante em Markdown, ideal para o usuário ler, copiar e aplicar no seu negócio imediatamente.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({
      canAnalyze: true,
      analysis: response.text
    });

  } catch (err: any) {
    console.error('[AI] Erro no Gemini:', err);
    res.status(500).json({ error: 'Erro ao gerar análise da IA: ' + err.message });
  }
});

// Dynamic Client Tracker Script Renderer (supporting /tracker.js and /pixel.js to bypass adblockers)
app.get(['/tracker.js', '/pixel.js'], (req, res) => {
  const cid = req.query.cid || '';
  // Resolve host dynamically or fallback (using x-forwarded-proto from SSL proxies)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const appUrl = process.env.APP_URL || `${protocol}://${req.get('host')}`;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`/**
 * Lead Quiz Tracking script v1.1.0
 * Gerado em conformidade com o sistema de Landing Page Analytics.
 */
(function() {
  var campaignId = "${cid}";
  var serverUrl = "${appUrl}";
  
  if (!campaignId) {
    console.error("[Tracker] Erro: Campaign ID (cid) ausente no script.");
    return;
  }
  
  // Create / Fetch Unique Visitor Session
  var sessionId = localStorage.getItem('lead_tracker_sess_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('lead_tracker_sess_id', sessionId);
  }
  
  function sendTrackEvent(type, payload) {
    var body = {
      campaign_id: campaignId,
      event_type: type,
      session_id: sessionId,
      scroll_percentage: payload && payload.scroll_percentage ? payload.scroll_percentage : 0
    };
    
    // Use standard Fetch API post with no-cors or standard headers
    fetch(serverUrl + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(function(e) {
      console.warn('[Tracker] Failed tracking event:', e);
    });
  }
  
  // Track direct page load / visit event
  sendTrackEvent('visit');
  
  // Track scroll depth at 25%, 50%, 75%, 100%
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
  
  // Listen for generic button click triggers for CTA clicks
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
  
  // Attach safe LeadTracker utility global to allow manually dispatching leads
  var previousLeadTracker = window.LeadTracker;
  window.LeadTracker = {
    trackCta: function() {
      sendTrackEvent('cta_click');
    },
    submitLead: function(leadData) {
      var name = leadData.name;
      var email = leadData.email;
      var age = leadData.age;
      var answers = leadData.quiz_answers || leadData.quizAnswers || [];
      
      return fetch(serverUrl + '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: name,
          email: email,
          age: parseInt(age, 10) || 0,
          quiz_answers: answers,
          session_id: sessionId
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        sendTrackEvent('submit');
        return res;
      });
    }
  };

  // Process queued events if LeadTracker was initialized early
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
  
  console.log("[Tracker] Inicializado com sucesso para campanha: " + campaignId);
})();`);
});

// Configure Vite dynamic middleware or fallback to build folder
async function startServer() {
  const success = await initDb();
  console.log(`[DB] Database initialization completed. MySQL connected: ${!success ? 'FALLBACK LOCAL ACTIVE' : 'YES'}`);

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
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
