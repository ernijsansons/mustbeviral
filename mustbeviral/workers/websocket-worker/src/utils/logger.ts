// Logger utility for WebSocket Worker
// Provides structured logging with different levels

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: unknown;
  requestId?: string;
}

export class Logger {
  private service: string;
  private logLevel: LogLevel;
  private logLevels: Record<LogLevel, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3
  };

  constructor(service: string, logLevel: string = 'INFO') {
    this.service = service;
    this.logLevel = (logLevel.toUpperCase() as LogLevel)  ?? 'INFO';
  }

  debug(message: string, data?: unknown): void {
    this.log('DEBUG', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('ERROR', message, data);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (this.logLevels[level] < this.logLevels[this.logLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      data
    };

    console.log(JSON.stringify(entry));
  }

  child(additionalData: unknown): Logger {
    const childLogger = new Logger(this.service, this.logLevel);

    // Override log method to include additional data
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, data?: unknown) => {
      const mergedData = { ...additionalData, ...data };
      originalLog(level, message, mergedData);
    };

    return childLogger;
  }
}