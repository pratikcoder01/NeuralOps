"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-06-02T09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Create Workspaces Table
    op.create_table(
        'workspaces',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=False),
        sa.Column('host_limit', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspaces_slug'), 'workspaces', ['slug'], unique=True)

    # 2. Create Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_workspace_id'), 'users', ['workspace_id'], unique=False)

    # 3. Create Hosts Table
    op.create_table(
        'hosts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('hostname', sa.String(length=255), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=False),
        sa.Column('cloud_provider', sa.String(length=50), nullable=False),
        sa.Column('region', sa.String(length=50), nullable=True),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('agent_version', sa.String(length=50), nullable=False),
        sa.Column('last_heartbeat', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hosts_hostname'), 'hosts', ['hostname'], unique=False)
    op.create_index(op.f('ix_hosts_workspace_id'), 'hosts', ['workspace_id'], unique=False)

    # 4. Create Incidents Table
    op.create_table(
        'incidents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('host_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('anomaly_type', sa.String(length=100), nullable=True),
        sa.Column('metric_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('llm_explanation', sa.Text(), nullable=True),
        sa.Column('root_cause_tags', postgresql.ARRAY(sa.String(length=100)), nullable=False),
        sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ttd_seconds', sa.Float(), nullable=True),
        sa.Column('ttr_seconds', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['host_id'], ['hosts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_incidents_host_id'), 'incidents', ['host_id'], unique=False)
    op.create_index(op.f('ix_incidents_workspace_id'), 'incidents', ['workspace_id'], unique=False)

    # 5. Create Remediation Actions Table
    op.create_table(
        'remediation_actions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('incident_id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('runbook_id', sa.UUID(), nullable=True),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('action_params', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('approval_required', sa.Boolean(), nullable=False),
        sa.Column('approved_by', sa.UUID(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('result_log', sa.Text(), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_remediation_actions_approved_by'), 'remediation_actions', ['approved_by'], unique=False)
    op.create_index(op.f('ix_remediation_actions_incident_id'), 'remediation_actions', ['incident_id'], unique=False)
    op.create_index(op.f('ix_remediation_actions_workspace_id'), 'remediation_actions', ['workspace_id'], unique=False)

    # 6. Create Audit Log Table
    op.create_table(
        'audit_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_user_id'), 'audit_log', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_log_workspace_id'), 'audit_log', ['workspace_id'], unique=False)

def downgrade() -> None:
    op.drop_table('audit_log')
    op.drop_table('remediation_actions')
    op.drop_table('incidents')
    op.drop_table('hosts')
    op.drop_table('users')
    op.drop_table('workspaces')
