function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const handler = async () => {
  const token = mustGetEnv("TELEGRAM_BOT_TOKEN");
  const chatId = mustGetEnv("TELEGRAM_CHAT_ID");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "✅ Telegram test from Netlify",
      disable_web_page_preview: true
    })
  });

  const body = await res.text();
  return { statusCode: 200, body: JSON.stringify({ ok: res.ok, status: res.status, body }, null, 2) };
};
