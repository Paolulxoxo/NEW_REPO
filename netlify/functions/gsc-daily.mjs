export default async function handler() {
  const startAt = mustGetEnv("START_AT_UTC");
  const bypass = process.env.BYPASS_START_GUARD === "1";
  if (!bypass && Date.now() < Date.parse(startAt)) return;

  const sites = JSON.parse(mustGetEnv("SITES_URLS"));
  const client = await getClient();

  // GSC is usually delayed; we use "yesterday" as a stable daily snapshot
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const date = isoDate(d);

  // Build ONE message
  let finalMsg = `<b>GSC Update (Last 24h)</b>\n`;
  finalMsg += `🕒 Time (IST): ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;
  finalMsg += `<b>Date:</b> ${date}\n\n`;

  for (const site of sites) {
    try {
      const totals = await queryTotals(client, site, date);

      finalMsg += `📊 <b>${site}</b>\n`;
      finalMsg += `Impressions: ${totals.impressions}\n`;
      finalMsg += `Clicks: ${totals.clicks}\n`;
      finalMsg += `CTR: ${(totals.ctr * 100).toFixed(2)}%\n`;
      finalMsg += `Avg Position: ${totals.position.toFixed(2)}\n\n`;
    } catch (err) {
      finalMsg += `❌ <b>${site}</b>\n`;
      finalMsg += `Error: ${err?.message || String(err)}\n\n`;
    }
  }

  // SEND ONLY ONCE
  await telegramSend(finalMsg);
}
