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
