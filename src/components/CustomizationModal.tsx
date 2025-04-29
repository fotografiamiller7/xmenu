import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Upload } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { supabase } from '../lib/supabase';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    logo_url?: string | null;
    background_url?: string | null;
    theme?: string | null;
  } | null;
  onUpdate: () => void;
}

type ImageType = 'logo' | 'background';

const defaultTheme = '#0061FF';

const defaultPlanFeatures = {
  max_products: 30,
  max_description_length: 30,
  allow_tags: false,
  allow_theme_customization: false,
  allow_cart: false,
  allow_purchases: false
};

export default function CustomizationModal({ isOpen, onClose, profile, onUpdate }: CustomizationModalProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [theme, setTheme] = useState(defaultTheme);
  const [planFeatures, setPlanFeatures] = useState<any>(defaultPlanFeatures);

  useEffect(() => {
    const fetchPlanFeatures = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPlanFeatures(defaultPlanFeatures);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('plano')
          .eq('id', user.id)
          .single();

        if (profileData?.plano) {
          const { data, error } = await supabase
            .from('plan_features')
            .select('*')
            .eq('plan_id', profileData.plano)
            .single();

          if (!error && data) {
            setPlanFeatures(data);
            return;
          }
        }
        
        setPlanFeatures(defaultPlanFeatures);
      } catch (error) {
        console.error('Error fetching plan features:', error);
        setPlanFeatures(defaultPlanFeatures);
      }
    };

    if (isOpen) {
      fetchPlanFeatures();
    }
  }, [isOpen]);

  useEffect(() => {
    if (profile) {
      setLogoPreview(profile.logo_url || null);
      setBackgroundPreview(profile.background_url || null);
      setTheme(profile.theme || defaultTheme);
    }
  }, [profile]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: ImageType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato de imagem não suportado. Use PNG, JPG ou GIF.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoPreview(reader.result as string);
        setLogoFile(file);
      } else {
        setBackgroundPreview(reader.result as string);
        setBackgroundFile(file);
      }
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const uploadImage = async (file: File, userId: string, type: ImageType): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data: buckets } = await supabase.storage.listBuckets();
    const profilesBucket = buckets?.find(b => b.name === 'profiles');
    
    if (!profilesBucket) {
      await supabase.storage.createBucket('profiles', {
        public: true,
        fileSizeLimit: 2097152,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif']
      });
    }

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error('Erro ao fazer upload da imagem');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Check if theme customization is allowed
      if (profile?.theme !== theme && !planFeatures.allow_theme_customization) {
        throw new Error('Personalização de tema não está disponível no seu plano atual. Faça upgrade para personalizar as cores.');
      }

      let logo_url = profile?.logo_url;
      let background_url = profile?.background_url;

      if (logoFile) {
        logo_url = await uploadImage(logoFile, user.id, 'logo');
      }

      if (backgroundFile) {
        background_url = await uploadImage(backgroundFile, user.id, 'background');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          logo_url,
          background_url,
          theme: planFeatures.allow_theme_customization ? theme : defaultTheme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setShowSuccess(true);
      onUpdate();

      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar personalização');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Personalização</h2>
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
              <p className="text-green-700">Personalização atualizada com sucesso!</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo do estabelecimento
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Clique para fazer upload do logo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'logo')}
                  />
                </label>
              </div>
            </div>

            {/* Background Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem de fundo
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {backgroundPreview ? (
                    <img
                      src={backgroundPreview}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Clique para fazer upload da imagem de fundo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'background')}
                  />
                </label>
              </div>
            </div>

            {/* Color Theme */}
            <div className={!planFeatures?.allow_theme_customization ? 'opacity-50' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Cor do tema
                {!planFeatures?.allow_theme_customization && (
                  <span className="ml-2 text-xs text-red-600">
                    (Não disponível no plano básico)
                  </span>
                )}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => planFeatures?.allow_theme_customization && setShowColorPicker(!showColorPicker)}
                  disabled={!planFeatures?.allow_theme_customization}
                  className="w-full p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme }}
                    />
                    <span className="text-sm">Cor principal</span>
                  </div>
                </button>

                {showColorPicker && (
                  <div className="absolute z-10 top-full left-0 mt-2">
                    <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
                    <div className="relative">
                      <HexColorPicker
                        color={theme}
                        onChange={setTheme}
                      />
                    </div>
                  </div>
                )}
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
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}