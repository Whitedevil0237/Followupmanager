/*
# FollowUpManager — Schema for AI Client Relations Platform

## Overview
Creates the data model for a client relations dashboard where users log
conversations with clients and generate AI-suggested follow-up actions.

## New Tables

### clients
Stores client records referenced by user-entered client codes.
- `id` (uuid, primary key)
- `client_code` (text, not null, unique) — the user-entered client identifier
- `name` (text, not null) — client display name
- `created_at` (timestamptz, default now)

### conversations
Logs every conversation a user has with a client, including the raw notes
and the AI-generated summary + suggested actions.
- `id` (uuid, primary key)
- `client_id` (uuid, FK to clients, ON DELETE CASCADE)
- `notes` (text, not null) — raw "what we talked about" notes
- `ai_summary` (text) — AI-generated conversation summary
- `ai_actions` (text) — AI-suggested follow-up actions (newline-delimited)
- `created_at` (timestamptz, default now)

### followups
Scheduled follow-up items derived from conversations, pinned to a date and
time slot with a status badge.
- `id` (uuid, primary key)
- `conversation_id` (uuid, FK to conversations, ON DELETE CASCADE)
- `client_id` (uuid, FK to clients, ON DELETE CASCADE)
- `scheduled_date` (date, not null) — the date the follow-up is scheduled for
- `time_slot` (text, not null) — e.g. "10:00 AM"
- `description` (text, not null) — what the follow-up is about
- `status` (text, not null, default 'SCHEDULED') — SCHEDULED | PENDING | COMPLETED
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on all three tables.
- Single-tenant app (no sign-in): policies use `TO anon, authenticated` so
  the anon-key frontend can read and write all data.
- `USING (true)` / `WITH CHECK (true)` is acceptable here because the data
  is intentionally shared/public across the single workspace.

## Indexes
- `conversations.client_id` — frequent lookups by client
- `followups.client_id` — filter follow-ups by client
- `followups.scheduled_date` — filter follow-ups by date (calendar view)
- `followups.status` — filter by status badge
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notes text NOT NULL,
  ai_summary text,
  ai_actions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_conversations" ON conversations;
CREATE POLICY "anon_select_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_conversations" ON conversations;
CREATE POLICY "anon_delete_conversations" ON conversations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  time_slot text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'SCHEDULED',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_followups" ON followups;
CREATE POLICY "anon_select_followups" ON followups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_followups" ON followups;
CREATE POLICY "anon_insert_followups" ON followups FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_followups" ON followups;
CREATE POLICY "anon_update_followups" ON followups FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_followups" ON followups;
CREATE POLICY "anon_delete_followups" ON followups FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_followups_client_id ON followups(client_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled_date ON followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
