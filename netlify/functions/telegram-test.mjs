function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
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
      disable_web_page_preview: true
    })
  });

  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

export const handler = async () => {
  try {
    const result = await telegramSend("✅ Telegram test from Netlify (if you see this, chat_id + token are correct).");
    return { statusCode: 200, body: JSON.stringify(result, null, 2) };
  } catch (e) {
    return { statusCode: 500, body: (e?.stack || String(e)) };
  }
};
