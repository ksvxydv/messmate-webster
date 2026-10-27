// Central Developer Server Clock Simulation
// Allows presenters/developers to fast-forward or rewind server time during live demos.

declare global {
  var __MESSMATE_SERVER_TIME_OFFSET__: number | undefined;
}

export function getServerOffsetMs(): number {
  return globalThis.__MESSMATE_SERVER_TIME_OFFSET__ || 0;
}

export function setServerOffsetMs(offset: number): void {
  globalThis.__MESSMATE_SERVER_TIME_OFFSET__ = offset;
}

export function setSimulatedServerTime(targetDateIso: string): { simulatedNow: Date; offsetMs: number } {
  const targetTime = new Date(targetDateIso).getTime();
  const offset = targetTime - Date.now();
  globalThis.__MESSMATE_SERVER_TIME_OFFSET__ = offset;
  return { simulatedNow: new Date(targetTime), offsetMs: offset };
}

export function resetServerTime(): { simulatedNow: Date } {
  globalThis.__MESSMATE_SERVER_TIME_OFFSET__ = 0;
  return { simulatedNow: new Date() };
}

export function getServerNow(): Date {
  const offset = getServerOffsetMs();
  return new Date(Date.now() + offset);
}
