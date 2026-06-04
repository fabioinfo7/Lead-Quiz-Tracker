import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { Campaign, Lead, DatabaseConfig, AnalyticsSummary } from './types';

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'fallback_db.json');

// Translate ISO date strings to stable MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) 
// to prevent "Incorrect datetime value" errors in MySQL strict modes.
function toMysqlDatetime(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
}

// Memory cache / Local storage structure
interface FallbackSchema {
  campaigns: Campaign[];
  leads: Lead[];
  analyticsEvents: {
    id: string;
    campaign_id: string;
    event_type: string; // 'visit' | 'cta_click' | 'scroll'
    scroll_percentage: number;
    session_id: string;
    created_at: string;
  }[];
}

let localDb: FallbackSchema = {
  campaigns: [],
  leads: [],
  analyticsEvents: []
};

// Seed some initial demo data if the file doesn't exist
function ensureLocalDbFile() {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      const initialCampaignId = 'campaign_demo_1';
      const initialDb: FallbackSchema = {
        campaigns: [
          {
            id: initialCampaignId,
            name: 'Isca Ebook Tráfego Pago 2026',
            product_name: 'Método Escala Digital',
            created_at: new Date().toISOString()
          },
          {
            id: 'campaign_demo_2',
            name: 'Webinar Validação de Ofertas',
            product_name: 'Mentoria High Ticket',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString()
          }
        ],
        leads: [
          {
            id: 'lead_1',
            campaign_id: initialCampaignId,
            name: 'Ana Silva',
            email: 'ana.silva@teste.com',
            age: 28,
            quiz_answers: [
              { question: 'Qual é o seu maior obstáculo hoje?', answer: 'Falta de orçamento para tráfego' },
              { question: 'Quanto você fatura mensalmente?', answer: 'Menos de R$ 5.000' },
              { question: 'Qual o seu nível de experiência?', answer: 'Iniciante absoluto' }
            ],
            created_at: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 'lead_2',
            campaign_id: initialCampaignId,
            name: 'Marcos Oliveira',
            email: 'marcos.oliveira@gmail.com',
            age: 35,
            quiz_answers: [
              { question: 'Qual é o seu maior obstáculo hoje?', answer: 'Criativos saturam muito rápido' },
              { question: 'Quanto você fatura mensalmente?', answer: 'R$ 10.000 a R$ 30.000' },
              { question: 'Qual o seu nível de experiência?', answer: 'Intermediário / Quero escalar' }
            ],
            created_at: new Date(Date.now() - 3600000 * 5).toISOString()
          }
        ],
        analyticsEvents: [
          // Simulated traffic for demo 1
          { id: 'ev_1', campaign_id: initialCampaignId, event_type: 'visit', scroll_percentage: 0, session_id: 'sess_1', created_at: new Date(Date.now() - 10000).toISOString() },
          { id: 'ev_2', campaign_id: initialCampaignId, event_type: 'scroll', scroll_percentage: 25, session_id: 'sess_1', created_at: new Date(Date.now() - 8000).toISOString() },
          { id: 'ev_3', campaign_id: initialCampaignId, event_type: 'scroll', scroll_percentage: 75, session_id: 'sess_1', created_at: new Date(Date.now() - 5000).toISOString() },
          { id: 'ev_4', campaign_id: initialCampaignId, event_type: 'cta_click', scroll_percentage: 75, session_id: 'sess_1', created_at: new Date(Date.now() - 4000).toISOString() },
          
          { id: 'ev_5', campaign_id: initialCampaignId, event_type: 'visit', scroll_percentage: 0, session_id: 'sess_2', created_at: new Date(Date.now() - 20000).toISOString() },
          { id: 'ev_6', campaign_id: initialCampaignId, event_type: 'scroll', scroll_percentage: 100, session_id: 'sess_2', created_at: new Date(Date.now() - 15000).toISOString() },
          
          { id: 'ev_7', campaign_id: initialCampaignId, event_type: 'visit', scroll_percentage: 0, session_id: 'sess_3', created_at: new Date(Date.now() - 30000).toISOString() },
          { id: 'ev_8', campaign_id: initialCampaignId, event_type: 'cta_click', scroll_percentage: 0, session_id: 'sess_3', created_at: new Date(Date.now() - 25000).toISOString() },
        ]
      };
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    }
    const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
    localDb = JSON.parse(data);
  } catch (err) {
    console.error('Error seeding fallback file:', err);
  }
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'db_config.json');

// Initial DB configuration reading from environment or provided by customer
let activeDbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '69.6.249.194',
  user: process.env.DB_USER || 'fabios99_landingpages',
  database: process.env.DB_NAME || 'fabios99_landingpages',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  password: process.env.DB_PASSWORD || 'AA21213AAaa****'
};

