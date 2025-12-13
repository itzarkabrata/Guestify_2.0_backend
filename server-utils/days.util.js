/**
 * Returns a Date that is N units ago from now
 * @param {number} value - number of units
 * @param {"days" | "hours" | "minutes"} unit - type of unit
 */
export function ago(value, unit = "days") {
  const msMap = {
    days: 24 * 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    minutes: 60 * 1000
  };

  return new Date(Date.now() - value * msMap[unit]);
}


export function getWeekRange(year, week) {
  // ISO week starts on Monday
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay(); // 0 = Sun, 1 = Mon, ...

  const weekStart = new Date(simple);
  if (dow <= 4) weekStart.setDate(simple.getDate() - (dow - 1));
  else weekStart.setDate(simple.getDate() + (8 - dow));

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const opt = { month: "short", day: "numeric" };

  return `${weekStart.toLocaleDateString("en-US", opt)} – ${weekEnd.toLocaleDateString("en-US", opt)}`;
}

export function getISOWeek(date) {
  const temp = new Date(date.valueOf());
  const day = (date.getDay() + 6) % 7;
  temp.setDate(temp.getDate() - day + 3);
  const firstThursday = temp.valueOf();
  temp.setMonth(0, 1);
  if (temp.getDay() !== 4) {
    temp.setMonth(0, 1 + ((4 - temp.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - temp) / 604800000);
}