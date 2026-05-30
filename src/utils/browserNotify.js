const STORAGE_KEY = 'insidr_browser_push';

export const isBrowserPushSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const isBrowserPushEnabled = () => {
  if (!isBrowserPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const requestBrowserPushPermission = async () => {
  if (!isBrowserPushSupported()) return false;
  if (Notification.permission === 'granted') {
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  const granted = result === 'granted';
  if (granted) localStorage.setItem(STORAGE_KEY, 'true');
  return granted;
};

export const disableBrowserPush = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const showBrowserNotification = (title, body, options = {}) => {
  if (!isBrowserPushEnabled()) return;
  try {
    const notification = new Notification(title || 'Insidr', {
      body: body || '',
      icon: '/ic_trending_up.svg',
      badge: '/ic_trending_up.svg',
      tag: options.tag || 'insidr-alert',
      ...options,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    /* ignore — some browsers block without user gesture */
  }
};
