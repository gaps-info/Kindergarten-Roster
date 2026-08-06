"use client";

import { useEffect, useMemo, useState } from "react";
import { teachers, weekKey, type DutyRow, type PublishedSchedule } from "./schedule";

export default function Home() {
  const [published, setPublished] = useState<PublishedSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [teacher, setTeacher] = useState("全部老師");
  const [teacherPage, setTeacherPage] = useState(0);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/schedule").then((response) => response.json()).then((data) => setPublished(data.schedule ?? null)).finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(() => Array.from(Map.groupBy(published?.rows ?? [], (row) => weekKey(row.date)).values()), [published]);

  useEffect(() => {
    if (weeks.length === 0) return;
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
    let index = weeks.findIndex((week) => week.some((row) => row.date === today));
    if (index < 0) index = weeks.findIndex((week) => week.at(-1)!.date >= today);
    if (index < 0) index = weeks.length - 1;
    setCurrentWeek(index);
    setSelectedWeek(index);
  }, [weeks]);

  const selectedRows = weeks[selectedWeek];
  const teacherAssignments = useMemo(() => teacher === "全部老師" ? [] : weeks.map((rows, index) => makeTeacherAssignment(rows, index + 1, teacher)).filter((item): item is TeacherAssignment => item !== null), [teacher, weeks]);
  const teacherPageCount = Math.max(1, Math.ceil(teacherAssignments.length / 6));
  const visibleTeacherAssignments = teacherAssignments.slice(teacherPage * 6, teacherPage * 6 + 6);
  useEffect(() => { setTeacherPage(0); }, [teacher]);
  const currentRange = selectedRows ? `第 ${selectedWeek + 1} 週・${formatDate(selectedRows[0].date)}－${formatDate(selectedRows.at(-1)!.date)}` : "尚未發布排班";

  return <main className="public-dashboard">
    <header className="site-header"><div className="brand-mark">值</div><div><p className="eyebrow">幼兒園行政公告</p><h1>課後輪值表</h1></div><a className="admin-link" href="/admin">管理排班</a></header>

    <section className="compact-hero">
      <div className="current-clock"><span>目前日期與時間</span><strong>{now ? formatClock(now) : "讀取中…"}</strong></div>
      <div className="hero-summary"><p className="section-kicker">DUTY ROSTER</p><h2>本學期輪值安排</h2><span>當前週次範圍：{currentRange}</span></div>
      <div className="hero-status"><i />{selectedWeek === currentWeek ? "目前這一週" : `查看第 ${selectedWeek + 1} 週`}</div>
    </section>

    <section className="compact-roster">
      <div className="compact-heading"><div><p className="section-kicker">THIS WEEK</p><h3>{teacher === "全部老師" ? "本週值班狀況" : `${teacher}的排班週次`}</h3></div><div className="compact-actions"><label>老師<select value={teacher} onChange={(event) => setTeacher(event.target.value)}><option>全部老師</option>{teachers.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button ghost" onClick={() => window.print()}>列印</button></div></div>
      {loading ? <div className="compact-empty">正在讀取最新公告…</div> : !published || weeks.length === 0 ? <div className="compact-empty"><strong>尚未發布排班</strong><span>請由管理者建立並發布最新輪值表。</span></div> : teacher !== "全部老師" ? <TeacherAssignments items={visibleTeacherAssignments} page={teacherPage} pageCount={teacherPageCount} onPageChange={setTeacherPage} /> : <>
        <WeekCard rows={selectedRows} weekNumber={selectedWeek + 1} />
        <nav className="dashboard-week-nav" aria-label="週次切換">
          <button className="button secondary" disabled={selectedWeek === 0} onClick={() => setSelectedWeek((value) => value - 1)}>← 上一週</button>
          <label>跳至<select value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.target.value))}>{weeks.map((week, index) => <option value={index} key={weekKey(week[0].date)}>第 {index + 1} 週・{formatDate(week[0].date)}－{formatDate(week.at(-1)!.date)}</option>)}</select></label>
          <button className="button secondary current-week-button" disabled={selectedWeek === currentWeek} onClick={() => setSelectedWeek(currentWeek)}>回到本週</button>
          <button className="button secondary" disabled={selectedWeek === weeks.length - 1} onClick={() => setSelectedWeek((value) => value + 1)}>下一週 →</button>
        </nav>
      </>}
    </section>
  </main>;
}

