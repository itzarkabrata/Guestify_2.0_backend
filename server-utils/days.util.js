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