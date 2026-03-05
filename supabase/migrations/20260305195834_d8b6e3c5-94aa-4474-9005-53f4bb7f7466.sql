
-- Tighten approval inserts: only bill creator can create initial approvals
DROP POLICY "System can insert approvals" ON public.approvals;
CREATE POLICY "Bill creators can insert approvals" ON public.approvals FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.bills WHERE id = bill_id AND created_by = auth.uid())
  OR public.has_role(auth.uid(), 'accounts')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'md')
);

-- Tighten audit log inserts: authenticated users involved in the bill
DROP POLICY "Insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = performed_by);

-- Tighten duplicate inserts
DROP POLICY "Insert duplicates" ON public.bill_duplicates;
CREATE POLICY "Bill creators can insert duplicates" ON public.bill_duplicates FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.bills WHERE id = duplicate_bill_id AND created_by = auth.uid())
);
