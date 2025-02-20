import { createLogger, format, transports } from 'winston'

export const loggerOptions = {
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [new transports.Console()],
}

export const logger = createLogger(loggerOptions)
