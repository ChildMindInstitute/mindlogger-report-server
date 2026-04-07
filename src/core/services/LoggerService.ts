import { createLogger, format, transports } from 'winston'

export const loggerOptions = {
  level: 'info',
  exitOnError: false,
  format: format.combine(format.errors({ stack: true }), format.json()),
  transports: [new transports.Console()],
}

export const logger = createLogger(loggerOptions)
