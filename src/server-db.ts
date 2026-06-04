import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { Campaign, Lead, DatabaseConfig, AnalyticsSummary } from './types';

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'fallback_db.json');

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

interface FallbackSchema {
  campaigns: Campaign[];
  leads: Lead[];
  analyticsEvents: {
    id: string;
    campaign_id: string;
    event_type: string;
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

function ensureLocalDbFile() {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      const initialDb: FallbackSchema = {
        campaigns: [],
        leads: [],
        analyticsEvents: []
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

// FIX: Senha NÃO vem mais hardcoded com asteriscos — lê exclusivamente do .env
let activeDbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '',
  user: process.env.DB_USER || '',
  database: process.env.DB_NAME || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  password: process.env.DB_PASSWORD || ''
};

function loadPersistentConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const saved = JSON.parse(data);
      // Sobrescreve apenas campos presentes, mantém env vars como fallback
      activeDbConfig = {
        host: saved.host || activeDbConfig.host,
        user: saved.user || activeDbConfig.user,
        database: saved.database || activeDbConfig.database,
        port: parseInt(saved.port || String(activeDbConfig.port), 10),
        // FIX: Nunca carrega senha do arquivo de config se contiver ****
        password: (saved.password && !saved.password.includes('****'))
          ? saved.password
          : activeDbConfig.password
      };
      console.log('[DB] Configurações carregadas de db_config.json!');
    }
  } catch (err) {
    console.error('[DB] Erro ao carregar db_config.json:', err);
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

export async function updateDbConfig(newConfig: DatabaseConfig & { password?: string }) {
  activeDbConfig = { ...activeDbConfig, ...newConfig };
  if (newConfig.password) {
    activeDbConfig.password = newConfig.password;
  }

  // FIX: Salva a senha no arquivo apenas se ela não tiver asteriscos
  const configToSave: any = {
    host: activeDbConfig.host,
    user: activeDbConfig.user,
    database: activeDbConfig.database,
    port: activeDbConfig.port
  };
  if (activeDbConfig.password && !activeDbConfig.password.includes('****')) {
    configToSave.password = activeDbConfig.password;
  }

  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configToSave, null, 2), 'utf8');
    console.log('[DB] Configuração salva em db_config.json.');
  } catch (err) {
    console.error('[DB] Erro ao gravar db_config.json:', err);
  }

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

  // FIX: Verifica se as credenciais mínimas estão presentes
  if (!activeDbConfig.host || !activeDbConfig.user || !activeDbConfig.database) {
    lastDbError = 'Credenciais MySQL não configuradas. Preencha Host, Usuário e Banco de Dados na aba "Configurar MySQL" ou no arquivo .env.';
    console.log('[DB] Credenciais ausentes. Usando fallback local.');
    return false;
  }

  // FIX: Bloqueia senhas com asteriscos de placeholder
  if (activeDbConfig.password?.includes('****')) {
    lastDbError = 'A senha contém asteriscos de placeholder (****). Configure a senha real na aba "Configurar MySQL" ou no arquivo .env (DB_PASSWORD=SUA_SENHA).';
    console.log('[DB] Senha com asteriscos detectada. Usando fallback local.');
    return false;
  }

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
      connectTimeout: 10000
    };
    if (useSsl) {
      opts.ssl = { rejectUnauthorized: false };
    }
    const testPool = mysql.createPool(opts);
    const conn = await testPool.getConnection();
    conn.release();
    return testPool;
  }

  try {
    console.log(`[DB] Conectando em ${activeDbConfig.host}:${activeDbConfig.port} (SSL)...`);
    try {
      pool = await attemptConnection(true);
      console.log('[DB] Conectado via SSL!');
    } catch (sslErr: any) {
      console.log('[DB] SSL falhou. Tentando sem SSL...');
      pool = await attemptConnection(false);
      console.log('[DB] Conectado sem SSL!');
    }

    isUsingFallback = false;
    lastDbError = '';

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    console.log('[DB] Tabelas verificadas/criadas com sucesso!');
    return true;
  } catch (err: any) {
    const code = err?.code || '';
    const originalMsg = err?.message || '';

    if (code === 'ETIMEDOUT' || code === 'ENOTFOUND' || originalMsg.includes('timeout') || originalMsg.includes('unreachable')) {
      lastDbError = `TIMEOUT: O servidor ${activeDbConfig.host} está inacessível. Verifique se o Firewall/cPanel liberou o "Remote MySQL" para seu IP ou para "%".`;
    } else if (code === 'ECONNREFUSED') {
      lastDbError = `CONEXÃO RECUSADA: O servidor ${activeDbConfig.host}:${activeDbConfig.port} rejeitou a conexão. Confirme a porta e se o MySQL aceita conexões externas.`;
    } else if (code === 'ER_ACCESS_DENIED_ERROR' || code === '1045') {
      lastDbError = `ACESSO NEGADO: Usuário "${activeDbConfig.user}" ou senha incorretos. Verifique as credenciais no painel da hospedagem.`;
    } else if (code === 'ER_DBACCESS_DENIED_ERROR' || code === '1044') {
      lastDbError = `BANCO NEGADO: O usuário "${activeDbConfig.user}" não tem acesso ao banco "${activeDbConfig.database}". Vincule o usuário ao banco no cPanel com "Todos os privilégios".`;
    } else if (code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
      lastDbError = `AUTENTICAÇÃO INCOMPATÍVEL: Execute no phpMyAdmin: ALTER USER '${activeDbConfig.user}'@'%' IDENTIFIED WITH mysql_native_password BY 'SUA_SENHA';`;
    } else {
      lastDbError = `ERRO (${code || 'CONEXÃO'}): ${originalMsg}`;
    }

    isUsingFallback = true;
    console.error('[DB] Erro MySQL. Fallback ativo:', lastDbError);
    return false;
  }
}

