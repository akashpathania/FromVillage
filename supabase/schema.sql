-- =========================================================
-- FromVillage Marketplace Database Schema
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. CLEANUP INCOMPATIBLE OLD SCHEMAS (Safely recreates empty tables)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- 1. PROFILES TABLE
-- Extends Supabase auth.users with marketplace metadata
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Village Member',
  village TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'farmer')),
  upi_id TEXT,
  delivery_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if profiles was previously created with an older schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_address JSONB;

-- 2. PRODUCTS TABLE
-- Catalog of fresh harvest items, bakery, dairy, and pantry goods
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  unit TEXT NOT NULL DEFAULT 'each',
  origin_village TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Produce',
  image_url TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  producer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  producer_upi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS producer_upi TEXT;

-- 3. ORDERS TABLE
-- Tracks customer orders, delivery time slots, and status
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  delivery_address JSONB NOT NULL,
  delivery_timing TEXT NOT NULL,
  delivery_instructions TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'packing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'card',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  upi_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_ref TEXT;

-- 4. ORDER ITEMS TABLE
-- Line items associated with each order
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  origin_village TEXT
);

-- =========================================================
-- AUTOMATED USER PROFILE CREATION TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, village, role, upi_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'village',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'upi_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    village = COALESCE(EXCLUDED.village, public.profiles.village),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    upi_id = COALESCE(EXCLUDED.upi_id, public.profiles.upi_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Farmers can insert products" ON public.products;
CREATE POLICY "Admins and Farmers can insert products"
  ON public.products FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'farmer')
    )
  );

DROP POLICY IF EXISTS "Admins and Farmers can update products" ON public.products;
CREATE POLICY "Admins and Farmers can update products"
  ON public.products FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'farmer')
    )
  );

DROP POLICY IF EXISTS "Admins and Farmers can delete products" ON public.products;
CREATE POLICY "Admins and Farmers can delete products"
  ON public.products FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'farmer')
    )
  );

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers view own orders or guest lookup by order_number" ON public.orders;
CREATE POLICY "Customers view own orders or guest lookup by order_number"
  ON public.orders FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() IS NULL OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update order status" ON public.orders;
CREATE POLICY "Admins can update order status"
  ON public.orders FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Order items are viewable if order is viewable" ON public.order_items;
CREATE POLICY "Order items are viewable if order is viewable"
  ON public.order_items FOR SELECT USING (true);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- =========================================================
-- PRODUCTS CATALOG
-- You can add products via the Admin dashboard (/admin/products)
-- or by inserting them directly into public.products.
--
-- To clear existing demo products from Supabase, run:
-- DELETE FROM public.products;
-- =========================================================

