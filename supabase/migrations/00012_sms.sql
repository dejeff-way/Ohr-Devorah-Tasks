-- ============================================================
-- 00012_sms.sql
-- Ohr Devorah — SMS notification columns + audit log
-- ============================================================

-- 1. Add phone + SMS toggle to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. SMS audit log
CREATE TABLE IF NOT EXISTS public.sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  twilio_sid TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('broadcast', 'reminder', 'manual')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'undelivered')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs; staff can only see their own
CREATE POLICY "Admins can read all sms logs"
  ON public.sms_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can read own sms logs"
  ON public.sms_log FOR SELECT
  USING (recipient_id = auth.uid());

-- Only admins can insert (trigger SMS send)
CREATE POLICY "Admins can insert sms logs"
  ON public.sms_log FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));
