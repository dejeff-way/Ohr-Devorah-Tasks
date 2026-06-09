-- Fix: split conversations INSERT policy to avoid runtime eval of is_admin for non-broadcast types
-- If is_admin() triggers a recursion or error during policy evaluation, the entire WITH CHECK
-- can fail even when the first branch of an OR would short-circuit in normal SQL.

-- 1. Drop the combined policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- 2. Split into two independent policies (Postgres ORs permissive policies)
CREATE POLICY "Users can create dm or group conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (type IN ('dm', 'group'));

CREATE POLICY "Admins can create broadcast conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (type = 'broadcast' AND public.is_admin(auth.uid()));
