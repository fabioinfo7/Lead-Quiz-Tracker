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

function saveFallbackDb() {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving fallback db:', err);
  }
}

function ensureLocalDbFile() {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      const initialDb: FallbackSchema = { campaigns: [], leads: [], analyticsEvents: [] };
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    }
    const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
    localDb = JSON.parse(data);
  } catch (err) {
    console.error('Error seeding fallback file:', err);
  }
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'db_config.json');

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
      activeDbConfig = {
        host: saved.host || activeDbConfig.host,
        user: saved.user || activeDbConfig.user,
        database: saved.database || activeDbConfig.database,
        port: parseInt(saved.port || String(activeDbConfig.port), 10),
        password: (saved.password && !saved.password.includes('****'))
          ? saved.password
          : activeDbConfig.password
      };
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

export async function updateDbConfig(newConfig: DatabaseConfig & { password?: string }): Promise<boolean> {
  activeDbConfig = {
    host: newConfig.host,
    user: newConfig.user,
    database: newConfig.database,
    port: newConfig.port || 3306,
    password: newConfig.password || activeDbConfig.password
  };
  try {
    const configToSave = {
      host: activeDbConfig.host,
      user: activeDbConfig.user,
      database: activeDbConfig.database,
      port: activeDbConfig.port,
      password: newConfig.password ? newConfig.password : '****'
    };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configToSave, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Erro ao salvar db_config.json:', err);
  }
  return await initDb();
}

export async function initDb(): Promise<boolean> {
  ensureLocalDbFile();
  loadPersistentConfig();

  if (!activeDbConfig.host || !activeDbConfig.user || !activeDbConfig.database) {
    isUsingFallback = true;
    lastDbError = 'Configuração de banco incompleta.';
    return false;
  }

  try {
    pool = mysql.createPool({
      host: activeDbConfig.host,
      user: activeDbConfig.user,
      password: activeDbConfig.password || '',
      database: activeDbConfig.database,
      port: activeDbConfig.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await pool.query('SELECT 1');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        campaign_id VARCHAR(50),
        name VARCHAR(255),
        email VARCHAR(255),
        age INT,
        quiz_answers JSON,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id VARCHAR(50) PRIMARY KEY,
        campaign_id VARCHAR(50),
        event_type VARCHAR(50),
        scroll_percentage INT DEFAULT 0,
        session_id VARCHAR(100),
        created_at DATETIME NOT NULL
      )
    `);

    isUsingFallback = false;
    lastDbError = '';
    console.log('[DB] MySQL conectado com sucesso!');
    return true;
  } catch (err: any) {
    isUsingFallback = true;
    lastDbError = err.message || 'Erro desconhecido';
    pool = null;
    console.error('[DB] Falha ao conectar MySQL, usando fallback local:', err.message);
    return false;
  }
}

// ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

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

export async function updateCampaign(id: string, data: { name?: string; product_name?: string }): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.product_name !== undefined) { fields.push('product_name = ?'); values.push(data.product_name); }
      if (fields.length === 0) return;
      values.push(id);
      await pool.query(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`, values);
      return;
    } catch (err) {
      console.error('MySQL Error updating campaign:', err);
      throw err;
    }
  }
  const idx = localDb.campaigns.findIndex(c => c.id === id);
  if (idx !== -1) {
    localDb.campaigns[idx] = { ...localDb.campaigns[idx], ...data };
    saveFallbackDb();
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      await pool.query('DELETE FROM analytics_events WHERE campaign_id = ?', [id]);
      await pool.query('UPDATE leads SET campaign_id = NULL WHERE campaign_id = ?', [id]);
      await pool.query('DELETE FROM campaigns WHERE id = ?', [id]);
      return;
    } catch (err) {
      console.error('MySQL Error deleting campaign:', err);
      throw err;
    }
  }
  localDb.campaigns = localDb.campaigns.filter(c => c.id !== id);
  localDb.analyticsEvents = localDb.analyticsEvents.filter(e => e.campaign_id !== id);
  saveFallbackDb();
}

// ─── LEADS ───────────────────────────────────────────────────────────────────

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
        [lead.id, lead.campaign_id, lead.name, lead.email, lead.age, JSON.stringify(lead.quiz_answers), formattedDate]
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

export async function updateLead(id: string, data: { name?: string; email?: string; age?: number }): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
      if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age); }
      if (fields.length === 0) return;
      values.push(id);
      await pool.query(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, values);
      return;
    } catch (err) {
      console.error('MySQL Error updating lead:', err);
      throw err;
    }
  }
  const idx = localDb.leads.findIndex(l => l.id === id);
  if (idx !== -1) {
    localDb.leads[idx] = { ...localDb.leads[idx], ...data };
    saveFallbackDb();
  }
}

export async function deleteLead(id: string): Promise<void> {
  if (!isUsingFallback && pool) {
    try {
      await pool.query('DELETE FROM leads WHERE id = ?', [id]);
      return;
    } catch (err) {
      console.error('MySQL Error deleting lead:', err);
      throw err;
    }
  }
  localDb.leads = localDb.leads.filter(l => l.id !== id);
  saveFallbackDb();
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export async function trackEvent(event: {
  id: string; campaign_id: string; event_type: string;
  scroll_percentage: number; session_id: string; created_at: string;
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

        summaries.push({
          campaignId: camp.id,
          campaignName: camp.name,
          productName: camp.product_name,
          visits: Number(visits),
          ctaClicks: Number(ctaClicks),
          submissions: Number(submissions),
          conversionRate: visits > 0 ? Math.round((submissions / visits) * 100) : 0,
          avgScroll: Math.round(Number(avgScroll))
        });
      }
      return summaries;
    } catch (err) {
      console.error('MySQL Error getting analytics:', err);
      throw err;
    }
  }

  return campaignsList.map(camp => {
    const events = localDb.analyticsEvents.filter(e => e.campaign_id === camp.id);
    const uniqueVisitSessions = new Set(events.filter(e => e.event_type === 'visit').map(e => e.session_id));
    const visits = uniqueVisitSessions.size;
    const ctaClicks = events.filter(e => e.event_type === 'cta_click').length;
    const submissions = localDb.leads.filter(l => l.campaign_id === camp.id).length;
    const scrollEvents = events.filter(e => e.event_type === 'scroll');
    const avgScroll = scrollEvents.length > 0
      ? Math.round(scrollEvents.reduce((sum, e) => sum + e.scroll_percentage, 0) / scrollEvents.length)
      : 0;
    return {
      campaignId: camp.id,
      campaignName: camp.name,
      productName: camp.product_name,
      visits,
      ctaClicks,
      submissions,
      conversionRate: visits > 0 ? Math.round((submissions / visits) * 100) : 0,
      avgScroll
    };
  });
}
