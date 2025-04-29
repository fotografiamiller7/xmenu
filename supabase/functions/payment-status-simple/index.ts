// Import required dependencies
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRequest {
  paymentId: string;
  storeApiKey: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { paymentId, storeApiKey } = await req.json() as StatusRequest;

    // Validate required fields
    if (!paymentId) {
      throw new Error('ID do pagamento não fornecido');
    }

    if (!storeApiKey) {
      throw new Error('Chave da API não fornecida');
    }

    // Make request to Mercado Pago API
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeApiKey}`,
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao verificar status do pagamento');
    }

    const paymentData = await response.json();
    
    // Return the payment status
    return new Response(
      JSON.stringify({
        status: paymentData.status,
        status_detail: paymentData.status_detail
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