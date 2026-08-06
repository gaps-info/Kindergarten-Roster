"use client";

import { useMemo, useState } from "react";
import { generateSchedule, weekKey, type DutyRow } from "../schedule";

export default function AdminScheduler({ displayName, role }: { displayName: string; role: string }) {
  const [startDate, setStartDate] = useState("2026-08-31");
  const [endDate, setEndDate] = useState("2027-01-20");
  const [rows, setRows] = useState<DutyRow[]>(() => generateSchedule("2026-08-31", "2027-01-20"));
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const weeks = useMemo(() => Array.from(Map.groupBy(rows, (row) => weekKey(row.date)).values()), [rows]);

  function regenerate() {
    if (startDate > endDate) { setMessage("開始日期不能晚於結束日期。"); return; }
    setRows(generateSchedule(startDate, endDate));
    setMessage("已重新產生每週固定排班，請確認後發布。");
  }

  async function publish() {
    setPublishing(true); setMessage("");
    const response = await fetch("/api/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "本學期課後輪值公告", mode: "weekly", startDate, endDate, rows }) });
    const data = await response.json(); setPublishing(false);
    setMessage(response.ok ? "發布完成！所有人重新開啟公告頁即可看到最新版本。" : data.error ?? "發布失敗，請稍後再試。");
  }

  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const data = rows.map((row) => ({ 日期: row.date.replaceAll("-", "/"), 星期: row.weekday, 狀態: row.isHoliday ? "國定連假" : "上班日", 早值: row.isHoliday ? "—" : row.early, "16:00-17:00": row.isHoliday ? "—" : row.shortDuty, 班級: row.isHoliday ? "—" : row.dutyClass, "16:00-18:00 人員1": row.isHoliday ? "—" : row.longDuty1, "16:00-18:00 人員2": row.isHoliday ? "—" : row.longDuty2 }));
    const sheet = XLSX.utils.json_to_sheet(data); sheet["!cols"] = [{ wch: 13 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "每週輪值表"); XLSX.writeFile(book, `課後輪值表_${startDate}_${endDate}.xlsx`);
  }

  return <main className="admin-page">
    <header className="site-header"><div className="brand-mark">值</div><div><p className="eyebrow">排班管理中心</p><h1>建立與發布輪值表</h1></div><div className="user-area"><a className="back-to-public" href="/">← 返回公告頁</a><span className="role-badge">{role === "admin" ? "系統管理員" : "排班人員"}</span><span>{displayName}</span><a href="/api/auth/logout">登出</a></div></header>
    <section className="admin-grid">
      <aside className="settings-card">
        <p className="section-kicker">SCHEDULE SETTINGS</p><h2>排班設定</h2>
        <div className="single-mode"><b>每週固定組</b><span>同一週維持 A 早值、B 16–17、C／D 16–18</span></div>
        <label>開始日期<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>結束日期<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button className="button primary wide" onClick={regenerate}>重新產生排班</button>
        <button className="button secondary wide" onClick={downloadExcel}>下載 Excel</button>
        <div className="rule-note"><b>排班規則</b><span>早值人員不參與當週其他輪值；16–18 的兩位老師維持同班。國定連假保留於週表內但不排班。</span></div>
      </aside>
      <section className="preview-card">
        <div className="publish-bar"><div><p className="section-kicker">WEEKLY PREVIEW</p><h2>發布前預覽</h2><span>{weeks.length} 週・{rows[0]?.date} 至 {rows.at(-1)?.date}</span></div><button className="button publish" disabled={publishing} onClick={publish}>{publishing ? "發布中…" : "發布最新公告"}</button></div>
        {message && <div className="notice">{message}</div>}
        <div className="weekly-list">{weeks.map((week) => <WeekCard key={weekKey(week[0].date)} rows={week} />)}</div>
      </section>
    </section>
  </main>;
}

function WeekCard({ rows }: { rows: DutyRow[] }) {
  const first = rows[0];
  return <article className="week-card">
    <div className="week-card-heading"><div><p className="section-kicker">WEEK OF</p><h3>{formatDate(rows[0].date)}－{formatDate(rows.at(-1)!.date)}</h3></div><span>{rows.some((row) => row.isHoliday) ? "含國定連假" : "每週固定"}</span></div>
    <div className="week-team"><div><small>A・早值</small><strong>{first.early}</strong></div><div><small>B・16:00–17:00</small><strong>{first.shortDuty}</strong></div><div><small>C／D・16:00–18:00</small><strong>{first.longDuty1}、{first.longDuty2}</strong><em>{first.dutyClass}</em></div></div>
    <div className="week-days">{rows.map((row) => <div className={row.isHoliday ? "holiday" : ""} key={row.date}><span>{formatDate(row.date)} {row.weekday}</span>{row.isHoliday ? <b>國定連假</b> : <b>照常輪值</b>}</div>)}</div>
  </article>;
}

function formatDate(value: string) { const [, month, day] = value.split("-"); return `${month}/${day}`; }
