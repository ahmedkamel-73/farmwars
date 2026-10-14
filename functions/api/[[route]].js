export async function onRequest(context){
  const { request, env } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace('/api/','');

  // CORS
  if(request.method==='OPTIONS'){
    return new Response('',{headers:{
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type'
    }});
  }

  let body={};
  try{ body = await request.json(); }catch(e){}

  const userId = String(body.userId || '0');
  const username = body.username || 'guest';

  // Ensure tables exist
  try{
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      coins INTEGER DEFAULT 100,
      energy INTEGER DEFAULT 100,
      protection_until INTEGER DEFAULT 0,
      created_at INTEGER
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS plots (
      user_id TEXT,
      plot_index INTEGER,
      type TEXT DEFAULT 'empty',
      planted_at INTEGER,
      PRIMARY KEY(user_id, plot_index)
    )`).run();
  }catch(e){}

  // Get or create user
  let user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if(!user){
    await env.DB.prepare('INSERT INTO users (id, username, coins, energy, protection_until, created_at) VALUES (?,?,?,?,?,?)')
      .bind(userId, username, 100, 100, Date.now()+4*3600*1000, Date.now()).run();
    user = {id:userId, username, coins:100, energy:100, protection_until:Date.now()+4*3600*1000};
    // init 9 plots
    for(let i=0;i<9;i++){
      await env.DB.prepare('INSERT OR IGNORE INTO plots (user_id, plot_index, type) VALUES (?,?,?)').bind(userId,i,'empty').run();
    }
  }

  const json = (obj)=> new Response(JSON.stringify(obj),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

  if(route==='init'){
    return json({ok:true, user});
  }

  if(route==='farm'){
    const rows = await env.DB.prepare('SELECT * FROM plots WHERE user_id=? ORDER BY plot_index').bind(userId).all();
    let plots = rows.results || [];
    const now = Date.now();
    // auto-grow: after 30 sec -> ready (for demo, in real game 2-5 min)
    for(let p of plots){
      if(p.type==='growing' && now - p.planted_at > 30000){
        await env.DB.prepare('UPDATE plots SET type=? WHERE user_id=? AND plot_index=?').bind('ready', userId, p.plot_index).run();
        p.type='ready';
      }
    }
    return json({coins:user.coins, energy:user.energy, plots});
  }

  if(route==='plant'){
    if(user.energy < 10) return json({error:'الطاقة غير كافية، شاهد إعلان'});
    const idx = body.plot;
    const plot = await env.DB.prepare('SELECT * FROM plots WHERE user_id=? AND plot_index=?').bind(userId, idx).first();
    if(!plot || plot.type!=='empty') return json({error:'الأرض غير فارغة'});
    await env.DB.prepare('UPDATE plots SET type=?, planted_at=? WHERE user_id=? AND plot_index=?').bind('growing', Date.now(), userId, idx).run();
    await env.DB.prepare('UPDATE users SET energy=energy-10 WHERE id=?').bind(userId).run();
    return json({ok:true});
  }

  if(route==='harvest'){
    const idx = body.plot;
    const plot = await env.DB.prepare('SELECT * FROM plots WHERE user_id=? AND plot_index=?').bind(userId, idx).first();
    if(!plot || plot.type!=='ready') return json({error:'غير جاهز'});
    await env.DB.prepare('UPDATE plots SET type=?, planted_at=NULL WHERE user_id=? AND plot_index=?').bind('empty', userId, idx).run();
    await env.DB.prepare('UPDATE users SET coins=coins+20 WHERE id=?').bind(userId).run();
    return json({ok:true});
  }

  if(route==='reward' || route==='adsgram'){
    const amount = parseInt(body.amount||20);
    // Handle Adsgram server callback: /api/adsgram?userId=[userId]
    const urlUserId = url.searchParams.get('userId');
    const targetId = urlUserId || userId;
    await env.DB.prepare('UPDATE users SET energy=energy+? WHERE id=?').bind(amount, targetId).run();
    return json({ok:true, rewarded:amount, user:targetId});
  }

  return json({error:'unknown route '+route});
}
