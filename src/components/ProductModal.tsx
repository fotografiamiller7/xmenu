import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  CheckCircle, 
  Sparkles, 
  AlertTriangle, 
  Crown, 
  Star, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ProductModalProps, ProductTag } from '../lib/types';

const defaultPlanFeatures = {
  max_products: 30,
  max_description_length: 30,
  allow_tags: false,
  allow_theme_customization: false,
  allow_cart: false,
  allow_purchases: false
};

const PRODUCT_TAGS = [
  { id: 'novidade', label: 'Novidade', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: <Sparkles className="w-3 h-3" /> },
  { id: 'em-falta', label: 'Em Falta', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <AlertTriangle className="w-3 h-3" /> },
  { id: 'premium', label: 'Premium', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: <Crown className="w-3 h-3" /> },
  { id: 'exclusivo', label: 'Exclusivo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: <Star className="w-3 h-3" /> },
  { id: 'mais-pedido', label: 'Mais Pedido', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: <TrendingUp className="w-3 h-3" /> },
] as const;

export default function ProductModal({ isOpen, onClose, onSubmit, initialData, type }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: 0,
    description: '',
    category: '',
    tags: [] as ProductTag[],
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [planFeatures, setPlanFeatures] = useState<any>(null);
  const [currentProductCount, setCurrentProductCount] = useState<number>(0);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // O botão Gerar Descrição só ficará visível se o nome do plano não for "Básico"
  const canGenerateDescription = planFeatures && planFeatures.plan_name !== "Básico";

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        price: initialData.price.toString(),
        quantity: initialData.quantity,
        description: initialData.description || '',
        category: initialData.category || '',
        tags: initialData.tags as ProductTag[],
        image: null,
      });
      setImagePreview(initialData.image_url);
    }

    // Recupera as configurações do plano do usuário
    const fetchPlanFeatures = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPlanFeatures(defaultPlanFeatures);
          return;
        }

        // Conta os produtos do usuário
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id);
        if (!productError && productData) {
          setCurrentProductCount(productData.length);
        }

        // Consulta o perfil do usuário para obter o UUID do plano
        const { data: profileData } = await supabase
          .from('profiles')
          .select(`
            plano,
            subscriptions(plan_id, status)
          `)
          .eq('id', user.id)
          .single();

        let planId = profileData?.plano;

        // Se houver assinatura ativa, pode sobrescrever o plano do perfil
        if (profileData?.subscriptions) {
          const activeSubscription = profileData.subscriptions.find(
            (sub: any) => sub.status === 'active'
          );
          if (activeSubscription) {
            planId = activeSubscription.plan_id;
          }
        }

        if (planId) {
          // Consulta as regras do plano na tabela plan_features
          const { data: featuresData, error: featuresError } = await supabase
            .from('plan_features')
            .select('*')
            .eq('plan_id', planId)
            .single();
          
          // Consulta o nome do plano na tabela planosxmenu
          const { data: planData, error: planError } = await supabase
            .from('planosxmenu')
            .select('name')
            .eq('id', planId)
            .single();
          
          if (!featuresError && featuresData && !planError && planData) {
            // Combina as informações, adicionando o campo plan_name
            setPlanFeatures({ ...featuresData, plan_name: planData.name });
            return;
          }
        }
        
        // Se não for possível recuperar, utiliza as configurações padrão
        setPlanFeatures(defaultPlanFeatures);
      } catch (error) {
        console.error('Error fetching plan features:', error);
        setPlanFeatures(defaultPlanFeatures);
      }
    };

    if (isOpen) {
      fetchPlanFeatures();
    }
  }, [initialData, isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError('A imagem deve ter no máximo 2MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Formato de imagem não suportado. Use PNG, JPG ou GIF.');
      return;
    }

    setFormError(null);
    setFormData({ ...formData, image: file });
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTagToggle = (tag: ProductTag) => {
    if (!planFeatures?.allow_tags) {
      setFormError('Etiquetas não estão disponíveis no seu plano atual. Faça upgrade para usar etiquetas.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // Função para gerar a descrição utilizando a API Gemini do Google
  const handleGenerateDescription = async () => {
    const prompt = `Quais são as principais características e novidades do produto: ${formData.name} que o diferencia dos demais? Forneça uma descrição completa do produto para minha página de vendas em texto puro (sem formatação markdown, sem asteriscos, negrito ou outros símbolos), com quebras de linha para separar seções e utilizando uma lista com hífens ou emojis para as especificações. O texto deve ter no máximo ${planFeatures?.max_description_length} caracteres.`;

    try {
      setIsGeneratingDescription(true);
      
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBMveJfAFlMLuY8E2M6r2g2bX0N67teePg",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error("Erro ao gerar descrição via Gemini API");
      }
      
      const data = await response.json();
      const generatedDescription = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      setFormData({ ...formData, description: generatedDescription });
    } catch (error) {
      console.error("Erro na chamada da Gemini API:", error);
      setFormError("Não foi possível gerar a descrição. Tente novamente.");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      if (type === 'create' && planFeatures) {
        if (currentProductCount >= planFeatures.max_products) {
          throw new Error(`Você atingiu o limite de ${planFeatures.max_products} produtos do seu plano. Faça upgrade para adicionar mais produtos.`);
        }
      }

      if (formData.description && planFeatures && formData.description.length > planFeatures.max_description_length) {
        setFormData({
          ...formData,
          description: formData.description.substring(0, planFeatures.max_description_length)
        });
      }

      if (formData.tags.length > 0 && planFeatures && !planFeatures.allow_tags) {
        throw new Error('Etiquetas não estão disponíveis no seu plano atual. Faça upgrade para usar etiquetas.');
      }

      await onSubmit(formData);
      setShowSuccess(true);
      
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Erro ao processar produto. Por favor, tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === 'create' ? 'Novo Produto' : 'Editar Produto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{formError}</p>
            </div>
          )}

          {showSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700">
                Produto {type === 'create' ? 'criado' : 'atualizado'} com sucesso!
              </p>
            </div>
          )}

          {/* Image Upload */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto do Produto
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG ou GIF (MAX. 2MB)</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          {/* Product Details Form */}
          <div className="space-y-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                {canGenerateDescription && (
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription || !formData.name}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Gerar Descrição
                      </>
                    )}
                  </button>
                )}
              </div>
              {planFeatures && (
                <p className="text-xs text-gray-500 mb-2">
                  Máximo de {planFeatures.max_description_length} caracteres (Restantes: {planFeatures.max_description_length - (formData.description?.length || 0)})
                </p>
              )}
              <textarea
                value={formData.description}
                onChange={(e) => {
                  const newDescription = e.target.value;
                  if (planFeatures && newDescription.length > planFeatures.max_description_length) {
                    setFormData({
                      ...formData,
                      description: newDescription.substring(0, planFeatures.max_description_length)
                    });
                  } else {
                    setFormData({
                      ...formData,
                      description: newDescription
                    });
                  }
                }}
                maxLength={planFeatures?.max_description_length || 30}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etiquetas {!planFeatures?.allow_tags && (
                  <span className="text-xs text-red-600">(Não disponível no plano básico)</span>
                )}
              </label>
              <div className={`flex flex-wrap gap-2 ${!planFeatures?.allow_tags ? 'opacity-50' : ''}`}>
                {PRODUCT_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id as ProductTag)}
                    disabled={!planFeatures?.allow_tags}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      formData.tags.includes(tag.id as ProductTag)
                        ? tag.color
                        : 'bg-gray-100 text-gray-800'
                    } transition-colors`}
                  >
                    {tag.icon}
                    {tag.label}
                  </button>
                ))}
              </div>
              {!planFeatures?.allow_tags && formData.tags.length > 0 && (
                <p className="mt-2 text-xs text-red-600">
                  Etiquetas serão removidas ao salvar pois não estão disponíveis no seu plano atual.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || showSuccess}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting 
                ? 'Processando...' 
                : type === 'create' 
                  ? 'Criar Produto' 
                  : 'Salvar Alterações'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
