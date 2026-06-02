export function buildArticleText(item, asset) {
  const lines = [
    item.title || 'Headline',
    '',
    item.description || item.summary || '',
    '',
    item.source ? `Source: ${item.source}` : '',
    item.url ? `URL: ${item.url}` : '',
    asset ? `Asset context: ${asset}` : '',
    item.publishedAt || item.time
      ? `Published: ${new Date(item.publishedAt || item.time).toISOString()}`
      : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function copyArticle(item, asset) {
  const text = buildArticleText(item, asset);
  await navigator.clipboard.writeText(text);
  return text;
}

export function downloadArticle(item, asset) {
  const text = buildArticleText(item, asset);
  const slug = (item.title || 'headline')
    .slice(0, 48)
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mrkt-${slug || 'news'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
