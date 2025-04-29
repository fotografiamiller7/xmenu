// Import required dependencies
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRequest {
  paymentId: string;
  storeApiKey: string;
  storeId: string;
  orderData?: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string;
    customerAddress: string;
    customerNotes?: string;
    products: any[];
    totalAmount: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { paymentId, storeApiKey, storeId, orderData } = await req.json() as StatusRequest;

    if (!paymentId) {
      throw new Error('ID do pagamento não fornecido');
    }

    if (!storeApiKey) {
      throw new Error('Chave da API não fornecida');
    }

    if (!storeId) {
      throw new Error('ID da loja não fornecido');
    }

    console.log('Making request to Mercado Pago API:', {
      url: `https://api.mercadopago.com/v1/payments/${paymentId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeApiKey}`,
      }
    });

    // Make request to Mercado Pago API
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeApiKey}`,
      }
    });

    console.log('Mercado Pago API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API error:', errorData);
      throw new Error(errorData.message || 'Erro ao verificar status do pagamento');
    }

    const paymentData = await response.json();
    console.log('Mercado Pago API response data:', paymentData);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let orderId = null;

    // If payment is approved and we have order data, save to database
    if (paymentData.status === 'approved' && orderData) {
      // Validate required customer data
      if (!orderData.customerEmail?.trim()) {
        throw new Error('Email do cliente é obrigatório');
      }

      if (!orderData.customerName?.trim()) {
        throw new Error('Nome do cliente é obrigatório');
      }

      if (!orderData.customerPhone?.trim()) {
        throw new Error('Telefone do cliente é obrigatório');
      }

      if (!orderData.customerCpf?.trim()) {
        throw new Error('CPF do cliente é obrigatório');
      }

      if (!orderData.customerAddress?.trim()) {
        throw new Error('Endereço do cliente é obrigatório');
      }

      try {
        // Start a transaction
        const { data: order, error: insertError } = await supabase
          .from('pedidosxmenu')
          .insert([{
            payment_id: paymentId,
            store_id: storeId,
            establishment_id: storeId,
            customer_name: orderData.customerName.trim(),
            customer_email: orderData.customerEmail.trim(),
            customer_phone: orderData.customerPhone.trim(),
            customer_cpf: orderData.customerCpf.trim(),
            customer_address: orderData.customerAddress.trim(),
            customer_notes: orderData.customerNotes,
            total_amount: orderData.totalAmount,
            produtos: orderData.products,
            status: 'aprovado'
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Error saving order: ${insertError.message}`);
        }

        orderId = order.id;

        // Update product quantities
        for (const product of orderData.products) {
          // Get current product data
          const { data: currentProduct, error: getError } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', product.id)
            .single();

          if (getError) {
            throw new Error(`Failed to get product ${product.id}: ${getError.message}`);
          }

          if (!currentProduct) {
            throw new Error(`Product ${product.id} not found`);
          }

          if (currentProduct.quantity < product.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}`);
          }

          // Update quantity directly in the products table
          const { error: updateError } = await supabase
            .from('products')
            .update({
              quantity: currentProduct.quantity - product.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error('Update error:', updateError);
            throw new Error(`Failed to update quantity for product ${product.id}`);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to process order: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    }

    // Return the payment status and order ID if available
    return new Response(
      JSON.stringify({
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        orderId
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro ao verificar status do pagamento'
      }), 
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});