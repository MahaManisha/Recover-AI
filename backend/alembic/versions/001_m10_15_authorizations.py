"""M10.15 Backend Authorization & Execution Provenance Migration

Revision ID: 001_m10_15_authorizations
Revises: 
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_m10_15_authorizations'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Create recovery_authorizations table
    op.create_table(
        'recovery_authorizations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('authorization_proof_hash', sa.String(length=64), nullable=False),
        sa.Column('merchant_id', sa.String(length=255), nullable=False),
        sa.Column('case_id', sa.String(length=255), nullable=False),
        sa.Column('activity_id', sa.String(length=255), nullable=False),
        sa.Column('proposal_option_id', sa.String(length=100), nullable=False),
        sa.Column('proposal_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('operator_actor_id', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ISSUED'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recovery_authorizations_id', 'recovery_authorizations', ['id'])
    op.create_index('ix_recovery_authorizations_proof_hash', 'recovery_authorizations', ['authorization_proof_hash'])
    op.create_index('ix_recovery_authorizations_merchant_id', 'recovery_authorizations', ['merchant_id'])
    op.create_index('ix_recovery_authorizations_case_id', 'recovery_authorizations', ['case_id'])
    op.create_index('ix_recovery_authorizations_activity_id', 'recovery_authorizations', ['activity_id'])

    # 2. Create idempotency_keys table
    op.create_table(
        'idempotency_keys',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('merchant_id', sa.String(length=255), nullable=False),
        sa.Column('operator_actor_id', sa.String(length=255), nullable=False),
        sa.Column('request_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PROCESSING'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('merchant_id', 'operator_actor_id', 'idempotency_key', name='uix_merchant_operator_idempotency')
    )
    op.create_index('ix_idempotency_keys_id', 'idempotency_keys', ['id'])
    op.create_index('ix_idempotency_keys_key', 'idempotency_keys', ['idempotency_key'])
    op.create_index('ix_idempotency_keys_merchant_id', 'idempotency_keys', ['merchant_id'])
    op.create_index('ix_idempotency_keys_operator_actor_id', 'idempotency_keys', ['operator_actor_id'])

    # 3. Add columns to recovery_events table if not existing
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if inspector.has_table("recovery_events"):
        existing_cols = [c['name'] for c in inspector.get_columns('recovery_events')]
        with op.batch_alter_table('recovery_events') as batch_op:
            if 'server_authorization_id' not in existing_cols:
                batch_op.add_column(sa.Column('server_authorization_id', sa.String(length=36), nullable=True))
                batch_op.create_foreign_key('fk_recovery_events_server_auth', 'recovery_authorizations', ['server_authorization_id'], ['id'])
            if 'execution_provenance_id' not in existing_cols:
                batch_op.add_column(sa.Column('execution_provenance_id', sa.String(length=36), nullable=True))
            if 'authorization_audit_id' not in existing_cols:
                batch_op.add_column(sa.Column('authorization_audit_id', sa.String(length=255), nullable=True))
            if 'handoff_audit_id' not in existing_cols:
                batch_op.add_column(sa.Column('handoff_audit_id', sa.String(length=255), nullable=True))
            if 'operator_actor_id' not in existing_cols:
                batch_op.add_column(sa.Column('operator_actor_id', sa.String(length=255), nullable=True))
            if 'idempotency_key' not in existing_cols:
                batch_op.add_column(sa.Column('idempotency_key', sa.String(length=255), nullable=True))
                batch_op.create_index('ix_recovery_events_idempotency_key', ['idempotency_key'])

def downgrade() -> None:
    with op.batch_alter_table('recovery_events') as batch_op:
        batch_op.drop_constraint('fk_recovery_events_server_auth', type_='foreignkey')
        batch_op.drop_index('ix_recovery_events_idempotency_key')
        batch_op.drop_column('idempotency_key')
        batch_op.drop_column('operator_actor_id')
        batch_op.drop_column('handoff_audit_id')
        batch_op.drop_column('authorization_audit_id')
        batch_op.drop_column('execution_provenance_id')
        batch_op.drop_column('server_authorization_id')

    op.drop_table('idempotency_keys')
    op.drop_table('recovery_authorizations')
