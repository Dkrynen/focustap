-- Calendar Integration: cross-device sync for calendar event links
-- Tokens stay local-only (per-device OAuth). Only event links sync cross-device.

CREATE TABLE IF NOT EXISTS calendar_event_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    team_task_id UUID REFERENCES team_tasks(id) ON DELETE SET NULL,
    local_task_id INTEGER,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'microsoft')),
    external_event_id TEXT NOT NULL,
    calendar_id TEXT,
    etag TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_direction TEXT NOT NULL DEFAULT 'bidirectional'
        CHECK(sync_direction IN ('bidirectional', 'local_to_remote', 'remote_to_local')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, external_event_id, user_id)
);

ALTER TABLE calendar_event_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their calendar event links"
    ON calendar_event_links FOR ALL
    USING (user_id = auth.uid());

CREATE INDEX idx_cal_links_team_task ON calendar_event_links(team_task_id);
CREATE INDEX idx_cal_links_user_provider ON calendar_event_links(user_id, provider);

-- Update updated_at on modification
CREATE OR REPLACE FUNCTION update_cal_link_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cal_link_updated_at
    BEFORE UPDATE ON calendar_event_links
    FOR EACH ROW
    EXECUTE FUNCTION update_cal_link_timestamp();
