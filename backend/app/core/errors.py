from __future__ import annotations


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=404)


class ForbiddenError(AppError):
    def __init__(self, message: str = "forbidden") -> None:
        super().__init__(message, status_code=403)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "unauthorized") -> None:
        super().__init__(message, status_code=401)


class ConflictError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=409)


class ValidationError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=422)


class RateLimitError(AppError):
    def __init__(self, message: str = "too many requests") -> None:
        super().__init__(message, status_code=429)
