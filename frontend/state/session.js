const KEY = 'clinicaHans.session';

let current = load();

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const session = {
  get() { return current; },
  set(value) {
    current = value;
    sessionStorage.setItem(KEY, JSON.stringify(value));
  },
  clear() {
    current = null;
    sessionStorage.removeItem(KEY);
  },
  hasRole(role) {
    return Boolean(current?.roles?.includes(role));
  },
  hasAnyRole(...roles) {
    return roles.some(role => this.hasRole(role));
  }
};
