/*
# Add WhatsApp message and task comment columns to conversations

## Overview
Extends the conversations table to store the AI-generated WhatsApp message
and task manager comment alongside the existing summary and actions.

## Modified Tables
### conversations
- `whatsapp_message` (text, nullable) — AI-generated WhatsApp message ready
  to send to the client after a conversation.
- `task_comment` (text, nullable) — AI-generated task manager comment with
  structured action items, priority, and deadline.

## Security
- No policy changes needed — existing anon/authenticated CRUD policies
  already cover these new columns.
*/

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_message text,
  ADD COLUMN IF NOT EXISTS task_comment text;
