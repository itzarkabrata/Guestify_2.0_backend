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