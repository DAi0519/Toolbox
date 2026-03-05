const HEADER_SAFE_VALUE_PATTERN = /^[\x21-\x7E]+$/;

export function normalizeApiKey(raw: string): string {
  return raw
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, '');
}

export function validateApiKey(raw: string): string | null {
  const value = normalizeApiKey(raw);

  if (!value) return '请输入 API Key';
  if (!HEADER_SAFE_VALUE_PATTERN.test(value)) return 'API Key 包含非法字符，请重新粘贴纯文本 Key';

  return null;
}
