import { TRPCError } from '@trpc/server'

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof NotFoundError) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    })
  }
  if (error instanceof ValidationError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    })
  }
  if (error instanceof UnauthorizedError) {
    return new TRPCError({
      code: 'UNAUTHORIZED',
      message: error.message,
    })
  }
  if (error instanceof Error) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    })
  }
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  })
}
