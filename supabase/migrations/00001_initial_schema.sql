-- Focustap: Initial Schema
-- Creates custom types, tables, and indexes for team features.

-- ── Enums ──

CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

-- ── Workspaces ──

CREATE TABLE workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);

-- ── Workspace Members ──

CREATE TABLE workspace_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role         member_role NOT NULL DEFAULT 'member',
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- ── Team Tasks ──

CREATE TABLE team_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    status      task_status NOT NULL DEFAULT 'todo',
    priority    INTEGER NOT NULL DEFAULT 0,
    due_date    DATE,
    created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    parent_id   UUID REFERENCES team_tasks(id) ON DELETE CASCADE,
    sort_order  REAL NOT NULL DEFAULT 0,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_tasks_workspace ON team_tasks(workspace_id);
CREATE INDEX idx_team_tasks_assigned ON team_tasks(assigned_to);
CREATE INDEX idx_team_tasks_status ON team_tasks(workspace_id, status);
CREATE INDEX idx_team_tasks_parent ON team_tasks(parent_id);
CREATE INDEX idx_team_tasks_due ON team_tasks(due_date);

-- ── Task Assignees ──

CREATE TABLE task_assignees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

-- ── Task Comments ──

CREATE TABLE task_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- ── Workspace Invites ──

CREATE TABLE workspace_invites (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    role         member_role NOT NULL DEFAULT 'member',
    invited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status       invite_status NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX idx_workspace_invites_status ON workspace_invites(status);

-- ── Updated-at trigger function ──

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at

CREATE TRIGGER set_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_team_tasks_updated_at
    BEFORE UPDATE ON team_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
