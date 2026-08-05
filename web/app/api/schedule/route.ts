import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import type { DutyRow, ScheduleMode } from "../../schedule";

async function setup() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_config (id INTEGER PRIMARY KEY CHECK (id = 1), owner_user_id TEXT NOT NULL, owner_email TEXT NOT NULL, created_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS published_schedule (id INTEGER PRIMARY KEY CHECK (id = 1), title TEXT NOT NULL, mode TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, rows_json TEXT NOT NULL, published_at TEXT NOT NULL, published_by TEXT NOT NULL)"),
  ]);
}

export async function GET() {
  try {
    await setup();
    const row = await env.DB.prepare("SELECT title, mode, start_date, end_date, rows_json, published_at FROM published_schedule WHERE id = 1").first<Record<string, string>>();
    if (!row) return Response.json({ schedule: null });
    return Response.json({ schedule: { title: row.title, mode: row.mode, startDate: row.start_date, endDate: row.end_date, rows: JSON.parse(row.rows_json), publishedAt: row.published_at } });
  } catch { return Response.json({ schedule: null }); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入管理頁。" }, { status: 401 });
  try {
    await setup();
    await env.DB.prepare("INSERT OR IGNORE INTO admin_config (id, owner_user_id, owner_email, created_at) VALUES (1, ?, ?, ?)").bind(user.userId, user.email, new Date().toISOString()).run();
    const owner = await env.DB.prepare("SELECT owner_user_id FROM admin_config WHERE id = 1").first<{ owner_user_id: string }>();
    if (owner?.owner_user_id !== user.userId) return Response.json({ error: "只有這個網站的管理者可以發布公告。" }, { status: 403 });
    const body = await request.json() as { title?: string; mode?: ScheduleMode; startDate?: string; endDate?: string; rows?: DutyRow[] };
    if (!body.title || !body.startDate || !body.endDate || !Array.isArray(body.rows) || !["daily", "monthly"].includes(body.mode ?? "")) return Response.json({ error: "排班資料不完整。" }, { status: 400 });
    if (body.rows.length > 400) return Response.json({ error: "排班筆數過多。" }, { status: 400 });
    const now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO published_schedule (id, title, mode, start_date, end_date, rows_json, published_at, published_by) VALUES (1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, mode=excluded.mode, start_date=excluded.start_date, end_date=excluded.end_date, rows_json=excluded.rows_json, published_at=excluded.published_at, published_by=excluded.published_by").bind(body.title, body.mode, body.startDate, body.endDate, JSON.stringify(body.rows), now, user.email).run();
    return Response.json({ ok: true, publishedAt: now });
  } catch { return Response.json({ error: "網站資料庫尚未就緒，請稍後再試。" }, { status: 500 }); }
}
