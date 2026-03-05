
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('employee', 'accounts', 'manager', 'md');

-- Create enum for bill status
CREATE TYPE public.bill_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for bill category
CREATE TYPE public.bill_category AS ENUM ('travel', 'office_supplies', 'meals', 'equipment', 'software', 'utilities', 'marketing', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create bills table
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  bill_date DATE NOT NULL,
  category bill_category NOT NULL DEFAULT 'other',
  description TEXT,
  bill_image_path TEXT,
  status bill_status NOT NULL DEFAULT 'pending',
  ocr_confidence NUMERIC(3, 2) DEFAULT 0,
  ocr_extracted_data JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Create approvals table
CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  approver_role app_role NOT NULL,
  approver_user_id UUID REFERENCES auth.users(id),
  status approval_status NOT NULL DEFAULT 'pending',
  sequence_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  comments TEXT,
  action_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) NOT NULL,
  user_role app_role,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create bill_duplicates table
CREATE TABLE public.bill_duplicates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  duplicate_bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  detection_method TEXT NOT NULL,
  justification TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_duplicates ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  -- Default role: employee
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read all profiles, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: viewable by authenticated users
CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Bills: employees see own, accounts/manager/md see all
CREATE POLICY "Employees see own bills" ON public.bills FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'accounts')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'md')
);

CREATE POLICY "Authenticated users can create bills" ON public.bills FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Bill owners and approvers can update" ON public.bills FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'accounts')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'md')
);

-- Approvals: viewable by bill creator or approvers
CREATE POLICY "View approvals" ON public.approvals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Approvers can update approvals" ON public.approvals FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'accounts')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'md')
);

CREATE POLICY "System can insert approvals" ON public.approvals FOR INSERT TO authenticated
WITH CHECK (true);

-- Audit logs: viewable by all authenticated
CREATE POLICY "View audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Bill duplicates
CREATE POLICY "View duplicates" ON public.bill_duplicates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert duplicates" ON public.bill_duplicates FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for bill images
INSERT INTO storage.buckets (id, name, public) VALUES ('bill-images', 'bill-images', true);

CREATE POLICY "Authenticated users can upload bill images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bill-images');

CREATE POLICY "Anyone can view bill images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bill-images');

CREATE POLICY "Users can update their bill images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bill-images');
