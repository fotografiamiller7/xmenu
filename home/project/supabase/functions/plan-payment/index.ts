// Import required dependencies
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanPaymentRequest {
  amount: number;
  customerData: {
    name: string;
    email: string;
    cpf: string;
  };
  storeApiKey: string;
  description: string;
  period_type: 'monthly' | 'annual';
}

// Function to generate a unique idempotency key
function generateIdempotencyKey() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, customerData, storeApiKey, description, period_type } = await req.json() as PlanPaymentRequest;

    // Validate required fields
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Valor inválido');
    }

    if (!customerData.name || !customerData.email || !customerData.cpf) {
      throw new Error('Dados do cliente incompletos');
    }

    if (!storeApiKey) {
      throw new Error('API key não configurada');
    }

    if (!period_type || !['monthly', 'annual'].includes(period_type)) {
      throw new Error('Tipo de período inválido');
    }

    // Format customer name
    const nameParts = customerData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Format CPF (remove any non-numeric characters)
    const cpf = customerData.cpf.replace(/\D/g, '');

    // Ensure amount has at most 2 decimal places
    const formattedAmount = Number(amount.toFixed(2));

    // Prepare payment data
    const paymentData = {
      transaction_amount: formattedAmount,
      description: description || 'Assinatura XMenu',
      payment_method_id: 'pix',
      payer: {
        email: customerData.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cpf
        },
        address: {
          zip_code: '06233200',
          street_name: 'Av. das Nações Unidas',
          street_number: '3003',
          neighborhood: 'Bonfim',
          city: 'Osasco',
          federal_unit: 'SP'
        }
      }
    };

    // Generate unique idempotency key
    const idempotencyKey = generateIdempotencyKey();

    console.log('Making request to Mercado Pago API:', {
      url: 'https://api.mercadopago.com/v1/payments',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storeApiKey}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: paymentData
    });

    // Make request to Mercado Pago API
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storeApiKey}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });

    console.log('Mercado Pago API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API error:', errorData);
      throw new Error(errorData.message || 'Erro ao gerar PIX');
    }

    const responseData = await response.json();
    console.log('Mercado Pago API response data:', responseData);

    if (!responseData.id) {
      throw new Error('Resposta de pagamento inválida');
    }

    // Add period_type to response data
    responseData.period_type = period_type;

    // Return the payment data
    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in plan payment function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro ao gerar o PIX'
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