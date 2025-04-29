import React from 'react';
import { Package } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import type { Product } from '../../types/store';

interface FeaturedProductsProps {
  products: Product[];
  themeColor: string;
  onSelectProduct: (product: Product) => void;
  renderProductTags: (product: Product) => React.ReactNode;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  products,
  themeColor,
  onSelectProduct,
  renderProductTags
}) => {
  return (
    <div id="produtos-destaque" className=" mt-3 mb-2 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
        Produtos em Destaque
      </h2>
      
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={24}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
        className="featured-products-swiper"
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <div
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full transform transition-transform hover:translate-y-0"
              onClick={() => onSelectProduct(product)}
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </h3>
                  <span className="text-lg font-bold" style={{ color: themeColor }}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(product.price)}
                  </span>
                </div>
                
                {renderProductTags(product)}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