// Persistent Loader
function loadPersistentConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const saved = JSON.parse(data);
      activeDbConfig = {
        host: saved.host || activeDbConfig.host,
        user: saved.user || activeDbConfig.user,
        database: saved.database || activeDbConfig.database,
        port: parseInt(saved.port || String(activeDbConfig.port), 10),
        password: saved.password || activeDbConfig.password
      };
      console.log('[DB] Configurações de banco lidas com sucesso de db_config.json!');
    }
  } catch (err) {
    console.error('[DB] Erro ao carregar db_config.json persistente:', err);
  }
}

let pool: any = null;
let isUsingFallback = true;
let lastDbError = '';

export function getDbStatus() {
  return {
    isUsingFallback,
    error: lastDbError,
    host: activeDbConfig.host,
    user: activeDbConfig.user,
    database: activeDbConfig.database,
    port: activeDbConfig.port
  };
}

// Allow updating the active config in memory dynamically from UI
export function updateDbConfig(newConfig: DatabaseConfig & { password?: string }) {
  activeDbConfig = {
    ...activeDbConfig,
    ...newConfig
  };
  if (newConfig.password) {
    activeDbConfig.password = newConfig.password;
  }
  
  // Persist to file system
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(activeDbConfig, null, 2), 'utf8');
    console.log('[DB] Configuração de banco salva persistentemente no arquivo db_config.json.');
  } catch (err) {
    console.error('[DB] Erro ao gravar db_config.json:', err);
  }

  // Reset pool to force reconnection
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
  return initDb();
}

export async function initDb() {
  ensureLocalDbFile();
  loadPersistentConfig();
  isUsingFallback = true;
  lastDbError = '';

  // Validate password isn't censored with stars
  if (activeDbConfig.password?.includes('****')) {
    lastDbError = 'A senha fornecida parece estar censurada com asteriscos (****). Digite a senha correta na aba de configurações';
    console.log('[DB] Asteriscos de simulação detectados na senha. Fallback ativo...');
    return false;
  }

  // Helper function to try connection with a custom options object
  async function attemptConnection(useSsl: boolean) {
    const opts: any = {
      host: activeDbConfig.host,
      user: activeDbConfig.user,
      password: activeDbConfig.password,
      database: activeDbConfig.database,
      port: activeDbConfig.port,
      waitForConnections: true,
      connectionLimit: 4,
      queueLimit: 0,
      connectTimeout: 8000 // 8 seconds timeout (more lenient for remote server handshakes)
    };

    if (useSsl) {
      opts.ssl = { rejectUnauthorized: false }; // Standard TLS override for secure hosts like cPanel, AWS RDS, PlanetScale & Supabase
    }

    const testPool = mysql.createPool(opts);
    const conn = await testPool.getConnection();
    conn.release();
    return testPool;
  }

  try {
    console.log(`[DB] Tentando conectar com MySQL em ${activeDbConfig.host}:${activeDbConfig.port} (Tentativa 1: SSL Habilitado)...`);
    try {
      pool = await attemptConnection(true);
      console.log('[DB] Sucesso ao obter conexão MySQL (Modo Seguro SSL)!');
    } catch (sslErr: any) {
      console.log('[DB] Conexão SSL falhou. Tentando conectar sem SSL (Tentativa 2: Convencional)...');
      pool = await attemptConnection(false);
      console.log('[DB] Sucesso ao obter conexão MySQL (Modo Convencional sem SSL)!');
    }

    isUsingFallback = false;
    lastDbError = '';

    // Create campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create leads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        campaign_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL,
        age INT NOT NULL,
        quiz_answers TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create analytics_events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id VARCHAR(50) PRIMARY KEY,
        campaign_id VARCHAR(50) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        scroll_percentage DECIMAL(5,2) DEFAULT 0.00,
        session_id VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] Tabelas MySQL verificadas / criadas com sucesso!');
    return true;
  } catch (err: any) {
    const code = err?.code || '';
    const originalMsg = err?.message || '';
    
    // Detailed Intelligent Diagnosis for layoffs/laymen in Portuguese
    if (code === 'ETIMEDOUT' || code === 'ENOTFOUND' || originalMsg.includes('timeout') || originalMsg.includes('unreachable')) {
      lastDbError = `ERRO DE CONEXÃO (TIMEOUT): O servidor remoto em ${activeDbConfig.host} está inacessível. Isso ocorre porque o Firewall da sua hospedagem (ex: cPanel, Hostgator, Hostinger, Locaweb, AWS) bloqueia conexões externas por padrão. Para consertar: Acesse o painel da sua hospedagem, localize as configurações de "MySQL Remoto" (Remote MySQL) e adicione o caractere "%" (porcentagem como curinga) para liberar o tráfego geral, ou adicione o IP deste servidor aos permitidos.`;
    } else if (code === 'ECONNREFUSED') {
      lastDbError = `CONEXÃO RECUSADA (ECONNREFUSED): O servidor em ${activeDbConfig.host} rejeitou a conexão na porta ${activeDbConfig.port}. Certifique-se de que a porta ${activeDbConfig.port} é a correta no seu painel ou que o MySQL esteja aceitando conexões vindas de endereços IP públicos (bind-address = 0.0.0.0).`;
    } else if (code === 'ER_ACCESS_DENIED_ERROR' || code === '1045') {
      lastDbError = `ACESSO NEGADO (USUÁRIO/SENHA): O usuário "${activeDbConfig.user}" ou a senha informada estão incorretos para o servidor MySQL. Verifique se digitou os dados sem espaços, se o usuário existe no servidor remoto e se ele tem privilégios totais de leitura/escrita.`;
    } else if (code === 'ER_DBACCESS_DENIED_ERROR' || code === '1044') {
      lastDbError = `ACESSO NEGADO AO SCHEMA: O usuário "${activeDbConfig.user}" não tem privilégio de acesso ao schema de banco de dados "${activeDbConfig.database}". Certifique-se de que de fato criou o banco de dados "${activeDbConfig.database}" na sua hospedagem e vinculou o usuário a ele habilitando "Todos os privilégios".`;
    } else if (code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
      lastDbError = `MÉTODO DE AUTENTICAÇÃO NÃO SUPORTADO: Seu servidor MySQL possui diretivas de segurança incompatíveis com a criptografia padrão do Node. Para corrigir, mude o plugin de autenticação do usuário para "mysql_native_password" usando o comando SQL correspondente no phpMyAdmin ou painel.`;
    } else {
      lastDbError = `ERRO INTEGRADO (${code || 'CONEXÃO'}): ${originalMsg}. Verifique os dados inseridos ou as chaves de firewall do servidor MySQL.`;
    }

    isUsingFallback = true;
    console.error('[DB] Erro de conexão com MySQL. Continuando em fallback local. Detalhes:', lastDbError);
    return false;
  }
}

