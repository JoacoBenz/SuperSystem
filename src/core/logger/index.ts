type LogLevel = 'info' | 'warn' | 'error';
type LogCategory = 'security' | 'api' | 'notification' | 'audit' | 'system';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  event: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, category: LogCategory, event: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    category,
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (category: LogCategory, event: string, data?: Record<string, unknown>) =>
    log('info', category, event, data),
  warn: (category: LogCategory, event: string, data?: Record<string, unknown>) =>
    log('warn', category, event, data),
  error: (category: LogCategory, event: string, data?: Record<string, unknown>) =>
    log('error', category, event, data),
};
