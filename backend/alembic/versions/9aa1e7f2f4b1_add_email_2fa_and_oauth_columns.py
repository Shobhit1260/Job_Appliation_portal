"""add email 2fa and oauth columns

Revision ID: 9aa1e7f2f4b1
Revises: efeea58e6057
Create Date: 2026-04-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9aa1e7f2f4b1"
down_revision: Union[str, Sequence[str], None] = "efeea58e6057"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("email_verification_code_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("email_verification_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("login_otp_code_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("login_otp_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("oauth_provider", sa.String(), nullable=True))

    op.alter_column("users", "email_verified", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "oauth_provider")
    op.drop_column("users", "login_otp_expires_at")
    op.drop_column("users", "login_otp_code_hash")
    op.drop_column("users", "email_verification_expires_at")
    op.drop_column("users", "email_verification_code_hash")
    op.drop_column("users", "email_verified")
