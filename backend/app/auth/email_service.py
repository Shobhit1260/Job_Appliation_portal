from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


def _smtp_sender_email() -> str | None:
    # Use SMTP_FROM_EMAIL when provided; fallback to SMTP_USER for common provider setups.
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    return from_email.strip() if isinstance(from_email, str) and from_email.strip() else None


def is_email_enabled() -> bool:
    smtp_host = settings.SMTP_HOST.strip() if isinstance(settings.SMTP_HOST, str) else settings.SMTP_HOST
    return bool(smtp_host and _smtp_sender_email())


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    if not is_email_enabled():
        return False

    sender_email = _smtp_sender_email()
    if not sender_email:
        return False

    message = MIMEMultipart("alternative")
    from_name = settings.SMTP_FROM_NAME or "Job Tracker"
    message["Subject"] = subject
    message["From"] = f"{from_name} <{sender_email}>"
    message["To"] = to_email

    message.attach(MIMEText(text_body, "plain"))
    if html_body:
        message.attach(MIMEText(html_body, "html"))

    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT

    try:
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)

        with server:
            server.ehlo()
            if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
                server.starttls()
                server.ehlo()

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.sendmail(sender_email, [to_email], message.as_string())
            return True
    except Exception:
        return False
