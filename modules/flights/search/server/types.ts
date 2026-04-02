export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UPSTREAM_ERROR"
  | "UNKNOWN_ERROR"

export interface ActionError {
  code: ActionErrorCode
  message: string
}

export type ActionResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: ActionError
    }

export function actionSuccess<T>(data: T): ActionResult<T> {
  return {
    ok: true,
    data,
  }
}

export function actionFailure<T>(
  code: ActionErrorCode,
  message: string
): ActionResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  }
}
