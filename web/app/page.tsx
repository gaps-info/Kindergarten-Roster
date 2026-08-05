"use client";

import { useEffect, useMemo, useState } from "react";
import type { DutyRow, PublishedSchedule } from "./schedule";

const teachers = ["全部老師", "光庭老師", "佑茹老師", "忻彤老師", "鈺珺老師", "羽婕老師", "淑蓮老師", "捷芳老師"];

export default function Home() {
  const [published, setPublished] = useState<PublishedSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState("全部老師");
  const [month, setMonth] = useState("全部月份");

  useEffect(() => {
    fetch("/api/schedule").then((r) => r.json()).then((data) => setPublished(data.schedule ?? null)).finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => published ? ["全部月份", ...Array.from(new Set(published.rows.map((r) => r.date.slice(0, 7))))] : ["全部月份"], [published]);
  const filtered = useMemo(() => (published?.rows ?? []).filter((row) => {
    const monthOk = month === "全部月份" || row.date.startsWith(month);
    const teacherOk = teacher === "全部老師" || [row.early, row.shortDuty, row.longDuty1, row.longDuty2].includes(teacher);
    return monthOk && teacherOk;
  }), [published, month, teacher]);

  const today = new Date().toISOString().slice(0, 10);
  const nextDuty = (published?.rows ?? []).find((row) => row.date >= today);

  return (
    <main>
      <header className="site-header">
        <div className="brand-mark">值</div>
        <div><p className="eyebrow">幼兒園行政公告</p><h1>課後輪值表</h1></div>
        <a className="admin-link" href="/admin">管理排班</a>
      </header>

      <section className="hero">
        <div>
          <span className="live-badge"><i /> 最新公告</span>
          <h2>{published?.title ?? "本學期輪值安排"}</h2>
          <p>{published ? `${formatDate(published.startDate)} 至 ${formatDate(published.endDate)}｜${published.mode === "daily" ? "每日輪換" : "每月固定組"}` : "管理者發布後，最新輪值表會顯示在這裡。"}</p>
        </div>
        {nextDuty && <NextDuty row={nextDuty} />}
      </section>

      <section className="content-card">
        <div className="card-heading">
          <div><p className="section-kicker">DUTY ROSTER</p><h3>輪值公告</h3></div>
          <div className="filters">
            <label>月份<select value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label>老師<select value={teacher} onChange={(e) => setTeacher(e.target.value)}>{teachers.map((t) => <option key={t}>{t}</option>)}</select></label>
            <button className="button ghost" onClick={() => window.print()}>列印公告</button>
          </div>
        </div>

        {loading ? <div className="empty-state">正在讀取最新公告…</div> : !published ? <div className="empty-state"><strong>尚未發布排班</strong><span>請由管理頁產生並發布第一份輪值表。</span></div> : (
          <div className="table-wrap"><table><thead><tr><th>日期</th><th>星期</th><th>早值</th><th>16:00–17:00</th><th>16:00–18:00（同班）</th></tr></thead><tbody>
            {filtered.map((row) => <tr key={row.date} className={row.date === nextDuty?.date ? "is-next" : ""}><td><b>{formatDate(row.date)}</b></td><td>{row.weekday}</td><td>{row.early}</td><td><span className="person teal">{row.shortDuty}</span></td><td><span className="class-tag">{row.dutyClass}</span><span className="person coral">{row.longDuty1}</span><span className="person coral">{row.longDuty2}</span></td></tr>)}
          </tbody></table>{filtered.length === 0 && <div className="empty-state">目前篩選條件沒有排班資料。</div>}</div>
        )}
      </section>
      <footer>公告更新時間：{published ? new Date(published.publishedAt).toLocaleString("zh-TW") : "尚未發布"}</footer>
    </main>
  );
}

function NextDuty({ row }: { row: DutyRow }) {
  return <aside className="next-card"><p>下一個輪值日</p><strong>{formatDate(row.date)}・{row.weekday}</strong><div><span>16–17</span>{row.shortDuty}</div><div><span>16–18</span>{row.longDuty1}、{row.longDuty2}</div></aside>;
}

function formatDate(value: string) { const [y, m, d] = value.split("-"); return `${y}/${m}/${d}`; }
