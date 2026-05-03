// Deadline is a YYYY-MM-DD string. Registration is available *through* the
// end of that day in Eastern Time, so we close once the current EST date
// has rolled past it. Using en-CA gives us a YYYY-MM-DD that string-compares
// correctly and avoids DST edge cases from constructing a Date in EST.
export function isRegistrationClosed(deadline?: string): boolean {
  if (!deadline) return false;
  const todayEst = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  return todayEst > deadline;
}
