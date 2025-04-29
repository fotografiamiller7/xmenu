import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Check, 
  Copy, 
  Receipt, 
  User, 
  CreditCard, 
  Loader2, 
  AlertTriangle, 
  Minus, 
  Plus, 
  Store, 
  ShoppingCart, 
  MapPin, 
  Phone, 
  Instagram, 
  ShoppingBag 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';

interface ProductLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  storeProfile: {
    store_name: string;
    plano: string;
    endereco?: string;
    telefone?: string;
  };
  themeColor: string;
  renderProductTags: (product: any) => React.ReactNode;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

export default function ProductLightbox({ 
  isOpen, 
  onClose, 
  product, 
  storeProfile,
  themeColor,
  renderProductTags 
}: ProductLightboxProps) {
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const { addToCart, items } = useCart();
  const [allowCart, setAllowCart] = useState(false);
  const isOutOfStock = product.quantity === 0;

  // Check if product is in cart
  const cartItem = items.find(item => item.id === product.id);
  const isInCart = Boolean(cartItem);

  useEffect(() => {
    const checkPlanFeatures = async () => {
      if (storeProfile.plano) {
        const { data: planFeatures } = await supabase
          .from('plan_features')
          .select('allow_cart')
          .eq('plan_id', storeProfile.plano)
          .single();

        if (planFeatures) {
          setAllowCart(planFeatures.allow_cart);
        }
      }
    };

    checkPlanFeatures();
  }, [storeProfile.plano]);

  if (!isOpen) return null;

  const handleQuantityChange = (value: number) => {
    // Ensure quantity is between 1 and available stock
    const newQuantity = Math.max(1, Math.min(product.quantity || 0, value));
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (quantity > product.quantity) {
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image_url: product.image_url
    });
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />

        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/2">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <Store className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>

            <div className="lg:w-1/2 p-6 lg:p-8">
              <div className="mb-2">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {product.name}
                  </h2>
                  {isInCart && (
                    <div 
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: `${themeColor}10`,
                        color: themeColor
                      }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>No carrinho</span>
                    </div>
                  )}
                </div>
                <span 
                  className="text-2xl font-bold"
                  style={{ color: themeColor }}
                >
                  {formatPrice(product.price)}
                </span>
              </div>

              <div className="mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantidade
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      max={product.quantity}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                      className="w-16 text-center px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    />
                    <span className="absolute right-2 text-xs text-gray-500">
                      / {product.quantity}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={quantity >= product.quantity}
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total:
                    </p>
                    <p 
                      className="text-lg font-bold"
                      style={{ color: themeColor }}
                    >
                      {formatPrice(product.price * quantity)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Área de descrição com barra de rolagem e borda */}
              {product.description && (
                <div className="mb-3 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {product.category && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoria
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {product.category}
                  </span>
                </div>
              )}

              {product.tags && product.tags.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </h3>
                  {renderProductTags(product)}
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Informações do Estabelecimento
                </h3>
                
                <div className="space-y-1">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {storeProfile.store_name}
                  </p>

                  {storeProfile.endereco && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{storeProfile.endereco}</span>
                    </div>
                  )}

                  {storeProfile.telefone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{storeProfile.telefone}</span>
                    </div>
                  )}
                </div>

                {!allowCart ? (
                  <div className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Compras indisponíveis neste estabelecimento</span>
                  </div>
                ) : product.quantity === 0 ? (
                  <div className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Produto indisponível</span>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-all relative overflow-hidden"
                    style={{ 
                      backgroundColor: themeColor,
                      '--tw-ring-color': `${themeColor}33`,
                    } as React.CSSProperties}
                  >
                    <div className={`flex items-center gap-2 transition-transform duration-200 ${showSuccess ? 'translate-y-full' : ''}`}>
                      <ShoppingCart className="w-5 h-5" />
                      <span className="font-medium">Adicionar ao carrinho</span>
                    </div>
                    <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-200 ${showSuccess ? '' : '-translate-y-full'}`}>
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Adicionado!</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
