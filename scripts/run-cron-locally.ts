// Polls the local dev server's cron endpoint every minute so scheduled posts
// go out without needing a hosted cron provider during local development.
const PORT = process.env.PORT ?? "3000";
const SECRET = process.env.CRON_SECRET ?? "";

async function tick() {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/cron/publish?secret=${SECRET}`);
    const json = await res.json();
    if (json.processed > 0) {
      console.log(`[cron] Published ${json.processed} post(s)`);
    }
  } catch (error) {
    console.error("[cron] Feilet:", error);
  }
}

setInterval(tick, 60_000);
tick();
