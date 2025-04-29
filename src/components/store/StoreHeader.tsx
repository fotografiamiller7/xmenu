import React from 'react';
import { Store, Phone, MapPin, Instagram, Moon, Sun, Share2, ShoppingBag, Search } from 'lucide-react';
import type { StoreProfile } from '../../types/store';

interface StoreHeaderProps {
  profile: StoreProfile;
  themeColor: string;
  itemCount: number;
  allowCart: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCart: () => void;
  onOpenOrderSearch: () => void;
  onShare: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  profile,
  themeColor,
  itemCount,
  allowCart,
  isDarkMode,
  onToggleDarkMode,
  onOpenCart,
  onOpenOrderSearch,
  onShare
}) => {
  return (
    <div className="relative h-[400px]">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        {profile.background_url ? (
          <img
            src={profile.background_url}
            alt={profile.store_name}
            className="w-full h-full object-cover scale-110 blur-[6px]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600" />
        )}
      </div>

      <div className="absolute inset-0 bg-black/40" />

      {/* Store info overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex-shrink-0">
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt={profile.store_name}
                className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/10 mx-auto border-4 border-white shadow-xl flex items-center justify-center">
                <Store className="w-16 h-16 text-white" />
              </div>
            )}
          </div>

          <div className="mt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {profile.store_name}
            </h1>
            
            <div className="store-contact-info">
              {profile.endereco && (
                <div className="store-contact-item">
                  <MapPin className="w-5 h-5" />
                  <span>{profile.endereco}</span>
                </div>
              )}
              
              {profile.telefone && (
                <div className="store-contact-item">
                  <Phone className="w-5 h-5" />
                  <span>{profile.telefone}</span>
                </div>
              )}
              
              {profile.instagram && (
                <div className="store-contact-item">
                  <Instagram className="w-5 h-5" />
                  <a
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {profile.instagram}
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {allowCart && (
                <>
                  <button
                    onClick={onOpenOrderSearch}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg transition-all duration-200 hover:bg-opacity-90 hover:shadow-lg hover:scale-105"
                    style={{ color: themeColor }}
                  >
                    <Search className="w-5 h-5" />
                    <span className="hidden sm:inline">Buscar Pedido</span>
                  </button>

                  <button
                    onClick={onOpenCart}
                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:bg-opacity-90 hover:shadow-lg hover:scale-105 relative"
                    style={{ backgroundColor: themeColor }}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="hidden sm:inline">Carrinho</span>
                    {itemCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={onToggleDarkMode}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg transition-all duration-200 hover:bg-opacity-90 hover:shadow-lg hover:scale-105"
                style={{ color: themeColor }}
                aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={onShare}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg transition-all duration-200 hover:bg-opacity-90 hover:shadow-lg hover:scale-105"
                style={{ color: themeColor }}
                aria-label="Compartilhar"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};