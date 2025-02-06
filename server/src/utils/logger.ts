/**
 * @fileoverview Logger utility for server-side logging.
 */

/**
 * Supported log levels.
 */
enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
  }
  
  /**
   * Structure for additional logging metadata.
   */
  interface LogMetadata {
    /** Service/component name */
    service?: string;
    /** Error details if present */
    error?: {
      name?: string;
      message?: string;
      stack?: string;
    };
    /** Additional context */
    [key: string]: unknown;
  }
  
  /**
   * Structure for a complete log entry.
   */
  interface LogEntry {
    /** ISO timestamp of the log entry */
    timestamp: string;
    /** Severity level of the log */
    level: LogLevel;
    /** Main log message */
    message: string;
    /** Additional structured data */
    metadata?: LogMetadata;
  }
  
  /**
   * Logger class providing structured logging capabilities.
   */
  class Logger {
    private readonly serviceName: string;
  
    /**
     * Creates a new Logger instance.
     * 
     * @param {string} serviceName - Name of the service using the logger
     */
    constructor(serviceName: string = 'DJ-XU-Server') {
      this.serviceName = serviceName;
    }
  
    /**
     * Creates a formatted log entry.
     * 
     * @param {LogLevel} level - Severity level
     * @param {string | Error} message - Log message or error object
     * @param {LogMetadata} [metadata] - Additional contextual information
     * @returns {LogEntry} Formatted log entry
     * @private
     */
    private createLogEntry(
      level: LogLevel,
      message: string | Error,
      metadata?: LogMetadata
    ): LogEntry {
      const baseMetadata: LogMetadata = {
        service: this.serviceName,
        ...metadata,
      };
  
      if (message instanceof Error) {
        baseMetadata.error = {
          name: message.name,
          message: message.message,
          stack: message.stack,
        };
      }
  
      return {
        timestamp: new Date().toISOString(),
        level,
        message: message instanceof Error ? message.message : message,
        metadata: baseMetadata,
      };
    }
  
    /**
     * Outputs a log entry to the console.
     * 
     * @param {LogEntry} entry - Log entry to output
     * @private
     */
    private output(entry: LogEntry): void {
      const { timestamp, level, message, metadata } = entry;
      
      const logMethod = {
        [LogLevel.ERROR]: console.error,
        [LogLevel.WARN]: console.warn,
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.log,
      }[level];
  
      logMethod(
        `[${timestamp}] ${level} ${this.serviceName}: ${message}`,
        metadata ? JSON.stringify(metadata, null, 2) : ''
      );
    }
  
    /**
     * Logs an informational message.
     * 
     * @param {string} message - Message to log
     * @param {LogMetadata} [metadata] - Additional context
     */
    info(message: string, metadata?: LogMetadata): void {
      this.output(this.createLogEntry(LogLevel.INFO, message, metadata));
    }
  
    /**
     * Logs a warning message.
     * 
     * @param {string} message - Message to log
     * @param {LogMetadata} [metadata] - Additional context
     */
    warn(message: string, metadata?: LogMetadata): void {
      this.output(this.createLogEntry(LogLevel.WARN, message, metadata));
    }
  
    /**
     * Logs an error message or Error object.
     * 
     * @param {string | Error} message - Error message or object
     * @param {LogMetadata} [metadata] - Additional context
     */
    error(message: string | Error, metadata?: LogMetadata): void {
      this.output(this.createLogEntry(LogLevel.ERROR, message, metadata));
    }
  
    /**
     * Logs a debug message in development environment.
     * 
     * @param {string} message - Message to log
     * @param {LogMetadata} [metadata] - Additional context
     */
    debug(message: string, metadata?: LogMetadata): void {
      if (process.env.NODE_ENV === 'development') {
        this.output(this.createLogEntry(LogLevel.DEBUG, message, metadata));
      }
    }
  }
  
  export const logger = new Logger();
  
  export function createLogger(serviceName: string): Logger {
    return new Logger(serviceName);
  }