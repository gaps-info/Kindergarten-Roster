export type ScheduleMode = "daily" | "monthly";
export type DutyRow = { date: string; weekday: string; early: string; shortDuty: string; dutyClass: string; longDuty1: string; longDuty2: string };
export type PublishedSchedule = { title: string; mode: ScheduleMode; startDate: string; endDate: string; publishedAt: string; rows: DutyRow[] };

const classes: Record<string, string[]> = {
  海豚班: ["光庭老師", "佑茹老師"],
  海星班: ["忻彤老師", "鈺珺老師", "羽婕老師"],
  海馬班: ["淑蓮老師", "捷芳老師"],
};
const classOrder = Object.keys(classes);
const earlyOrder = ["捷芳老師", "忻彤老師", "佑茹老師", "鈺珺老師", "光庭老師"];
const holidays = new Set(["2026-08-31", "2026-09-25", "2026-09-28", "2026-10-09", "2026-10-26", "2026-12-25", "2027-01-08", "2027-01-20"]);
const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export function generateSchedule(startDate: string, endDate: string, mode: ScheduleMode): DutyRow[] {
  const workDates: string[] = [];
  for (let d = localDate(startDate); d <= localDate(endDate); d.setDate(d.getDate() + 1)) {
    const iso = toIso(d);
    if (d.getDay() !== 0 && d.getDay() !== 6 && !holidays.has(iso)) workDates.push(iso);
  }
  const all = Object.values(classes).flat();
  const duty = Object.fromEntries(all.map((t) => [t, 0]));
  const pairs = Object.fromEntries(all.map((t) => [t, 0]));
  const classCount = Object.fromEntries(classOrder.map((c) => [c, 0]));
  const earlyCount = Object.fromEntries(earlyOrder.map((t) => [t, 0]));
  const rows: DutyRow[] = [];
  let classCursor = Math.floor(Math.random() * classOrder.length);
  const tie = () => Math.random();

  if (mode === "daily") {
    let earlyCursor = Math.floor(Math.random() * earlyOrder.length);
    for (const date of workDates) {
      const early = earlyOrder[earlyCursor++ % earlyOrder.length];
      const eligibleClasses = classOrder.filter((c) => classes[c].filter((t) => t !== early).length >= 2);
      const dutyClass = eligibleClasses.sort((a, b) => classCount[a] - classCount[b] || circular(a, classCursor) - circular(b, classCursor))[0];
      classCursor = (classOrder.indexOf(dutyClass) + 1) % classOrder.length;
      const pair = classes[dutyClass].filter((t) => t !== early).sort((a, b) => pairs[a] - pairs[b] || duty[a] - duty[b] || tie() - .5).slice(0, 2);
      pair.forEach((t) => { pairs[t]++; duty[t]++; }); classCount[dutyClass]++;
      const shortDuty = all.filter((t) => t !== early && !pair.includes(t)).sort((a, b) => duty[a] - duty[b] || tie() - .5)[0]; duty[shortDuty]++;
      rows.push(makeRow(date, early, shortDuty, dutyClass, pair));
    }
  } else {
    const groups = Map.groupBy(workDates, (d) => d.slice(0, 7));
    for (const monthDates of groups.values()) {
      const days = monthDates.length;
      const dutyClass = [...classOrder].sort((a, b) => classCount[a] - classCount[b] || circular(a, classCursor) - circular(b, classCursor))[0];
      classCursor = (classOrder.indexOf(dutyClass) + 1) % classOrder.length;
      const pair = [...classes[dutyClass]].sort((a, b) => duty[a] - duty[b] || pairs[a] - pairs[b] || tie() - .5).slice(0, 2);
      pair.forEach((t) => { pairs[t] += days; duty[t] += days; }); classCount[dutyClass] += days;
      const shortDuty = all.filter((t) => !pair.includes(t)).sort((a, b) => duty[a] - duty[b] || tie() - .5)[0]; duty[shortDuty] += days;
      const team = new Set([...pair, shortDuty]);
      let earlyCursor = Math.floor(Math.random() * earlyOrder.length);
      for (const date of monthDates) {
        const early = earlyOrder.filter((t) => !team.has(t)).sort((a, b) => earlyCount[a] - earlyCount[b] || circularTeacher(a, earlyCursor) - circularTeacher(b, earlyCursor))[0];
        earlyCount[early]++; earlyCursor = (earlyOrder.indexOf(early) + 1) % earlyOrder.length;
        rows.push(makeRow(date, early, shortDuty, dutyClass, pair));
      }
    }
  }
  return rows;
}

function makeRow(date: string, early: string, shortDuty: string, dutyClass: string, pair: string[]): DutyRow { return { date, weekday: weekdays[localDate(date).getDay()], early, shortDuty, dutyClass, longDuty1: pair[0], longDuty2: pair[1] }; }
function circular(name: string, cursor: number) { return (classOrder.indexOf(name) - cursor + classOrder.length) % classOrder.length; }
function circularTeacher(name: string, cursor: number) { return (earlyOrder.indexOf(name) - cursor + earlyOrder.length) % earlyOrder.length; }
function localDate(iso: string) { return new Date(`${iso}T12:00:00`); }
function toIso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
