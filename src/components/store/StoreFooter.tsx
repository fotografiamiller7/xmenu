import React from 'react';
import { Store, MessageCircle, Send } from 'lucide-react';
import type { StoreProfile } from '../../types/store';

interface StoreFooterProps {
  storeProfile: StoreProfile;
  planName: string;
  themeColor: string;
}

export const StoreFooter: React.FC<StoreFooterProps> = ({
  storeProfile,
  planName,
  themeColor
}) => {
  return (
    <>
      {/* CTA Footer for Basic Plan */}
      {(planName === 'Básico' || !planName) && (
        <div className="py-4 px-4 sm:px-6 lg:px-8 mt-12" style={{ backgroundColor: themeColor }}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold mb-2">Crie sua loja online</h3>
                <p className="text-sm text-white/90">
                  Tenha seu próprio catálogo digital com recursos profissionais
                </p>
              </div>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-opacity-90 rounded-lg transition-colors font-medium"
                style={{ color: themeColor }}
              >
                <Store className="w-5 h-5" />
                <span>Crie sua loja online grátis hoje mesmo</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Support Footer for Professional and Enterprise plans */}
      {planName && !['', 'Básico'].includes(planName) && (
        <div className="py-4 px-4 sm:px-6 lg:px-8 mt-12" style={{ backgroundColor: themeColor }}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-white">
              <span>Entre em contato com o estabelecimento para mais informações</span>
            </div>
            
            <div className="flex items-center gap-4">
              {storeProfile.telefone && (
                <a
                  href={`https://wa.me/${storeProfile.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${storeProfile.store_name} tudo bem? Gostaria de fazer um pedido.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-opacity-90 rounded-lg transition-colors"
                  style={{ color: themeColor }}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Suporte via WhatsApp</span>
                </a>
              )}
              
              {storeProfile.email && (
                <a
                  href={`mailto:${storeProfile.email}?subject=Pedido%20${storeProfile.store_name}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-opacity-90 rounded-lg transition-colors"
                  style={{ color: themeColor }}
                >
                  <Send className="w-5 h-5" />
                  <span>Suporte via Email</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};