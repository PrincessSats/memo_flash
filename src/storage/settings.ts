const SETTINGS_KEY = 'mm_settings';

export async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const obj = JSON.parse(raw);
    return key in obj ? obj[key] : fallback;
  } catch { return fallback; }
}

export async function saveSetting<T>(key: string, value: T) {
  try {
    let obj: Record<string, any> = {};
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) obj = JSON.parse(raw);
    obj[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
  } catch {}
}
