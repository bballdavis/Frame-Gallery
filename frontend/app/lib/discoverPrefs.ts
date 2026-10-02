// Which Discover sources the person wants to see. Stored as the sources switched OFF, so a
// source added later is on by default without anyone having to opt in.
const DISABLED_KEY = "discover.disabledSources";
const CUSTOMIZE_KEY = "discover.customizeSources";

export function getDisabledSources(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISABLED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function setDisabledSources(disabled: Set<string>) {
  try {
    window.localStorage.setItem(DISABLED_KEY, JSON.stringify([...disabled]));
  } catch {
    // Remembering is a convenience only.
  }
}

// Optional sources are the other way round: off until the person switches them on, so only
// the ones they chose are stored. These are the ones whose license is not verified (personal
// use) and the ones that need a key.
const FLAGGED_KEY = "discover.enabledFlaggedSources";

export function getEnabledFlaggedSources(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FLAGGED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function setEnabledFlaggedSources(enabled: Set<string>) {
  try {
    window.localStorage.setItem(FLAGGED_KEY, JSON.stringify([...enabled]));
  } catch {
    // Remembering is a convenience only.
  }
}

type Optional = { id: string; flagged?: boolean; credentials?: { configured: boolean } | null };

/** Whether a source starts switched off: personal-use ones, and ones that need a key. */
export function isOptional(source: Optional): boolean {
  return Boolean(source.flagged || source.credentials);
}

/** The sources to show: ordinary ones unless switched off; optional ones only if switched on, with their key saved. */
export function visibleSources<T extends Optional>(all: T[]): T[] {
  const off = getDisabledSources();
  const optionalOn = getEnabledFlaggedSources();
  return all.filter((s) => {
    if (!isOptional(s)) return !off.has(s.id);
    return optionalOn.has(s.id) && (!s.credentials || s.credentials.configured);
  });
}

/** Whether the per-source list is showing (the "all sources" switch is off). */
export function getCustomizeSources(): boolean {
  try {
    return window.localStorage.getItem(CUSTOMIZE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCustomizeSources(on: boolean) {
  try {
    window.localStorage.setItem(CUSTOMIZE_KEY, on ? "1" : "0");
  } catch {
    // Remembering is a convenience only.
  }
}
