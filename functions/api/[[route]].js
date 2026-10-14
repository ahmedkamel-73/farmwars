export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/','');
  const DB = env.DB;

  if (request.method === 'OPTIONS') return new Response('', { headers: cors() });

  let userId = url.searchParams.get('user_id') || '1';
  let username = url.searchParams.get('username') || 'player';
  let lang = url.searchParams.get('lang') || 'en';
  const now = Date.now();

  if (path.startsWith('game')) {
    let user = await DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
    if (!user) {
      await DB.prepare('INSERT INTO users(id,username,lang,coins) VALUES(?,?,?,100)').bind(userId, username, lang).run();
      user = await DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
    }
    const plots = await DB.prepare('SELECT * FROM plots WHERE user_id=?').bind(userId).all();
    const settings = await DB.prepare('SELECT * FROM settings').all();
    const tasks = await DB.prepare('SELECT * FROM tasks').all();
    return json({
      user,
      plots: plots.results,
      settings: settings.results,
      tasks: tasks.results,
      wallet: env.OWNER_WALLET || 'UQA7QBgeXOQldcirB1fWYLr8SRF-3ZVpZliYVNcWp-hmqx4R',
      serverTime: now
    });
  }

  if (path.startsWith('action') && request.method === 'POST') {
    const body = await request.json();

    if (body.type === 'plant') {
      await DB.prepare('INSERT OR REPLACE INTO plots(user_id,plot_id,crop,planted_at) VALUES(?,?,?,?)')
       .bind(userId, body.plot_id, body.crop || 'wheat', now).run();
    }

    if (body.type === 'harvest') {
      const plot = await DB.prepare('SELECT * FROM plots WHERE user_id=? AND plot_id=?').bind(userId, body.plot_id).first();
      if(plot && now - plot.planted_at > 60000){ // دقيقة واحدة للتجربة، خليها 600000 = 10 دقائق
        await DB.prepare('DELETE FROM plots WHERE user_id=? AND plot_id=?').bind(userId, body.plot_id).run();
        await DB.prepare('UPDATE users SET coins=coins+10 WHERE id=?').bind(userId).run();
      }
    }

    if (body.type === 'steal') {
      const targetId = body.target_id;
      const target = await DB.prepare('SELECT protection_until FROM users WHERE id=?').bind(targetId).first();
      if(target && target.protection_until > now){
        return json({ error: 'protected', until: target.protection_until }, 403);
      }
      // اسرق حفرة عشوائية
      const targetPlots = await DB.prepare('SELECT * FROM plots WHERE user_id=?').bind(targetId).all();
      if(targetPlots.results.length > 0){
        const stealPlot = targetPlots.results[0];
        await DB.prepare('DELETE FROM plots WHERE user_id=? AND plot_id=?').bind(targetId, stealPlot.plot_id).run();
        await DB.prepare('UPDATE users SET coins=coins+8 WHERE id=?').bind(userId).run();
      }
    }

    if (body.type === 'protect') {
      await DB.prepare('UPDATE users SET protection_until=? WHERE id=?').bind(now + 4*3600*1000, userId).run();
    }

    return json({ ok: true });
  }

  // admin
  if (path.startsWith('admin')) {
    const key = url.searchParams.get('key');
    if (key!== 'admin73') return json({ error: 'unauthorized' }, 401);
    if (path.includes('settings') && request.method === 'POST') {
      const body = await request.json();
      for (const k in body) {
        await DB.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').bind(k, String(body[k])).run();
      }
      return json({ ok: true });
    }
    if (path.includes('tasks') && request.method === 'POST') {
      const body = await request.json();
      await DB.prepare('INSERT INTO tasks(title_en,title_ar,link,reward,type) VALUES(?,?,?,?,?)')
       .bind(body.title_en, body.title_ar, body.link, body.reward, body.type).run();
      return json({ ok: true });
    }
    const stats = await DB.prepare('SELECT COUNT(*) as users, SUM(coins) as totalCoins FROM users').first();
    const allPlots = await DB.prepare('SELECT COUNT(*) as total FROM plots').first();
    return json({ stats, allPlots });
  }

  return json({ error: 'not found' }, 404);
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json',...cors() } });
}
function cors() {
  return {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  };
}
