export interface Product {
  id: string;
  title: string;
  origin_village: string;
  price: number;
  unit: string;
  description?: string;
  image_url: string;
  category?: string;
  producer_id?: string;
  producer_upi?: string;
}
