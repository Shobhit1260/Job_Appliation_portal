"""add email verification fields

Revision ID: aa8dc072e823
Revises: 9aa1e7f2f4b1
Create Date: 2026-04-09 23:04:03.587877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa8dc072e823'
down_revision: Union[str, Sequence[str], None] = '9aa1e7f2f4b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
