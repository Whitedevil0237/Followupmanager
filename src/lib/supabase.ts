import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'followup-manager-auth',
  },
});

export type Client = {
  id: string;
  client_code: string;
  name: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  client_id: string;
  notes: string;
  ai_summary: string | null;
  ai_actions: string | null;
  whatsapp_message: string | null;
  task_comment: string | null;
  created_at: string;
  client?: Client;
};

export type Followup = {
  id: string;
  conversation_id: string;
  client_id: string;
  scheduled_date: string;
  time_slot: string;
  description: string;
  status: string;
  created_at: string;
  client?: Client;
};

export type FollowupStatus = 'SCHEDULED' | 'PENDING' | 'COMPLETED';

export type GenerateFollowupResult = {
  summary: string;
  actions: string;
  actionList: string[];
  suggestedDate: string;
  suggestedTime: string;
  topics: string[];
  whatsappMessage: string;
  taskComment: string;
};
