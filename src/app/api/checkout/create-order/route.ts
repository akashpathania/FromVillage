import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      delivery_timing,
      delivery_instructions,
      payment_method = 'card',
      voucher_code,
      save_address_to_profile = false,
    } = body;

    // 1. Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your basket is empty.' }, { status: 400 });
    }

    if (!customer_name?.trim()) {
      return NextResponse.json({ error: 'Please provide your full name.' }, { status: 400 });
    }

    if (!customer_email?.trim() || !customer_email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!delivery_address?.street?.trim() || !delivery_address?.city?.trim() || !delivery_address?.zip?.trim()) {
      return NextResponse.json({ error: 'Please provide a complete delivery address (street, city, and ZIP).' }, { status: 400 });
    }

    // 2. Initialize Supabase SSR Server Client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in route handlers
            }
          },
        },
      }
    );

    // 3. Authenticate user if logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 4. Validate items & calculate trusted server subtotal
    const itemIds = items.map((i: any) => i.id).filter(Boolean);
    let subtotal = 0;
    const validatedItems: Array<{
      id?: string;
      title: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      image_url?: string;
      origin_village?: string;
    }> = [];

    // Attempt to fetch live products to verify prices & stock
    let dbProductsMap = new Map<string, { price: number; stock_quantity: number; is_available: boolean }>();
    if (itemIds.length > 0) {
      try {
        const { data: dbProducts } = await supabase
          .from('products')
          .select('id, price, stock_quantity, is_available')
          .in('id', itemIds);

        if (dbProducts) {
          dbProducts.forEach((p) => dbProductsMap.set(p.id, p));
        }
      } catch (err) {
        console.warn('Could not query products from database, falling back to client prices:', err);
      }
    }

    for (const item of items) {
      const dbProd = dbProductsMap.get(item.id);
      const unitPrice = dbProd ? Number(dbProd.price) : Number(item.price) || 0;
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const lineTotal = unitPrice * quantity;

      subtotal += lineTotal;
      validatedItems.push({
        id: item.id,
        title: item.title,
        quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
        image_url: item.image_url,
        origin_village: item.origin_village || item.farm || 'Village Sourced',
      });
    }

    // 5. Cost calculations
    const isVoucherValid = voucher_code && voucher_code.trim().toUpperCase() === 'HARVEST10';
    const discount = isVoucherValid ? subtotal * 0.10 : 0;
    const deliveryFee = subtotal >= 25 ? 0 : 4.99;
    const packagingFee = 1.50;
    const tax = (subtotal - discount) * 0.085;
    const total = Math.max(0, subtotal - discount + deliveryFee + packagingFee + tax);

    // 6. Generate unique order ID
    const orderNumber = `FV-${Math.floor(100000 + Math.random() * 900000)}`;
    const timingStr = delivery_timing === 'tomorrow-slot'
      ? 'Tomorrow Morning (8:00 AM – 10:00 AM)'
      : 'Today, 2:00 PM – 4:00 PM';

    // 7. Insert order into Supabase
    let createdOrderId: string | null = null;
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

    if (isSupabaseConfigured) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            user_id: user?.id || null,
            customer_name: customer_name.trim(),
            customer_email: customer_email.trim().toLowerCase(),
            customer_phone: customer_phone?.trim() || null,
            delivery_address: {
              street: delivery_address.street.trim(),
              apartment: delivery_address.apartment?.trim() || '',
              city: delivery_address.city.trim(),
              state: delivery_address.state?.trim() || 'CA',
              zip: delivery_address.zip.trim(),
              instructions: delivery_instructions?.trim() || delivery_address.instructions?.trim() || '',
            },
            delivery_timing: timingStr,
            delivery_instructions: delivery_instructions?.trim() || null,
            subtotal,
            delivery_fee: deliveryFee,
            tax,
            discount,
            total,
            status: 'confirmed',
            payment_method,
            payment_status: payment_method === 'cod' ? 'pending_arrival' : 'paid',
          },
        ])
        .select('id')
        .single();

      if (orderError) {
        console.error('Error inserting order in Supabase:', orderError);
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }

      createdOrderId = orderData?.id;

      // 8. Insert line items
      if (createdOrderId && validatedItems.length > 0) {
        const orderItemsToInsert = validatedItems.map((item) => ({
          order_id: createdOrderId,
          product_id: item.id && item.id.length === 36 ? item.id : null,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          image_url: item.image_url || null,
          origin_village: item.origin_village,
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
        if (itemsError) {
          console.error('Error inserting order_items:', itemsError);
        }
      }

      // 9. Decrement stock for inventory tracking
      for (const item of validatedItems) {
        if (item.id && dbProductsMap.has(item.id)) {
          const current = dbProductsMap.get(item.id)!;
          const newStock = Math.max(0, current.stock_quantity - item.quantity);
          await supabase
            .from('products')
            .update({
              stock_quantity: newStock,
              is_available: newStock > 0,
            })
            .eq('id', item.id);
        }
      }

      // 10. Optionally update user profile with saved address & phone
      if (user && save_address_to_profile) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: customer_name.trim(),
              phone: customer_phone?.trim() || undefined,
              delivery_address: {
                street: delivery_address.street.trim(),
                apartment: delivery_address.apartment?.trim() || '',
                city: delivery_address.city.trim(),
                state: delivery_address.state?.trim() || 'CA',
                zip: delivery_address.zip.trim(),
              },
            })
            .eq('id', user.id);
        } catch (profileErr) {
          console.warn('Could not update user profile address:', profileErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        orderId: orderNumber,
        order_number: orderNumber,
        id: createdOrderId || orderNumber,
        items: validatedItems,
        subtotal,
        deliveryFee,
        tax,
        discount,
        total,
        timing: timingStr,
        delivery_timing: timingStr,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        address: delivery_address,
        status: 'confirmed',
        payment_method,
        customer_name,
        customer_email,
      },
    });
  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred processing your order.' },
      { status: 500 }
    );
  }
}
