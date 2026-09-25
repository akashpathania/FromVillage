import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  unit: string;
  origin_village: string;
  quantity: number;
  image_url?: string;
  farm?: string;
  tag?: string;
  details?: string;
  producer_id?: string;
  producer_upi?: string;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: [],
      addToCart: (item) =>
        set((state) => {
          const exists = state.cart.find((i) => i.id === item.id);
          if (exists) {
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        }),
      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),
      updateQuantity: (id, delta) =>
        set((state) => ({
          cart: state.cart
            .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
            .filter((i) => i.quantity > 0),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'village_bazaar_cart',
    }
  )
);