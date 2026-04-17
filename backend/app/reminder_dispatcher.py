import asyncio
import logging
from datetime import datetime

from app.auth.email_service import is_email_enabled, send_email
from app.cache_utils import invalidate_cache
from app.database import Session
from app.models import Application, Reminder, User

logger = logging.getLogger(__name__)


POLL_INTERVAL_SECONDS = 30
MAX_BATCH_SIZE = 100


def _build_reminder_email(reminder: Reminder, application: Application | None) -> tuple[str, str, str]:
    subject = f"Reminder: {reminder.title}"

    app_line = "General reminder"
    if application is not None:
        app_line = f"{application.company_name} - {application.role}"

    remind_at_text = reminder.remind_at.strftime("%Y-%m-%d %H:%M UTC")

    text_body = (
        f"You have a reminder due now.\n\n"
        f"Title: {reminder.title}\n"
        f"Application: {app_line}\n"
        f"Scheduled Time: {remind_at_text}\n"
    )

    html_body = (
        "<p>You have a reminder due now.</p>"
        f"<p><strong>Title:</strong> {reminder.title}</p>"
        f"<p><strong>Application:</strong> {app_line}</p>"
        f"<p><strong>Scheduled Time:</strong> {remind_at_text}</p>"
    )

    return subject, text_body, html_body


async def dispatch_due_reminders_once() -> int:
    if not is_email_enabled():
        return 0

    db = Session()
    sent_count = 0
    cache_users: set[str] = set()

    try:
        now_utc = datetime.utcnow()

        due_rows = (
            db.query(Reminder, User, Application)
            .join(User, Reminder.user_id == User.id)
            .outerjoin(Application, Reminder.application_id == Application.id)
            .filter(Reminder.is_sent.is_(False), Reminder.remind_at <= now_utc)
            .order_by(Reminder.remind_at.asc())
            .limit(MAX_BATCH_SIZE)
            .all()
        )

        for reminder, user, application in due_rows:
            if not user.email:
                continue

            subject, text_body, html_body = _build_reminder_email(reminder, application)
            sent = send_email(user.email, subject, text_body, html_body)

            if sent:
                reminder.is_sent = True
                sent_count += 1
                cache_users.add(str(user.id))

        if sent_count > 0:
            db.commit()

            for user_id in cache_users:
                await invalidate_cache(pattern=f"reminder:list:{user_id}:*")

            logger.info("Reminder dispatcher sent %s reminder email(s)", sent_count)

        return sent_count
    except Exception:
        db.rollback()
        logger.exception("Reminder dispatcher failed while processing due reminders")
        return 0
    finally:
        db.close()


async def run_reminder_dispatcher(stop_event: asyncio.Event) -> None:
    logger.info("Reminder dispatcher started")
    smtp_warning_logged = False

    while not stop_event.is_set():
        try:
            if not is_email_enabled() and not smtp_warning_logged:
                logger.warning("Reminder dispatcher running but SMTP is not configured; reminder emails will not be sent")
                smtp_warning_logged = True
            elif is_email_enabled() and smtp_warning_logged:
                smtp_warning_logged = False

            await dispatch_due_reminders_once()
        except Exception:
            logger.exception("Reminder dispatcher loop error")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=POLL_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            continue

    logger.info("Reminder dispatcher stopped")
