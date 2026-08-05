"use client";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [locked, setLocked] = useState(0); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!locked) return; const timer = setInterval(() => setLocked((v) => Math.max(0, v - 1)), 1000); return () => clearInterval(timer); }, [locked]);
  async function submit(e: FormEvent) { e.preventDefault(); if (locked) return; setBusy(true); const r = await fetch("/api/auth/login", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({username,password}) }); const data = await r.json(); setBusy(false); if (data.lockedSeconds) setLocked(data.lockedSeconds); if (r.ok) location.href = data.mustChangePassword ? "/admin/change-password" : "/admin"; else setMessage(data.error); }
  return <main className="auth-page"><section className="auth-card"><div className="brand-mark">值</div><p className="section-kicker">STAFF SIGN IN</p><h1>排班系統登入</h1><p>吉安國小附設幼兒園・系統管理員與排班人員入口</p><form onSubmit={submit}><label>帳號<input value={username} onChange={(e)=>setUsername(e.target.value)} autoComplete="username" required /></label><label>密碼<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required /></label>{message && <div className="auth-error">{message}</div>}<button className="button primary wide" disabled={busy||locked>0}>{locked ? `請於 ${Math.floor(locked/60)}:${String(locked%60).padStart(2,"0")} 後重試` : busy ? "登入中…" : "登入排班系統"}</button></form><a href="/">← 返回公告頁</a></section></main>;
}