function saveFallbackDb() {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving fallback db:', err);
  }
}

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
  localDb.campaigns.push(campaign);
  saveFallbackDb();
}

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
  localDb.leads.push(lead);
  saveFallbackDb();
}

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
        [event.id, event.campaign_id, event.event_type, event.scroll_percentage, event.session_id, formattedDate]
      );
      return;
    } catch (err) {
      console.error('MySQL Error tracking event:', err);
      throw err;
    }
  }
  localDb.analyticsEvents.push(event);
  saveFallbackDb();
}

export async function getAnalytics(): Promise<AnalyticsSummary[]> {
  const campaignsList = await getCampaigns();

  if (!isUsingFallback && pool) {
    try {
      const summaries: AnalyticsSummary[] = [];
      for (const camp of campaignsList) {
        const [[{ visits }]] = await pool.query(
          'SELECT COUNT(DISTINCT session_id) as visits FROM analytics_events WHERE campaign_id = ? AND event_type = ?',
          [camp.id, 'visit']
        ) as any;

        const [[{ ctaClicks }]] = await pool.query(
          'SELECT COUNT(*) as ctaClicks FROM analytics_events WHERE campaign_id = ? AND event_type = ?',
          [camp.id, 'cta_click']
        ) as any;

        const [[{ submissions }]] = await pool.query(
          'SELECT COUNT(*) as submissions FROM leads WHERE campaign_id = ?',
          [camp.id]
        ) as any;

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

  return campaignsList.map(camp => {
    const campaignEvents = localDb.analyticsEvents.filter(e => e.campaign_id === camp.id);
    const visitSessions = new Set(
      campaignEvents.filter(e => e.event_type === 'visit').map(e => e.session_id)
    );
    const visits = visitSessions.size;
    const ctaClicks = campaignEvents.filter(e => e.event_type === 'cta_click').length;
    const submissions = localDb.leads.filter(l => l.campaign_id === camp.id).length;

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
