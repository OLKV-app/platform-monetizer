CREATE POLICY "Users cancel own subs"
ON public.subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_subscription_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public
AS $$
BEGIN
  IF private.is_trusted_ctx() OR private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.plan_id        := OLD.plan_id;
  NEW.transaction_id := OLD.transaction_id;
  NEW.start_date     := OLD.start_date;
  NEW.expiry_date    := OLD.expiry_date;
  NEW.user_id        := OLD.user_id;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_subscription_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_subscription_columns_trg ON public.subscriptions;
CREATE TRIGGER guard_subscription_columns_trg
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_columns();