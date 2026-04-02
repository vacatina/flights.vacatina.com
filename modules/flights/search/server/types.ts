export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UPSTREAM_ERROR"
  | "UNKNOWN_ERROR"

export type ActionFieldErrors = Record<string, string>

export interface ActionError {
  code: ActionErrorCode
  message: string
  fieldErrors?: ActionFieldErrors
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
  message: string,
  fieldErrors?: ActionFieldErrors
): ActionResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      fieldErrors,
    },
  }
}
