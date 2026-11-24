/**
 * ПравоПідтримка — приймання заявок з сайту і пересилання в Telegram.
 * Розгортається як Cloudflare Worker (безкоштовно).
 *
 * Змінні (Worker → Settings → Variables and Secrets):
 *   BOT_TOKEN       — токен бота від @BotFather (тип: Secret)
 *   CHAT_ID         — ваш chat id (або id групи), куди надходять заявки
 *   ALLOWED_ORIGINS — адреси сайту через кому, напр.:
 *                     https://ramirop89.github.io,https://ukrdopomoga-ua.com
 */

const MAX_LEN = { name: 80, phone: 25, topic: 80, message: 1500, page: 300 };

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
    const originOk = allowed.length === 0 || allowed.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': originOk && origin ? origin : (allowed[0] || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
    if (!originOk) return json({ ok: false, error: 'origin' }, 403);
    if (!env.BOT_TOKEN || !env.CHAT_ID) return json({ ok: false, error: 'not_configured' }, 500);

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

    // Пастка для ботів: приховане поле має бути порожнім
    if (data.website) return json({ ok: true });

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const clean = (k) => esc(String(data[k] ?? '').trim().slice(0, MAX_LEN[k] || 200));
    const name = clean('name');
    const phone = clean('phone');
    const topic = clean('topic');
    const message = clean('message');
    const page = clean('page');

    const digits = phone.replace(/\D/g, '');
    if (!name || digits.length < 10 || !topic) return json({ ok: false, error: 'validation' }, 400);

    const time = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
    const text = [
      '🆕 <b>Нова заявка з сайту</b>',
      '',
      `👤 <b>Ім’я:</b> ${name}`,
      `📞 <b>Телефон:</b> <a href="tel:+${digits}">${phone}</a>`,
      `📋 <b>Тема:</b> ${topic}`,
      message ? `💬 <b>Запит:</b> ${message}` : null,
      '',
      `🕒 ${time}`,
      page ? `🔗 ${page}` : null,
    ].filter((l) => l !== null).join('\n');

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });

    if (!tg.ok) return json({ ok: false, error: 'telegram' }, 502);
    return json({ ok: true });
  },
};
