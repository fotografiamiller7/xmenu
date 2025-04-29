import React from 'react';
import type { Product } from '../types/store';
import { formatPrice } from '../utils/format';

interface ProductComparisonProps {
  products: Product[];
  onClose: () => void;
}

const ProductComparison: React.FC<ProductComparisonProps> = ({ products, onClose }) => {
  if (products.length < 2) {
    return null; // Exiba algo opcional aqui, se quiser
  }

  // Reúne todas as chaves de especificações de todos os produtos
  const allSpecs = Array.from(
    new Set(products.flatMap(product => Object.keys(product.specifications || {})))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Conteúdo do modal */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-5xl relative">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
        >
          X
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Comparação de Produtos
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {/* Primeira coluna: título da linha (Especificação) */}
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-left w-40">
                  Especificação
                </th>
                {/* Demais colunas: nomes dos produtos */}
                {products.map(product => (
                  <th
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700 text-left"
                  >
                    {product.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Linha para a Imagem */}
              <tr>
                <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                  Imagem
                </td>
                {products.map(product => (
                  <td
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-24 w-auto object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Sem imagem
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha para o Preço */}
              <tr>
                <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                  Preço
                </td>
                {products.map(product => (
                  <td
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    {formatPrice(product.price)}
                  </td>
                ))}
              </tr>

              {/* Linha para o Estoque */}
              <tr>
                <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                  Estoque
                </td>
                {products.map(product => (
                  <td
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    {product.quantity} unidades
                  </td>
                ))}
              </tr>

              {/* Linha para Descrição */}
              <tr>
                <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                  Descrição
                </td>
                {products.map(product => (
                  <td
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    {product.description || (
                      <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha para Categoria */}
              <tr>
                <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                  Categoria
                </td>
                {products.map(product => (
                  <td
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    {product.category || (
                      <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha para Tags */}
              <tr>
                <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                  Tags
                </td>
                {products.map(product => (
                  <td
                    key={product.id}
                    className="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    {product.tags && product.tags.length > 0 ? (
                      <ul className="flex flex-wrap gap-1">
                        {product.tags.map(tag => (
                          <li
                            key={tag}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Demais especificações do objeto specifications */}
              {allSpecs.map((spec) => (
                <tr key={spec}>
                  <td className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                    {spec}
                  </td>
                  {products.map(product => (
                    <td
                      key={product.id}
                      className="p-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      {product.specifications?.[spec] || 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductComparison;
