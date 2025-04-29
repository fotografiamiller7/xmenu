// Import required dependencies
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  planName: string;
  period: 'monthly' | 'annual';
}

// Function to format date in Brazilian format
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Function to format currency in Brazilian Real
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Function to send WhatsApp message
async function sendWhatsAppMessage(phone: string, message: string) {
  const baseUrl = "https://evolution-evolution.ejmqdi.easypanel.host";
  const apikey = "8394751027465QYWERTASDFGHJZL5678"; // API key should be in env vars in production
  const instanceName = "Eazy Listas";

  // Format phone number (ensure it starts with country code)
  let number = phone.replace(/\D/g, '');
  if (!number.startsWith('55')) {
    number = '55' + number;
  }
  // Ensure number is exactly 13 digits (55 + DDD + number)
  if (number.length !== 13) {
    throw new Error('Invalid phone number format. Must be 55 + DDD + number (13 digits total)');
  }

  const url = `${baseUrl}/message/sendText/${instanceName}`;
  
  console.log('Sending WhatsApp message:', {
    url,
    number,
    messageLength: message.length,
    apikey: apikey.substring(0, 8) + '****' // Log only part of the API key
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apikey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number,
        text: message
      })
    });

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid response from WhatsApp API');
    }

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${responseData.error || response.statusText}`);
    }

    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp API success response:', responseData);
    return responseData;
  } catch (error) {
    console.error('WhatsApp API error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log request details
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // Get and validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get raw body and log it
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    // Parse and validate request body
    let body: NotificationRequest;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid JSON in request body');
    }

    const { userId, planName, period } = body;

    if (!userId || !planName || !period) {
      throw new Error('Missing required fields: userId, planName, and period are required');
    }

    if (!['monthly', 'annual'].includes(period)) {
      throw new Error('Invalid period type. Must be either "monthly" or "annual"');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's profile and plan data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        name, 
        telefone,
        planosxmenu (
          name,
          price,
          features,
          description
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    if (!profile.telefone) {
      throw new Error('User phone number not found');
    }

    // Get subscription data
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('current_period_start, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      throw new Error(`Failed to fetch subscription: ${subscriptionError.message}`);
    }

    // Calculate price based on period
    const monthlyPrice = profile.planosxmenu.price;
    const price = period === 'annual' 
      ? monthlyPrice * 12 * 0.8 // 20% discount for annual
      : monthlyPrice;

    // Format dates
    const startDate = formatDate(new Date(subscription.current_period_start));
    const endDate = formatDate(new Date(subscription.current_period_end));

    // Create personalized message
    const message = `Olá ${profile.name}! 🎉

Seu plano foi atualizado com sucesso!

📦 Plano: ${planName}
💰 Valor: ${formatCurrency(price)}/${period === 'annual' ? 'ano' : 'mês'}
📅 Início: ${startDate}
📅 Validade: ${endDate}

✨ Principais recursos:
${profile.planosxmenu.features.map(f => `• ${f}`).join('\n')}

Agradecemos a preferência! Se precisar de ajuda, estamos à disposição. 😊`;

    // Log profile data (masking sensitive info)
    console.log('User profile data:', {
      name: profile.name,
      phone: profile.telefone.substring(0, 4) + '****' + profile.telefone.substring(-4)
    });

    // Send WhatsApp message
    await sendWhatsAppMessage(profile.telefone, message);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    // Log error details
    console.error('Error in whatsapp-notification function:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error sending WhatsApp notification',
        timestamp: new Date().toISOString()
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