import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type AppEnv = { DB: D1Database; SYSTEM_ADMIN_USERNAME?: string; SYSTEM_ADMIN_PASSWORD?: string; SCHEDULER_USERNAME?: string; SCHEDULER_PASSWORD?: string; AUTH_SECRET?: string };
const SESSION_COOKIE = "kindergarten_admin_session";
const encoder = new TextEncoder();

function appEnv() { return env as unknown as AppEnv; }

export async function setupAuthTables() {
  const { DB } = appEnv();
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS admin_users (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL, role TEXT NOT NULL, must_change_password INTEGER NOT NULL DEFAULT 1, failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until TEXT, updated_at TEXT NOT NULL)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)"),
  ]);
  const accounts = [
    { username: appEnv().SYSTEM_ADMIN_USERNAME, password: appEnv().SYSTEM_ADMIN_PASSWORD, role: "admin", mustChange: 0 },
    { username: appEnv().SCHEDULER_USERNAME, password: appEnv().SCHEDULER_PASSWORD, role: "scheduler", mustChange: 1 },
  ];
  for (const account of accounts) {
    if (!account.username || !account.password) continue;
    const existing = await DB.prepare("SELECT username FROM admin_users WHERE username = ?").bind(account.username).first();
    if (!existing) {
      const hash = await hashPassword(account.password);
      await DB.prepare("INSERT INTO admin_users (username, password_hash, role, must_change_password, failed_attempts, updated_at) VALUES (?, ?, ?, ?, 0, ?)").bind(account.username, hash, account.role, account.mustChange, new Date().toISOString()).run();
    }
  }
}

export async function login(username: string, password: string) {
  await setupAuthTables();
  const { DB } = appEnv();
  const user = await DB.prepare("SELECT username, password_hash, role, must_change_password, failed_attempts, locked_until FROM admin_users WHERE username = ?").bind(username).first<Record<string, string | number>>();
  if (!user) return { ok: false, error: "帳號或密碼錯誤。", remaining: 4 };
  const now = Date.now();
  const lockedUntil = user.locked_until ? Date.parse(String(user.locked_until)) : 0;
  if (lockedUntil > now) return { ok: false, error: "登入已暫時鎖定，請稍後再試。", lockedSeconds: Math.ceil((lockedUntil - now) / 1000) };
  const valid = await verifyPassword(password, String(user.password_hash));
  if (!valid) {
    const attempts = Number(user.failed_attempts ?? 0) + 1;
    if (attempts >= 5) {
      const until = new Date(now + 3 * 60 * 1000).toISOString();
      await DB.prepare("UPDATE admin_users SET failed_attempts = 0, locked_until = ?, updated_at = ? WHERE username = ?").bind(until, new Date().toISOString(), username).run();
      return { ok: false, error: "密碼錯誤已達 5 次，登入鎖定 3 分鐘。", lockedSeconds: 180 };
    }
    await DB.prepare("UPDATE admin_users SET failed_attempts = ?, locked_until = NULL, updated_at = ? WHERE username = ?").bind(attempts, new Date().toISOString(), username).run();
    return { ok: false, error: `帳號或密碼錯誤，還可嘗試 ${5 - attempts} 次。`, remaining: 5 - attempts };
  }
  await DB.prepare("UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE username = ?").bind(new Date().toISOString(), username).run();
  await createSession(username);
  return { ok: true, role: String(user.role), mustChangePassword: Boolean(user.must_change_password) };
}

export async function changePassword(username: string, currentPassword: string, newPassword: string) {
  await setupAuthTables();
  const { DB } = appEnv();
  const user = await DB.prepare("SELECT password_hash FROM admin_users WHERE username = ?").bind(username).first<{ password_hash: string }>();
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) return { ok: false, error: "目前密碼不正確。" };
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return { ok: false, error: "新密碼至少 8 碼，且需同時包含英文字母與數字。" };
  if (currentPassword === newPassword) return { ok: false, error: "新密碼不可與初始密碼相同。" };
  const hash = await hashPassword(newPassword);
  await DB.batch([
    DB.prepare("UPDATE admin_users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE username = ?").bind(hash, new Date().toISOString(), username),
    DB.prepare("DELETE FROM admin_sessions WHERE username = ?").bind(username),
  ]);
  await createSession(username);
  return { ok: true };
}

export async function getAdminSession() {
  await setupAuthTables();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await appEnv().DB.prepare("SELECT s.username, s.expires_at, u.role, u.must_change_password FROM admin_sessions s JOIN admin_users u ON u.username = s.username WHERE s.token_hash = ?").bind(tokenHash).first<{ username: string; expires_at: string; role: string; must_change_password: number }>();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return { username: row.username, role: row.role, mustChangePassword: Boolean(row.must_change_password) };
}

export async function requireAdmin(allowPasswordChange = false) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.mustChangePassword && !allowPasswordChange) redirect("/admin/change-password");
  return session;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await appEnv().DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  jar.delete(SESSION_COOKIE);
}

async function createSession(username: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toHex(bytes);
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await appEnv().DB.prepare("INSERT INTO admin_sessions (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, username, expires.toISOString(), new Date().toISOString()).run();
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires });
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return `pbkdf2$100000$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string) {
  const [kind, iterations, saltHex, expected] = stored.split("$");
  if (kind !== "pbkdf2" || !iterations || !saltHex || !expected) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromHex(saltHex), iterations: Number(iterations), hash: "SHA-256" }, key, 256);
  return timingSafeEqual(toHex(new Uint8Array(bits)), expected);
}
async function sha256(value: string) { return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
function toHex(bytes: Uint8Array) { return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }
function fromHex(hex: string) { return new Uint8Array(hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []); }
function timingSafeEqual(a: string, b: string) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }
