import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function test() {
  const configPath = path.join(process.cwd(), 'db_config.json');
  if (!fs.existsSync(configPath)) {
    console.log('db_config.json does not exist!');
    return;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('Config:', { ...config, password: '***' });

  try {
    const conn = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Connected directly using SSL!');
    
    const [leads] = await conn.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
    console.log('Leads count in DB table:', (leads as any).length);
    console.log('Leads content:', JSON.stringify(leads, null, 2));

    const [campaigns] = await conn.query('SELECT * FROM campaigns');
    console.log('Campaigns in DB table:', campaigns);
    
    await conn.end();
  } catch (err: any) {
    console.error('Connection error with SSL:', err.message);
    try {
      console.log('Retrying without SSL...');
      const conn = await mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port
      });
      console.log('Connected directly without SSL!');
      
      const [leads] = await conn.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
      console.log('Leads count in DB table:', (leads as any).length);
      console.log('Leads content:', JSON.stringify(leads, null, 2));

      const [campaigns] = await conn.query('SELECT * FROM campaigns');
      console.log('Campaigns in DB table:', campaigns);

      await conn.end();
    } catch (err2: any) {
      console.error('Connection error without SSL:', err2.message);
    }
  }
}

test();
