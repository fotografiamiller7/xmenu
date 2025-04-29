import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: string;
    name: string;
    price: number;
    features: string[];
    description?: string;
  };
  onSuccess: () => void;
}

interface PlanFormData {
  name: string;
  price: string;
  description: string;
  features: string[];
}

export default function PlanModal({ isOpen, onClose, initialData, onSuccess }: PlanModalProps) {
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    price: '',
    description: '',
    features: ['']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        price: initialData.price.toString(),
        features: initialData.features
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        price: '',
        features: ['']
      });
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, '']
    });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Nome do plano é obrigatório');
      }

      const price = parseFloat(formData.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (isNaN(price) || price < 0) {
        throw new Error('Valor do plano inválido');
      }

      // Filter out empty features
      const features = formData.features.filter(f => f.trim());
      if (features.length === 0) {
        throw new Error('Adicione pelo menos uma funcionalidade');
      }

      // Create new plan or update existing one
      const { data: plan, error: upsertError } = await supabase
        .from('planosxmenu')
        .upsert({
          id: initialData?.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: price,
          features: features
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!plan) throw new Error('Erro ao criar plano');

      // Update or insert plan features using onConflict
      const { error: featuresError } = await supabase
        .from('plan_features')
        .upsert({
          plan_id: plan.id,
          max_products: 30,
          max_description_length: 30,
          allow_tags: false,
          allow_theme_customization: false,
          allow_cart: false,
          allow_purchases: false
        }, {
          onConflict: 'plan_id'
        });

      // Se ocorrer erro na atualização/inserção de features, registra o aviso e continua
      if (featuresError) {
        console.warn("Erro ao atualizar recursos do plano:", featuresError.message);
      }

      setShowSuccess(true);
      setError(null);
      onSuccess();

      setTimeout(() => {
        onClose();
        setShowSuccess(false);
        setFormData({
          name: '',
          price: '',
          description: '',
          features: ['']
        });
      }, 1500);

    } catch (error) {
      console.error('Error creating plan:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar plano');
      setShowSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Editar Plano' : 'Novo Plano'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {showSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700">
                {initialData ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Plano
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do Plano
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Digite uma breve descrição do plano"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor do Plano
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funcionalidades
              </label>
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      placeholder="Digite uma funcionalidade"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formData.features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Funcionalidade
                </button>
              </div>
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
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
