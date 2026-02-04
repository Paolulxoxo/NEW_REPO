import { google } from "googleapis";

export const config = {
  // 09:30 Asia/Yerevan = 05:30 UTC
  schedule: "0 4 * * *"
};

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function telegramSend(text) {
  const token = mustGetEnv("TELEGRAM_BOT_TOKEN");
  const chatId = mustGetEnv("TELEGRAM_CHAT_ID");

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram error: ${body}`);
  }
}

function getAuth() {
  const sa = JSON.parse(mustGetEnv("GOOGLE_SERVICE_ACCOUNT_JSON"));
  return new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });
}

async function getClient() {
  return google.searchconsole({
    version: "v1",
    auth: getAuth()
  });
}

async function queryTotals(client, siteUrl, date) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: date, endDate: date }
  });

  const r = res.data.rows?.[0] ?? {};
  return {
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0
  };
}

async function queryTop(client, siteUrl, date, dimension) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: date,
      endDate: date,
      dimensions: [dimension],
      rowLimit: 10
    }
  });

  return res.data.rows ?? [];
}

export default async function handler() {
  const startAt = mustGetEnv("START_AT_UTC");
  if (Date.now() < Date.parse(startAt)) return;

  const sites = JSON.parse(mustGetEnv("SITES_URLS"));
  const client = await getClient();

  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const date = isoDate(d);

  for (const site of sites) {
    const totals = await queryTotals(client, site, date);
    const queries = await queryTop(client, site, date, "query");

    let msg = `<b>GSC Daily Update</b>\n`;
    msg += `<b>Property:</b> ${site}\n`;
    msg += `<b>Date:</b> ${date}\n\n`;
    msg += `Clicks: ${totals.clicks}\n`;
    msg += `Impressions: ${totals.impressions}\n`;
    msg += `CTR: ${(totals.ctr * 100).toFixed(2)}%\n`;
    msg += `Position: ${totals.position.toFixed(2)}\n\n`;

    msg += `<b>Top Queries</b>\n`;
    queries.forEach((q, i) => {
      msg += `${i + 1}. ${q.keys[0]} (${q.clicks})\n`;
    });

    await telegramSend(msg);
  }
}
