-- Focustap: Row-Level Security Policies
-- Enables RLS on all tables and defines granular access policies.

-- ── Helper: is_member_of_workspace ──

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Helper: workspace_role ──

CREATE OR REPLACE FUNCTION public.workspace_user_role(ws_id UUID)
RETURNS public.member_role AS $$
DECLARE
    user_role public.member_role;
BEGIN
    SELECT role INTO user_role
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Helper: can_manage_workspace (owner or admin) ──

CREATE OR REPLACE FUNCTION public.can_manage_workspace(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.workspace_user_role(ws_id) IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- 1. workspaces
-- ══════════════════════════════════════════════

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Members can view workspaces they belong to
CREATE POLICY workspaces_select_member ON workspaces
    FOR SELECT
    USING (public.is_workspace_member(id));

-- Creator can insert (they'll be added as owner via trigger)
CREATE POLICY workspaces_insert_creator ON workspaces
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

-- Owners and admins can update
CREATE POLICY workspaces_update_admin ON workspaces
    FOR UPDATE
    USING (public.can_manage_workspace(id))
    WITH CHECK (public.can_manage_workspace(id));

-- Only owner can delete
CREATE POLICY workspaces_delete_owner ON workspaces
    FOR DELETE
    USING (public.workspace_user_role(id) = 'owner');

-- ══════════════════════════════════════════════
-- 2. workspace_members
-- ══════════════════════════════════════════════

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can see the member list
CREATE POLICY members_select_member ON workspace_members
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Auto-insert when creating workspace (handled by trigger)
CREATE POLICY members_insert_self ON workspace_members
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND role = 'owner'
    );

-- Admins can insert new members
CREATE POLICY members_insert_admin ON workspace_members
    FOR INSERT
    WITH CHECK (public.can_manage_workspace(workspace_id));

-- Admins can update roles (but not demote owner)
CREATE POLICY members_update_admin ON workspace_members
    FOR UPDATE
    USING (public.can_manage_workspace(workspace_id))
    WITH CHECK (
        public.can_manage_workspace(workspace_id)
        AND (role IS DISTINCT FROM 'owner' OR role = 'owner')
    );

-- Admins can remove members (cannot remove owner)
CREATE POLICY members_delete_admin ON workspace_members
    FOR DELETE
    USING (
        public.can_manage_workspace(workspace_id)
        AND EXISTS (
            SELECT 1 FROM workspace_members wm2
            WHERE wm2.id = workspace_members.id
              AND wm2.role <> 'owner'
        )
    );

-- Members can leave
CREATE POLICY members_delete_self ON workspace_members
    FOR DELETE
    USING (user_id = auth.uid() AND role <> 'owner');

-- ══════════════════════════════════════════════
-- 3. team_tasks
-- ══════════════════════════════════════════════

ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;

-- Members can view all tasks in their workspace
CREATE POLICY tasks_select_member ON team_tasks
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Members can create tasks
CREATE POLICY tasks_insert_member ON team_tasks
    FOR INSERT
    WITH CHECK (
        public.is_workspace_member(workspace_id)
        AND created_by = auth.uid()
    );

-- Members can update tasks they created; admins can update any
CREATE POLICY tasks_update_member ON team_tasks
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR public.can_manage_workspace(workspace_id)
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        created_by = auth.uid()
        OR public.can_manage_workspace(workspace_id)
        OR assigned_to = auth.uid()
    );

-- Admins and creator can delete
CREATE POLICY tasks_delete_admin ON team_tasks
    FOR DELETE
    USING (
        created_by = auth.uid()
        OR public.can_manage_workspace(workspace_id)
    );

-- ══════════════════════════════════════════════
-- 4. task_assignees
-- ══════════════════════════════════════════════

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignees_select_member ON task_assignees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_tasks
            WHERE team_tasks.id = task_assignees.task_id
              AND public.is_workspace_member(team_tasks.workspace_id)
        )
    );

CREATE POLICY assignees_insert_admin ON task_assignees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_tasks
            WHERE team_tasks.id = task_assignees.task_id
              AND (
                  team_tasks.created_by = auth.uid()
                  OR public.can_manage_workspace(team_tasks.workspace_id)
              )
        )
    );

CREATE POLICY assignees_delete_admin ON task_assignees
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_tasks
            WHERE team_tasks.id = task_assignees.task_id
              AND (
                  team_tasks.created_by = auth.uid()
                  OR public.can_manage_workspace(team_tasks.workspace_id)
              )
        )
    );

-- ══════════════════════════════════════════════
-- 5. task_comments
-- ══════════════════════════════════════════════

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select_member ON task_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_tasks
            WHERE team_tasks.id = task_comments.task_id
              AND public.is_workspace_member(team_tasks.workspace_id)
        )
    );

CREATE POLICY comments_insert_member ON task_comments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM team_tasks
            WHERE team_tasks.id = task_comments.task_id
              AND public.is_workspace_member(team_tasks.workspace_id)
        )
    );

CREATE POLICY comments_update_author ON task_comments
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY comments_delete_author ON task_comments
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM team_tasks
            WHERE team_tasks.id = task_comments.task_id
              AND public.can_manage_workspace(team_tasks.workspace_id)
        )
    );

-- ══════════════════════════════════════════════
-- 6. workspace_invites
-- ══════════════════════════════════════════════

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view invites for their workspace
CREATE POLICY invites_select_admin ON workspace_invites
    FOR SELECT
    USING (public.can_manage_workspace(workspace_id));

-- The invited user can see their own pending invites
CREATE POLICY invites_select_invited ON workspace_invites
    FOR SELECT
    USING (
        status = 'pending'
        AND email = auth.email()
    );

-- Admins can create invites
CREATE POLICY invites_insert_admin ON workspace_invites
    FOR INSERT
    WITH CHECK (public.can_manage_workspace(workspace_id));

-- Admins can update invites (cancel/resend)
CREATE POLICY invites_update_admin ON workspace_invites
    FOR UPDATE
    USING (public.can_manage_workspace(workspace_id))
    WITH CHECK (public.can_manage_workspace(workspace_id));

-- Invited user can accept/decline (update status only)
CREATE POLICY invites_update_invited ON workspace_invites
    FOR UPDATE
    USING (email = auth.email() AND status = 'pending')
    WITH CHECK (
        email = auth.email()
        AND status IN ('accepted', 'declined')
    );

-- Admins can delete invites
CREATE POLICY invites_delete_admin ON workspace_invites
    FOR DELETE
    USING (public.can_manage_workspace(workspace_id));

-- ══════════════════════════════════════════════
-- Auto-join workspace creator as owner
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_workspace();
