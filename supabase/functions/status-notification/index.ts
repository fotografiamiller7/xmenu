// Import required dependencies
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusNotificationRequest {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  oldDeliveryStatus: string;
  newDeliveryStatus: string;
  reason?: string;
}

// Function to format date in Brazilian format
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Function to format currency in Brazilian Real
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Function to format delivery status
function formatDeliveryStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'entrega_pendente': 'Entrega Pendente',
    'em_preparacao': 'Em Preparação',
    'em_transito': 'Em Trânsito',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado'
  };
  return statusMap[status] || status;
}

// Function to get status emoji
function getStatusEmoji(status: string): string {
  const emojiMap: Record<string, string> = {
    'entrega_pendente': '⏳',
    'em_preparacao': '👨‍🍳',
    'em_transito': '🚚',
    'entregue': '✅',
    'cancelado': '❌'
  };
  return emojiMap[status] || '📦';
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
    let body: StatusNotificationRequest;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid JSON in request body');
    }

    const { orderId, oldDeliveryStatus, newDeliveryStatus, reason } = body;

    if (!orderId || !newDeliveryStatus) {
      throw new Error('Missing required fields: orderId and newDeliveryStatus are required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('pedidosxmenu')
      .select(`
        *,
        store:store_id (
          store_name,
          telefone
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (!order) {
      throw new Error('Order not found');
    }

    // Format order date
    const orderDate = formatDate(new Date(order.created_at));
    const updateDate = formatDate(new Date());

    // Create personalized message for customer
    const customerMessage = `🔔 Atualização do seu Pedido!

Olá ${order.customer_name.split(' ')[0]}, seu pedido teve uma atualização!

📦 Pedido #${order.payment_id}
🏪 Loja: ${order.store.store_name}
📅 Data do Pedido: ${orderDate}

${getStatusEmoji(newDeliveryStatus)} Status Atualizado:
${formatDeliveryStatus(oldDeliveryStatus)} ➡️ ${formatDeliveryStatus(newDeliveryStatus)}

🛒 Produtos:
${order.produtos.map((produto: any) => 
  `• ${produto.name} (${produto.quantity}x) - ${formatCurrency(produto.price * produto.quantity)}`
).join('\n')}

💰 Valor Total: ${formatCurrency(order.total_amount)}

${reason ? `\n📝 Observação:\n${reason}` : ''}

📍 Endereço de Entrega:
${order.customer_address}

Atualizado em: ${updateDate}

Agradecemos a preferência! 😊`;

    // Send WhatsApp message to customer
    await sendWhatsAppMessage(order.customer_phone, customerMessage);

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
    console.error('Error in status-notification function:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error sending status notification',
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