function WeekCard({ rows, weekNumber }: { rows: DutyRow[]; weekNumber: number }) {
  const first = rows[0];
  return <article className="dashboard-week-card">
    <div className="dashboard-week-title"><div><p>第 {weekNumber} 週</p><strong>{formatDate(rows[0].date)}－{formatDate(rows.at(-1)!.date)}</strong></div>{rows.some((row) => row.isHoliday) && <span>含假日不排班</span>}</div>
    <div className="dashboard-team"><div><small>A・早值</small><strong>{first.early}</strong></div><div><small>B・16:00–17:00</small><strong>{first.shortDuty}</strong></div><div><small>C／D・16:00–18:00</small><strong>{first.longDuty1}、{first.longDuty2}</strong><em>{first.dutyClass}</em></div></div>
    <div className="dashboard-days">{rows.map((row) => <div className={row.isHoliday ? "holiday" : ""} key={row.date}><span>{formatDate(row.date)}</span><small>{row.weekday}</small>{row.isHoliday && <b>假日不排班</b>}</div>)}</div>
  </article>;
}

type TeacherAssignment = { weekNumber: number; start: string; end: string; role: string; dutyClass?: string; dates: string[]; hours?: number };

function makeTeacherAssignment(rows: DutyRow[], weekNumber: number, teacher: string): TeacherAssignment | null {
  const first = rows[0];
  const dates = rows.filter((row) => !row.isHoliday).map((row) => row.date);
  if (first.early === teacher) return { weekNumber, start: rows[0].date, end: rows.at(-1)!.date, role: "A・早值", dates };
  if (first.shortDuty === teacher) return { weekNumber, start: rows[0].date, end: rows.at(-1)!.date, role: "B・16:00–17:00", dates, hours: dates.length };
  if (first.longDuty1 === teacher || first.longDuty2 === teacher) return { weekNumber, start: rows[0].date, end: rows.at(-1)!.date, role: "C／D・16:00–18:00", dutyClass: first.dutyClass, dates, hours: dates.length * 2 };
  return null;
}

function TeacherAssignments({ items, page, pageCount, onPageChange }: { items: TeacherAssignment[]; page: number; pageCount: number; onPageChange: (page: number) => void }) {
  return <div className="teacher-assignment-view"><div className="teacher-assignment-grid">{items.map((item) => <article className="teacher-assignment-card" key={item.weekNumber}><div><span>第 {item.weekNumber} 週</span>{item.hours !== undefined && <b>{item.hours} 小時</b>}</div><h4>{item.role}</h4>{item.dutyClass && <em>{item.dutyClass}</em>}<p>{formatDate(item.start)}－{formatDate(item.end)}</p><div className="assignment-dates">{item.dates.map((date) => <small key={date}>{formatDate(date)}</small>)}</div></article>)}</div>{items.length === 0 ? <div className="compact-empty"><strong>沒有符合的排班</strong></div> : pageCount > 1 && <nav className="teacher-page-nav"><button className="button secondary" disabled={page === 0} onClick={() => onPageChange(page - 1)}>← 上一頁</button><span>第 {page + 1}／{pageCount} 頁</span><button className="button secondary" disabled={page === pageCount - 1} onClick={() => onPageChange(page + 1)}>下一頁 →</button></nav>}</div>;
}

function formatDate(value: string) { const [, month, day] = value.split("-"); return `${month}/${day}`; }
function formatClock(value: Date) { return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(value); }
