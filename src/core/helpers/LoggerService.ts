class LoggerService {
  public info(message: string, ...args: unknown[]) {
    console.info(message, args)
  }

  public error(message: string, ...args: unknown[]) {
    console.error(message, args)
  }

  public warn(message: string, ...args: unknown[]) {
    console.warn(message, args)
  }
}

export const logger = new LoggerService()
