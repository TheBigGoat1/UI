const KEY = 'mrkt_news_saved';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* quota */
  }
}

export function articleId(item) {
  return String(item.url || item.title || item.publishedAt || '').slice(0, 240);
}

export function isBookmarked(item) {
  const id = articleId(item);
  return readAll().some((x) => x.id === id);
}

export function toggleBookmark(item) {
  const id = articleId(item);
  const list = readAll();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeAll(list);
    return false;
  }
  list.unshift({
    id,
    title: item.title,
    summary: item.description || item.summary,
    url: item.url,
    publishedAt: item.publishedAt || item.time,
    source: item.source,
    savedAt: new Date().toISOString(),
  });
  writeAll(list);
  return true;
}

export function getBookmarks() {
  return readAll();
}
