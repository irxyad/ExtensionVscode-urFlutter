export class AppError extends Error {
  constructor(message: string, cause?: unknown) {
    const causeMsg = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
    super(causeMsg ? `${message}: ${causeMsg}` : message);
    this.name = 'AppError';
  }
}
