/*
# Make followups.conversation_id nullable

## Overview
Allows scheduling a follow-up/meeting without a prior conversation, so
users can plan a full day of meetings in advance and log the conversation
after the meeting happens.

## Modified Tables
### followups
- `conversation_id` — changed from NOT NULL to nullable. This lets a
  meeting be scheduled with just client + date + time, and the conversation
  can be logged later from the follow-up detail panel.

## Security
- No policy changes needed.
*/

ALTER TABLE followups ALTER COLUMN conversation_id DROP NOT NULL;
