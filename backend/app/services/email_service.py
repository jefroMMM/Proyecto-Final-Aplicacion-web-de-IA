import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _smtp_value(value: str) -> str:
    return value.strip()


def _smtp_password() -> str:
    password = _smtp_value(settings.SMTP_PASSWORD)
    host = _smtp_value(settings.SMTP_HOST).lower()
    username = _smtp_value(settings.SMTP_USERNAME).lower()

    # Google shows app passwords grouped with spaces; SMTP auth expects the raw token.
    if host == "smtp.gmail.com" and username.endswith("@gmail.com"):
        return password.replace(" ", "")
    return password


def smtp_configured() -> bool:
    return bool(
        _smtp_value(settings.SMTP_HOST)
        and _smtp_value(settings.SMTP_USERNAME)
        and _smtp_password()
    )


async def send_candidate_interview_email(
    *,
    to_email: str,
    candidate_name: str,
    interview_url: str,
    token: str,
) -> bool:
    if not smtp_configured():
        logger.warning("SMTP is not configured; candidate interview email was not sent")
        return False

    subject = "Acceso a tu entrevista por voz"
    text_body = (
        f"Hola {candidate_name},\n\n"
        "Has sido invitado a realizar una entrevista por voz con IA.\n\n"
        f"Enlace: {interview_url}\n"
        f"Token: {token}\n\n"
        "Ingresa al enlace, valida el token y responde únicamente por voz.\n\n"
        "Saludos,\nRecursos Humanos"
    )
    html_body = f"""
    <p>Hola {candidate_name},</p>
    <p>Has sido invitado a realizar una entrevista por voz con IA.</p>
    <p><a href="{interview_url}">Abrir entrevista</a></p>
    <p><strong>Token:</strong> {token}</p>
    <p>Ingresa al enlace, valida el token y responde únicamente por voz.</p>
    <p>Saludos,<br/>Recursos Humanos</p>
    """

    try:
        await asyncio.to_thread(
            _send_email_sync,
            to_email=to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP authentication failed. If you use Gmail, configure an app password instead of the account password."
        )
        return False
    except smtplib.SMTPException as exc:
        logger.error("SMTP delivery failed: %s", exc)
        return False
    except OSError as exc:
        logger.error("SMTP connection failed: %s", exc)
        return False
    return True


def _send_email_sync(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    smtp_host = _smtp_value(settings.SMTP_HOST)
    smtp_username = _smtp_value(settings.SMTP_USERNAME)
    smtp_password = _smtp_password()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = _smtp_value(settings.SMTP_FROM_EMAIL) or smtp_username
    message["To"] = to_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    encryption = _smtp_value(settings.SMTP_ENCRYPTION).lower()
    if encryption == "ssl":
        with smtplib.SMTP_SSL(smtp_host, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(smtp_host, settings.SMTP_PORT, timeout=20) as server:
        server.ehlo()
        if encryption == "tls":
            server.starttls()
            server.ehlo()
        server.login(smtp_username, smtp_password)
        server.send_message(message)
