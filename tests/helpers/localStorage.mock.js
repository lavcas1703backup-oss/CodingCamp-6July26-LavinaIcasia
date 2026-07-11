export function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) { return key in store ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; },
    get length() { return Object.keys(store).length; },
    key(n) { return Object.keys(store)[n] || null; },
    _getStore() { return store; },
  };
}
