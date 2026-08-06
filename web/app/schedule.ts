export type ScheduleMode = "weekly";
export type DutyRow = {
  date: string;
  weekday: string;
  early: string;
  shortDuty: string;
  dutyClass: string;
  longDuty1: string;
  longDuty2: string;
  isHoliday?: boolean;
};
export type PublishedSchedule = { title: string; mode: ScheduleMode; startDate: string; endDate: string; publishedAt: string; rows: DutyRow[] };

export const teachers = ["光庭老師", "佑茹老師", "忻彤老師", "鈺珺老師", "羽婕老師", "淑蓮老師", "捷芳老師"];

const classes: Record<string, string[]> = {
  海豚班: ["光庭老師", "佑茹老師"],
  海星班: ["忻彤老師", "鈺珺老師", "羽婕老師"],
  海馬班: ["淑蓮老師", "捷芳老師"],
};
const classOrder = Object.keys(classes);
const earlyOrder = ["捷芳老師", "忻彤老師", "佑茹老師", "鈺珺老師", "光庭老師"];
export const holidays = new Set(["2026-08-31", "2026-09-25", "2026-09-28", "2026-10-09", "2026-10-26", "2026-12-25", "2027-01-08", "2027-01-20"]);
const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export function generateSchedule(startDate: string, endDate: string, _mode: ScheduleMode = "weekly"): DutyRow[] {
  const dates: string[] = [];
  for (let date = localDate(startDate); date <= localDate(endDate); date.setDate(date.getDate() + 1)) {
    if (date.getDay() !== 0 && date.getDay() !== 6) dates.push(toIso(date));
  }

  const weeks = Map.groupBy(dates, weekKey);
  const earlyCount = Object.fromEntries(earlyOrder.map((teacher) => [teacher, 0]));
  const shortCount = Object.fromEntries(teachers.map((teacher) => [teacher, 0]));
  const longCount = Object.fromEntries(teachers.map((teacher) => [teacher, 0]));
  const classCount = Object.fromEntries(classOrder.map((className) => [className, 0]));
  const rows: DutyRow[] = [];
  let earlyCursor = 0;
  let classCursor = 0;

  for (const weekDates of weeks.values()) {
    const early = [...earlyOrder].sort((a, b) => earlyCount[a] - earlyCount[b] || circularTeacher(a, earlyCursor) - circularTeacher(b, earlyCursor))[0];
    earlyCount[early]++;
    earlyCursor = (earlyOrder.indexOf(early) + 1) % earlyOrder.length;

    const eligibleClasses = classOrder.filter((className) => classes[className].filter((teacher) => teacher !== early).length >= 2);
    const dutyClass = [...eligibleClasses].sort((a, b) => classCount[a] - classCount[b] || circularClass(a, classCursor) - circularClass(b, classCursor))[0];
    classCount[dutyClass]++;
    classCursor = (classOrder.indexOf(dutyClass) + 1) % classOrder.length;

    const longPair = classes[dutyClass]
      .filter((teacher) => teacher !== early)
      .sort((a, b) => longCount[a] - longCount[b] || teachers.indexOf(a) - teachers.indexOf(b))
      .slice(0, 2);
    longPair.forEach((teacher) => longCount[teacher]++);

    const shortDuty = teachers
      .filter((teacher) => teacher !== early && !longPair.includes(teacher))
      .sort((a, b) => shortCount[a] - shortCount[b] || teachers.indexOf(a) - teachers.indexOf(b))[0];
    shortCount[shortDuty]++;

    for (const date of weekDates) {
      rows.push({
        date,
        weekday: weekdays[localDate(date).getDay()],
        early,
        shortDuty,
        dutyClass,
        longDuty1: longPair[0],
        longDuty2: longPair[1],
        isHoliday: holidays.has(date),
      });
    }
  }
  return rows;
}

export function weekKey(iso: string) {
  const date = localDate(iso);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toIso(date);
}

function circularClass(name: string, cursor: number) { return (classOrder.indexOf(name) - cursor + classOrder.length) % classOrder.length; }
function circularTeacher(name: string, cursor: number) { return (earlyOrder.indexOf(name) - cursor + earlyOrder.length) % earlyOrder.length; }
function localDate(iso: string) { return new Date(`${iso}T12:00:00`); }
function toIso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
