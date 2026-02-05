import { google } from "googleapis";

/**
 * Netlify scheduled function
 * 09:30 IST = 04:00 UTC
 */
export const config = {
  schedule: "0 4 * * *"
};

/* ---------- helpers ---------- */

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

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram error: ${body}`);
  }
}

/* ---------- GSC ---------- */

function getClient() {
  const sa = JSON.parse(mustGetEnv("GOOGLE_SERVICE_ACCOUNT_JSON"));

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });

  return google.searchconsole({ version: "v1", auth });
}

async function queryTotals(client, siteUrl, startDate, endDate) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      type: "web"
    }
  });

  const r = res.data.rows?.[0] ?? {};
  return {
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0
  };
}

/* ---------- MAIN ---------- */

export default async function handler() {
  // Optional start guard
  const startAt = mustGetEnv("START_AT_UTC");
  const bypass = process.env.BYPASS_START_GUARD === "1";
  if (!bypass && Date.now() < Date.parse(startAt)) return;

  const sites = JSON.parse(mustGetEnv("SITES_URLS"));
  const client = getClient();

// GSC API lags behind the UI. Use the latest "stable" day: 3 days ago.
const end = new Date();
end.setUTCDate(end.getUTCDate() - 3);

const startDate = isoDate(end);
const endDate = isoDate(end);

let msg = `<b>GSC Daily Snapshot (API)</b>\n`;
msg += `🕒 Time (IST): ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;
msg += `<b>Date:</b> ${startDate}\n\n`;



  for (const site of sites) {
    try {
      const totals = await queryTotals(client, site, startDate, endDate);

      msg += `📊 <b>${site}</b>\n`;
      msg += `Impressions: ${totals.impressions}\n`;
      msg += `Clicks: ${totals.clicks}\n`;
      msg += `CTR: ${(totals.ctr * 100).toFixed(2)}%\n`;
      msg += `Avg Position: ${totals.position.toFixed(2)}\n\n`;
    } catch (err) {
      msg += `❌ <b>${site}</b>\n`;
      msg += `Error: ${err?.message || String(err)}\n\n`;
    }
  }

  await telegramSend(msg);
}
