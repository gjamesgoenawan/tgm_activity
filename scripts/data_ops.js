const DB_PATH = "db_output";

export async function listWeeks() {
  const weeks = await fetch(`${DB_PATH}/weeks.json`).then(res => res.json());
  return Object.keys(weeks).map(Number); // [0,1,2,...]
}

export async function latestWeek() {
  const weeks = await listWeeks();
  return Math.max(...weeks);
}

export async function getUpdateTime(weekNum) {
  const info = await readWeekInfo(weekNum);

  const day = String(info.date).padStart(2, "0");
  const month = String(info.month).padStart(2, "0");
  const year = String(info.year);

  return `${day}-${month}-${year}`;
}

export async function readAllianceStats(weekNum = null) {
  const stats = await fetch(`${DB_PATH}/alliance_stats.json`).then(res => res.json());
  if (weekNum === null) {
    const last = Math.max(...Object.keys(stats).map(Number));
    return { week: last, data: stats[last] };
  }
  return { week: weekNum, data: stats[weekNum] };
}

export async function readMemberStats(weekNum) {
  const json = await fetch(`${DB_PATH}/stats/week_${weekNum}.json`).then(r => r.json());
  return Object.entries(json).map(([id, vals]) => ({ id, ...vals }));
}

export async function readMembers() {
  return fetch(`${DB_PATH}/members.json`).then(r => r.json());
}

export async function readWeekInfo(weekNum) {
  const weeks = await fetch(`${DB_PATH}/weeks.json`).then(res => res.json());
  return weeks[weekNum];
}

export function formatNumber(val) {
  if (val === "-" || val === null || val === undefined) return "-";
  return Number(val).toLocaleString();
}