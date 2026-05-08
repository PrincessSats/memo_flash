let counter = 0;
export function v4(): string {
  // not real uuid but good enough for offline local storage
  counter++;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${counter}`;
}
