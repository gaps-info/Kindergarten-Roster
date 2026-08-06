"use client";

import { useEffect, useMemo, useState } from "react";
import { teachers, weekKey, type DutyRow, type PublishedSchedule } from "./schedule";

export default function Home() {
  const [published, setPublished] = useState<PublishedSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState("全部老師");
  const [month, setMonth] = useState("全部月份");
  const [selectedWeek, setSelectedWeek] = useState(0);

  useEffect(() => {
    fetch("/api/schedule").then((response) => response.json()).then((data) => setPublished(data.schedule ?? null)).finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => published ? ["全部月份", ...Array.from(new Set(published.rows.map((row) => row.date.slice(0, 7))))] : ["全部月份"], [published]);
  const allWeeks = useMemo(() => Array.from(Map.groupBy(published?.rows ?? [], (row) => weekKey(row.date)).values()).map((rows, index) => ({ rows, weekNumber: index + 1 })), [published]);
  const weeks = useMemo(() => allWeeks.filter((week) => {
    const monthMatches = month === "全部月份" || week.rows.some((row) => row.date.startsWith(month));
    const first = week.rows[0];
    const teacherMatches = teacher === "全部老師" || [first.early, first.shortDuty, first.longDuty1, first.longDuty2].includes(teacher);
    return monthMatches && teacherMatches;
  }), [allWeeks, month, teacher]);
  useEffect(() => { setSelectedWeek(0); }, [month, teacher, published]);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  const nextDuty = (published?.rows ?? []).find((row) => row.date >= today && !row.isHoliday);

  return <main>
    <header className="site-header"><div className="brand-mark">值</div><div><p className="eyebrow">幼兒園行政公告</p><h1>課後輪值表</h1></div><a className="admin-link" href="/admin">管理排班</a></header>
    <section className="hero"><div><span className="live-badge"><i /> 最新公告</span><h2>{published?.title ?? "本學期輪值安排"}</h2><p>{published ? `${formatFullDate(published.startDate)} 至 ${formatFullDate(published.endDate)}・每週固定組` : "管理者發布後，最新輪值表會顯示在這裡。"}</p></div>{nextDuty && <NextDuty row={nextDuty} />}</section>
    <section className="content-card">
      <div className="card-heading"><div><p className="section-kicker">WEEKLY DUTY ROSTER</p><h3>每週輪值公告</h3></div><div className="filters"><label>月份<select value={month} onChange={(event) => setMonth(event.target.value)}>{months.map((item) => <option key={item}>{item}</option>)}</select></label><label>老師<select value={teacher} onChange={(event) => setTeacher(event.target.value)}><option>全部老師</option>{teachers.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button ghost" onClick={() => window.print()}>列印公告</button></div></div>
      {loading ? <div className="empty-state">正在讀取最新公告…</div> : !published ? <div className="empty-state"><strong>尚未發布排班</strong><span>請由管理者建立並發布最新輪值表。</span></div> : weeks.length === 0 ? <div className="empty-state">找不到符合條件的排班資料。</div> : <div className="public-weekly-list"><WeekCard rows={weeks[selectedWeek].rows} nextDate={nextDuty?.date} weekNumber={weeks[selectedWeek].weekNumber} /><nav className="week-navigation" aria-label="週次切換"><button className="button secondary" disabled={selectedWeek === 0} onClick={() => setSelectedWeek((current) => current - 1)}>← 上一週</button><label>跳至<select value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.target.value))}>{weeks.map((week, index) => <option value={index} key={weekKey(week.rows[0].date)}>第 {week.weekNumber} 週・{formatDate(week.rows[0].date)}－{formatDate(week.rows.at(-1)!.date)}</option>)}</select></label><button className="button secondary" disabled={selectedWeek === weeks.length - 1} onClick={() => setSelectedWeek((current) => current + 1)}>下一週 →</button></nav></div>}
    </section>
    <footer>公告更新時間：{published ? new Date(published.publishedAt).toLocaleString("zh-TW") : "尚未發布"}</footer>
  </main>;
}

function WeekCard({ rows, nextDate, weekNumber }: { rows: DutyRow[]; nextDate?: string; weekNumber: number }) {
  const first = rows[0];
  return <article className={rows.some((row) => row.date === nextDate) ? "week-card is-next-week" : "week-card"}>
    <div className="week-card-heading"><div><p className="section-kicker">第 {weekNumber} 週・WEEK OF</p><h3>{formatDate(rows[0].date)}－{formatDate(rows.at(-1)!.date)}</h3></div><span>{rows.some((row) => row.isHoliday) ? "含國定連假" : "每週固定"}</span></div>
    <div className="week-team"><div><small>A・早值</small><strong>{first.early}</strong></div><div><small>B・16:00–17:00</small><strong>{first.shortDuty}</strong></div><div><small>C／D・16:00–18:00</small><strong>{first.longDuty1}、{first.longDuty2}</strong><em>{first.dutyClass}</em></div></div>
    <div className="week-days">{rows.map((row) => <div className={row.isHoliday ? "holiday" : row.date === nextDate ? "next-day" : ""} key={row.date}><span>{formatDate(row.date)} {row.weekday}</span>{row.isHoliday ? <b>國定連假</b> : row.date === nextDate ? <b>下一個輪值日</b> : <b>照常輪值</b>}</div>)}</div>
  </article>;
}

function NextDuty({ row }: { row: DutyRow }) { return <aside className="next-card"><p>下一個輪值日</p><strong>{formatFullDate(row.date)}・{row.weekday}</strong><div><span>早值</span>{row.early}</div><div><span>16–17</span>{row.shortDuty}</div><div><span>16–18</span>{row.longDuty1}、{row.longDuty2}</div></aside>; }
function formatDate(value: string) { const [, month, day] = value.split("-"); return `${month}/${day}`; }
function formatFullDate(value: string) { return value.replaceAll("-", "/"); }
