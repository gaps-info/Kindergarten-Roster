"use client";

import { useMemo, useState } from "react";
import { generateSchedule, type DutyRow, type ScheduleMode } from "../schedule";

export default function AdminScheduler({ displayName, role }: { displayName: string; role: string }) {
  const [startDate, setStartDate] = useState("2026-08-31");
  const [endDate, setEndDate] = useState("2027-01-20");
  const [mode, setMode] = useState<ScheduleMode>("daily");
  const [rows, setRows] = useState<DutyRow[]>(() => generateSchedule("2026-08-31", "2027-01-20", "daily"));
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const summary = useMemo(() => ({ days: rows.length, first: rows[0]?.date, last: rows.at(-1)?.date }), [rows]);

  function regenerate(nextMode = mode) {
    if (startDate > endDate) { setMessage("起始日期不可晚於結束日期。"); return; }
    setRows(generateSchedule(startDate, endDate, nextMode)); setMessage("已產生新的合法方案，請確認後再發布。");
  }

  async function publish() {
    setPublishing(true); setMessage("");
    const response = await fetch("/api/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "本學期課後輪值公告", mode, startDate, endDate, rows }) });
    const data = await response.json(); setPublishing(false);
    setMessage(response.ok ? "發布完成！所有人重新開啟公告頁即可看到最新版本。" : data.error ?? "發布失敗，請稍後再試。");
  }

  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({ 日期: r.date.replaceAll("-", "/"), 星期: r.weekday, 早值: r.early, "16:00-17:00（1人）": r.shortDuty, "16:00-18:00班級": r.dutyClass, "16:00-18:00人員1": r.longDuty1, "16:00-18:00人員2": r.longDuty2 }));
    const sheet = XLSX.utils.json_to_sheet(data); sheet["!cols"] = [{ wch: 13 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 20 }];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "輪值表"); XLSX.writeFile(book, `幼兒園輪值表_${startDate}_${endDate}.xlsx`);
  }

  return <main className="admin-page">
    <header className="site-header"><div className="brand-mark">值</div><div><p className="eyebrow">排班管理中心</p><h1>建立與發布輪值表</h1></div><div className="user-area"><span className="role-badge">{role === "admin" ? "系統管理員" : "排班人員"}</span><span>{displayName}</span><a href="/api/auth/logout">登出</a></div></header>
    <section className="admin-grid">
      <aside className="settings-card">
        <p className="section-kicker">SCHEDULE SETTINGS</p><h2>排班設定</h2>
        <label>起始日期<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label>結束日期<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <fieldset><legend>排班模式</legend><button className={mode === "daily" ? "mode active" : "mode"} onClick={() => { setMode("daily"); setTimeout(() => regenerate("daily"), 0); }}><b>每日輪換</b><span>每天重新分配，工作量最平均</span></button><button className={mode === "monthly" ? "mode active" : "mode"} onClick={() => { setMode("monthly"); setTimeout(() => regenerate("monthly"), 0); }}><b>每月固定組</b><span>整個月固定 3 位輪值老師</span></button></fieldset>
        <button className="button primary wide" onClick={() => regenerate()}>重新產生方案</button>
        <button className="button secondary wide" onClick={downloadExcel}>下載 Excel</button>
        <div className="rule-note"><b>系統自動檢查</b><span>早值不重複・兩人同班・排除假日</span></div>
      </aside>
      <section className="preview-card">
        <div className="publish-bar"><div><p className="section-kicker">PREVIEW</p><h2>發布前預覽</h2><span>{summary.days} 個上班日・{summary.first} 至 {summary.last}</span></div><button className="button publish" disabled={publishing} onClick={publish}>{publishing ? "發布中…" : "發布最新公告"}</button></div>
        {message && <div className="notice">{message}</div>}
        <div className="table-wrap admin-table"><table><thead><tr><th>日期</th><th>早值</th><th>16–17</th><th>班級</th><th>16–18（2人）</th></tr></thead><tbody>{rows.map((r) => <tr key={r.date}><td><b>{r.date}</b><small>{r.weekday}</small></td><td>{r.early}</td><td>{r.shortDuty}</td><td><span className="class-tag">{r.dutyClass}</span></td><td>{r.longDuty1}、{r.longDuty2}</td></tr>)}</tbody></table></div>
      </section>
    </section>
  </main>;
}
