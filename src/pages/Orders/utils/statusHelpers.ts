export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'aprovado':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'rejeitado':
    case 'cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'finalizado':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const getDeliveryStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'entrega_pendente':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'em_preparacao':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'em_transito':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'entregue':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const formatDeliveryStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'entrega_pendente':
      return 'Entrega Pendente';
    case 'em_preparacao':
      return 'Em Preparação';
    case 'em_transito':
      return 'Em Trânsito';
    case 'entregue':
      return 'Entregue';
    case 'cancelado':
      return 'Cancelado';
    default:
      return status;
  }
};

export const getStatusEmoji = (status: string) => {
  switch (status.toLowerCase()) {
    case 'entrega_pendente':
      return '⏳';
    case 'em_preparacao':
      return '👨‍🍳';
    case 'em_transito':
      return '🚚';
    case 'entregue':
      return '✅';
    case 'cancelado':
      return '❌';
    default:
      return '📦';
  }
};