// Helpers to save database to disk (when in local fallback mode)
function saveFallbackDb() {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local fallback db to disk:', err);
  }
}

/* Campaigns Methods */
export async function getCampaigns(): Promise<Campaign[]> {
  if (!isUsingFallback && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
      return rows as Campaign[];
    } catch (err) {
      console.error('MySQL Error getting campaigns:', err);
      throw err;
    }
  }
  // Fallback
  return [...localDb.campaigns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createCampaign(campaign: Campaign): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      const formattedDate = toMysqlDatetime(campaign.created_at);
      await pool.query(
        'INSERT INTO campaigns (id, name, product_name, created_at) VALUES (?, ?, ?, ?)',
        [campaign.id, campaign.name, campaign.product_name, formattedDate]
      );
      return;
    } catch (err) {
      console.error('MySQL Error creating campaign:', err);
      throw err;
    }
  }
  // Fallback
  localDb.campaigns.push(campaign);
  saveFallbackDb();
}

/* Leads Methods */
export async function getLeads(): Promise<Lead[]> {
  if (!isUsingFallback && pool) {
    try {
      const [rows] = await pool.query(`
        SELECT l.*, c.name as campaign_name, c.product_name 
        FROM leads l
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        ORDER BY l.created_at DESC
      `);
      return (rows as any[]).map(row => ({
        ...row,
        quiz_answers: typeof row.quiz_answers === 'string' ? JSON.parse(row.quiz_answers) : row.quiz_answers
      })) as Lead[];
    } catch (err) {
      console.error('MySQL Error getting leads:', err);
      throw err;
    }
  }
  
  // Fallback
  return localDb.leads.map(lead => {
    const campaign = localDb.campaigns.find(c => c.id === lead.campaign_id);
    return {
      ...lead,
      campaign_name: campaign?.name || 'Desconhecido',
      product_name: campaign?.product_name || 'Desconhecido'
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createLead(lead: Lead): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      const formattedDate = toMysqlDatetime(lead.created_at);
      await pool.query(
        'INSERT INTO leads (id, campaign_id, name, email, age, quiz_answers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          lead.id,
          lead.campaign_id,
          lead.name,
          lead.email,
          lead.age,
          JSON.stringify(lead.quiz_answers),
          formattedDate
        ]
      );
      return;
    } catch (err) {
      console.error('MySQL Error creating lead:', err);
      throw err;
    }
  }
  // Fallback
  localDb.leads.push(lead);
  saveFallbackDb();
}

