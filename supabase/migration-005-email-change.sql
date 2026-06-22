-- ============================================================
-- Migration 005: Tabela de solicitações de troca de email
-- ============================================================

CREATE TABLE IF NOT EXISTS sm.sm_email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_change_user ON sm.sm_email_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_token ON sm.sm_email_change_requests(token);
