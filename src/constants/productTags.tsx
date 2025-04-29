import React from 'react';
import { Sparkles, AlertTriangle, Crown, Star, TrendingUp } from 'lucide-react';

export const PRODUCT_TAGS = [
  { 
    id: 'novidade', 
    label: 'Novidade', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
    icon: <Sparkles className="w-3 h-3" /> 
  },
  { 
    id: 'em-falta', 
    label: 'Em Falta', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', 
    icon: <AlertTriangle className="w-3 h-3" /> 
  },
  { 
    id: 'premium', 
    label: 'Premium', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', 
    icon: <Crown className="w-3 h-3" /> 
  },
  { 
    id: 'exclusivo', 
    label: 'Exclusivo', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
    icon: <Star className="w-3 h-3" /> 
  },
  { 
    id: 'mais-pedido', 
    label: 'Mais Pedido', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
    icon: <TrendingUp className="w-3 h-3" /> 
  },
] as const;