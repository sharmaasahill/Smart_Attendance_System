"""attendance: one row per user per day + date index

Adds a UniqueConstraint on (user_id, date) so duplicate attendance rows cannot
be created by two concurrent marks racing past the application-level
"already marked today" check, plus an index on (date) for the analytics and
admin date-filter queries.

Any pre-existing duplicate rows are collapsed first, otherwise adding the
constraint would fail. Resolution order:
  1. Drop 'absent' rows that have a 'present' row for the same user and day
     (the 'present' record is the meaningful one).
  2. Of whatever duplicates remain, keep the lowest id (earliest created).

Revision ID: 7c9e1f4b2a81
Revises: be4c008c9294
Create Date: 2026-09-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c9e1f4b2a81'
down_revision: Union[str, None] = 'be4c008c9294'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _collapse_duplicates() -> None:
    """Remove duplicate (user_id, date) attendance rows, keeping the best one."""
    bind = op.get_bind()

    before = bind.execute(sa.text("SELECT COUNT(*) FROM attendance")).scalar() or 0

    # 1. An 'absent' row is redundant when a 'present' row exists for the same
    #    user and day -- the person did show up.
    bind.execute(sa.text("""
        DELETE FROM attendance
        WHERE status <> 'present'
          AND EXISTS (
              SELECT 1 FROM attendance AS other
              WHERE other.user_id = attendance.user_id
                AND other.date    = attendance.date
                AND other.status  = 'present'
          )
    """))

    # 2. Collapse any remaining same-status duplicates to the earliest row.
    bind.execute(sa.text("""
        DELETE FROM attendance
        WHERE id NOT IN (
            SELECT MIN(id) FROM attendance GROUP BY user_id, date
        )
    """))

    after = bind.execute(sa.text("SELECT COUNT(*) FROM attendance")).scalar() or 0
    removed = before - after
    if removed:
        print(f"[migration 7c9e1f4b2a81] removed {removed} duplicate attendance row(s)")


def upgrade() -> None:
    _collapse_duplicates()

    # batch_alter_table so this also works on SQLite, which cannot ALTER a
    # table to add a constraint and needs a copy-and-rename instead.
    with op.batch_alter_table('attendance', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_attendance_user_date', ['user_id', 'date'])
        batch_op.create_index('ix_attendance_date', ['date'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('attendance', schema=None) as batch_op:
        batch_op.drop_index('ix_attendance_date')
        batch_op.drop_constraint('uq_attendance_user_date', type_='unique')
