class AppError(Exception):
    """Base application exception."""


class MissingProviderCredentialError(AppError):
    """Raised when a required provider API key is missing."""


class ProviderRequestError(AppError):
    """Raised when an external provider request fails."""
