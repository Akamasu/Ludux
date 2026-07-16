type LogContext = `[${string}]`

export const logger = {
  error(context: LogContext, error: unknown) {
    console.error(context, error)
  },
  info(context: LogContext, message: string) {
    console.info(context, message)
  },
}
