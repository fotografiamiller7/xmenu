export interface Customer {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  orders_count: number;
}

export interface TopSellingProduct {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  total_value: number;
  image_url: string | null;
}