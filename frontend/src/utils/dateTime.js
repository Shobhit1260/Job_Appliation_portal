const INDIA_TIME_ZONE = 'Asia/Kolkata';

const normalizeBackendDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  const text = String(value);
  const hasTimezone = /[zZ]|[+\-]\d\d:\d\d$/.test(text);
  const normalizedValue = hasTimezone ? text : `${text.replace(' ', 'T')}Z`;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatIndiaDateTime = (value, options = {}) => {
  const date = normalizeBackendDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true,
    timeZone: INDIA_TIME_ZONE,
    ...options,
  }).format(date);
};

export const formatIndiaDate = (value, options = {}) => {
  const date = normalizeBackendDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: INDIA_TIME_ZONE,
    ...options,
  }).format(date);
};

export const formatIndiaRelative = (value) => {
  const date = normalizeBackendDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true,
    timeZone: INDIA_TIME_ZONE,
  }).format(date);
};

export const getIndiaTimeZone = () => INDIA_TIME_ZONE;