/* Analytics methods */
export async function trackEvent(event: {
  id: string;
  campaign_id: string;
  event_type: string;
  scroll_percentage: number;
  session_id: string;
  created_at: string;
}): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      const formattedDate = toMysqlDatetime(event.created_at);
      await pool.query(
        'INSERT INTO analytics_events (id, campaign_id, event_type, scroll_percentage, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          event.id,
          event.campaign_id,
          event.event_type,
          event.scroll_percentage,
          event.session_id,
          formattedDate
        ]
      );
      return;
    } catch (err) {
      console.error('MySQL Error tracking event:', err);
      throw err;
    }
  }
  // Fallback
  localDb.analyticsEvents.push(event);
  saveFallbackDb();
}

export async function getAnalytics(): Promise<AnalyticsSummary[]> {
  const campaignsList = await getCampaigns();
  
  if (!isUsingFallback && pool) {
    try {
      const summaries: AnalyticsSummary[] = [];
      for (const camp of campaignsList) {
        // visits count = distinct session_ids with event_type = 'visit'
        const [[{ visits }]] = await pool.query(
          'SELECT COUNT(DISTINCT session_id) as visits FROM analytics_events WHERE campaign_id = ? AND event_type = ?',
          [camp.id, 'visit']
        ) as any;

        // CTA clicks = distinct count of sessions with 'cta_click' (or total events of type 'cta_click')
        const [[{ ctaClicks }]] = await pool.query(
          'SELECT COUNT(*) as ctaClicks FROM analytics_events WHERE campaign_id = ? AND event_type = ?',
          [camp.id, 'cta_click']
        ) as any;

        // Conversions = count of leads
        const [[{ submissions }]] = await pool.query(
          'SELECT COUNT(*) as submissions FROM leads WHERE campaign_id = ?',
          [camp.id]
        ) as any;

        // Avg Scroll = max scroll reached per session, averaged
        // In MySQL, let's select MAX(scroll_percentage) grouped by session, and get the AVERAGE of that
        const [[{ avgScroll }]] = await pool.query(`
          SELECT IFNULL(AVG(max_scroll), 0) as avgScroll FROM (
            SELECT MAX(scroll_percentage) as max_scroll 
            FROM analytics_events 
            WHERE campaign_id = ? AND event_type = 'scroll'
            GROUP BY session_id
          ) AS session_scrolls
        `, [camp.id]) as any;

        const rate = visits > 0 ? Math.round((submissions / visits) * 100) : 0;

        summaries.push({
          campaignId: camp.id,
          campaignName: camp.name,
          productName: camp.product_name,
          visits: visits || 0,
          ctaClicks: ctaClicks || 0,
          conversionRate: rate,
          avgScroll: Math.round(parseFloat(avgScroll || 0)),
          submissions: submissions || 0
        });
      }
      return summaries;
    } catch (err) {
      console.error('MySQL Error getting analytics:', err);
      throw err;
    }
  }

  // Fallback calculations on localDb
  return campaignsList.map(camp => {
    // Unique session IDs that visited this campaign
    const campaignEvents = localDb.analyticsEvents.filter(e => e.campaign_id === camp.id);
    
    const visitSessions = new Set(
      campaignEvents.filter(e => e.event_type === 'visit').map(e => e.session_id)
    );
    const visits = visitSessions.size;

    const ctaClicks = campaignEvents.filter(e => e.event_type === 'cta_click').length;
    const submissions = localDb.leads.filter(l => l.campaign_id === camp.id).length;

    // Track sessions and their peak scroll percent
    const scrollEventsMap: Record<string, number> = {};
    campaignEvents.filter(e => e.event_type === 'scroll').forEach(e => {
      scrollEventsMap[e.session_id] = Math.max(scrollEventsMap[e.session_id] || 0, e.scroll_percentage);
    });

    const scrollValues = Object.values(scrollEventsMap);
    const avgScroll = scrollValues.length > 0
      ? Math.round(scrollValues.reduce((a, b) => a + b, 0) / scrollValues.length)
      : 0;

    const conversionRate = visits > 0 ? Math.round((submissions / visits) * 100) : 0;

    return {
      campaignId: camp.id,
      campaignName: camp.name,
      productName: camp.product_name,
      visits,
      ctaClicks,
      conversionRate,
      avgScroll,
      submissions
    };
  });
}
