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

// Function to validate CPF
function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  cpf = cpf.replace(/\D/g, '');

  // Check length
  if (cpf.length !== 11) return false;

  // Check for repeated digits
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let checkDigit1 = 11 - (sum % 11);
  if (checkDigit1 >= 10) checkDigit1 = 0;

  // Validate first check digit
  if (checkDigit1 !== parseInt(cpf.charAt(9))) return false;

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let checkDigit2 = 11 - (sum % 11);
  if (checkDigit2 >= 10) checkDigit2 = 0;

  // Validate second check digit
  return checkDigit2 === parseInt(cpf.charAt(10));
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

    // Log request data for debugging
    console.log('Payment request received:', {
      amount,
      customerEmail: customerData.email,
      period_type,
      timestamp: new Date().toISOString()
    });

    // Validate CPF first before proceeding
    if (!validateCPF(customerData.cpf)) {
      console.error('Invalid CPF detected:', {
        maskedCpf: customerData.cpf.substring(0, 3) + '***' + customerData.cpf.slice(-2)
      });

      return new Response(
        JSON.stringify({
          error: 'CPF inválido',
          code: 'INVALID_CPF'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // If amount is 0, return success without generating payment
    if (amount === 0) {
      return new Response(
        JSON.stringify({
          id: generateIdempotencyKey(), // Generate a unique ID for tracking
          status: 'approved',
          description: description || 'Plano Gratuito',
          transaction_amount: 0,
          point_of_interaction: {
            transaction_data: {
              qr_code: '',
              qr_code_base64: '',
              bank_info: {
                collector: {
                  account_holder_name: 'Sistema'
                }
              }
            }
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validate required fields for paid plans
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Valor inválido');
    }

    if (!customerData?.name || !customerData?.email) {
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get admin API key
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .select('apikey')
      .eq('email', 'admin@admin.com')
      .single();

    if (adminError || !adminData?.apikey) {
      throw new Error('Erro ao obter chave da API do administrador');
    }

    // Make request to Mercado Pago API
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminData.apikey}`, // Use admin API key
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API error:', errorData);
      throw new Error(errorData.message || 'Erro ao gerar PIX');
    }

    const responseData = await response.json();

    if (!responseData.id) {
      throw new Error('Resposta de pagamento inválida');
    }

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
    console.error('Error in payment function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error 
          ? error.message
          : 'Erro ao gerar o PIX',
        code: error instanceof Error && error.message.includes('CPF')
          ? 'INVALID_CPF'
          : 'PAYMENT_ERROR'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});