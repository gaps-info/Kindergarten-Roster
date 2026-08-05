"use client";
import { FormEvent, useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword,setCurrent]=useState(""); const [newPassword,setNew]=useState(""); const [confirm,setConfirm]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();if(newPassword!==confirm){setMessage("兩次輸入的新密碼不一致。");return;}setBusy(true);const r=await fetch("/api/auth/change-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});const data=await r.json();setBusy(false);if(r.ok)location.href="/admin";else setMessage(data.error);}
  return <main className="auth-page"><section className="auth-card"><div className="brand-mark">值</div><p className="section-kicker">FIRST SIGN IN</p><h1>設定新密碼</h1><p>第一次登入必須更改初始密碼後才能使用管理功能。</p><form onSubmit={submit}><label>目前密碼<input type="password" value={currentPassword} onChange={(e)=>setCurrent(e.target.value)} required /></label><label>新密碼<input type="password" value={newPassword} onChange={(e)=>setNew(e.target.value)} minLength={8} required /><small>至少 8 碼，需包含英文字母與數字</small></label><label>再次輸入新密碼<input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required /></label>{message&&<div className="auth-error">{message}</div>}<button className="button primary wide" disabled={busy}>{busy?"儲存中…":"儲存新密碼並繼續"}</button></form></section></main>;
}
