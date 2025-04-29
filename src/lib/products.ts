import { supabase } from './supabase';
import type { Product, ProductFormData } from './types';

async function ensureStorageBucket() {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Try to get bucket info first
    const { data: buckets, error: getBucketsError } = await supabase
      .storage
      .listBuckets();

    if (getBucketsError) {
      console.error('Error listing buckets:', getBucketsError);
      throw new Error('Erro ao verificar buckets. Por favor, tente novamente.');
    }

    const productsBucket = buckets?.find(b => b.name === 'products');

    // If bucket doesn't exist, create it
    if (!productsBucket) {
      const { data, error: createError } = await supabase
        .storage
        .createBucket('products', {
          public: true, // Make bucket public
          fileSizeLimit: 2097152, // 2MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif']
        });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw new Error('Erro ao criar bucket de armazenamento. Por favor, tente novamente.');
      }
    }
  } catch (error) {
    console.error('Error ensuring storage bucket exists:', error);
    throw error instanceof Error ? error : new Error('Erro ao inicializar armazenamento');
  }
}

async function handleImageUpload(image: File, userId: string): Promise<string> {
  const fileExt = image.name.split('.').pop();
  const fileName = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(fileName, image, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw new Error('Erro ao fazer upload da imagem. Por favor, tente novamente.');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(fileName);

  return publicUrl;
}

async function deleteProductImage(imageUrl: string) {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const filePath = url.pathname.split('/').slice(-2).join('/');

    const { error } = await supabase.storage
      .from('products')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      throw new Error('Erro ao excluir imagem do produto.');
    }
  } catch (error) {
    console.error('Error in deleteProductImage:', error);
    // Don't throw here - we want to continue with product deletion even if image deletion fails
  }
}

export async function createProduct(formData: ProductFormData): Promise<Product | null> {
  try {
    await ensureStorageBucket();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Get user's plan features
    const { data: planFeatures, error: planError } = await supabase
      .from('plan_features')
      .select('allow_tags, max_products, max_description_length')
      .eq('plan_id', (
        await supabase
          .from('profiles')
          .select('plano')
          .eq('id', user.id)
          .single()
      ).data?.plano)
      .single();

    // Check product count limit
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting products:', countError);
      throw new Error('Erro ao verificar limite de produtos');
    }

    if (planFeatures?.max_products && count && count >= planFeatures.max_products) {
      throw new Error(`Limite de ${planFeatures.max_products} produtos atingido. Faça upgrade para adicionar mais produtos.`);
    }

    // Check tags restriction
    if (!planFeatures?.allow_tags && formData.tags?.length > 0) {
      formData.tags = []; // Remove tags if not allowed in plan
    }

    // Check description length
    if (planFeatures?.max_description_length && formData.description && formData.description.length > planFeatures.max_description_length) {
      formData.description = formData.description.substring(0, planFeatures.max_description_length);
    }

    // Validate and format price
    const numericPrice = parseFloat(formData.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice < 0) {
      throw new Error('Preço inválido');
    }

    // Handle image upload if present
    let image_url = null;
    if (formData.image) {
      // Validate file size (max 2MB)
      if (formData.image.size > 2 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 2MB');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(formData.image.type)) {
        throw new Error('Formato de imagem não suportado. Use PNG, JPG ou GIF.');
      }

      image_url = await handleImageUpload(formData.image, user.id);
    }

    // Then create the product record
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          user_id: user.id,
          name: formData.name.trim(),
          price: numericPrice,
          description: formData.description.trim(),
          quantity: formData.quantity,
          category: formData.category.trim(),
          tags: formData.tags,
          image_url,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating product record:', error);
      throw new Error('Erro ao criar produto. Por favor, tente novamente.');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao criar produto');
  }
}

export async function updateProduct(productId: string, formData: ProductFormData, currentImageUrl: string | null): Promise<Product | null> {
  try {
    await ensureStorageBucket();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Get user's plan features
    const { data: planFeatures, error: planError } = await supabase
      .from('plan_features')
      .select('allow_tags, max_description_length')
      .eq('plan_id', (
        await supabase
          .from('profiles')
          .select('plano')
          .eq('id', user.id)
          .single()
      ).data?.plano)
      .single();

    // Check tags restriction
    if (!planFeatures?.allow_tags && formData.tags?.length > 0) {
      formData.tags = []; // Remove tags if not allowed in plan
    }

    // Check description length
    if (planFeatures?.max_description_length && formData.description && formData.description.length > planFeatures.max_description_length) {
      formData.description = formData.description.substring(0, planFeatures.max_description_length);
    }

    // Validate and format price
    const numericPrice = parseFloat(formData.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice < 0) {
      throw new Error('Preço inválido');
    }

    let image_url = currentImageUrl;

    // Handle image update if a new image is provided
    if (formData.image) {
      // Delete old image if it exists
      if (currentImageUrl) {
        await deleteProductImage(currentImageUrl);
      }

      // Upload new image
      image_url = await handleImageUpload(formData.image, user.id);
    }

    // First check if product exists and belongs to user
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      throw new Error('Produto não encontrado ou sem permissão para editar');
    }

    // Update product record with explicit column selection
    const { data, error } = await supabase
      .from('products')
      .update({
        name: formData.name.trim(),
        price: numericPrice,
        description: formData.description.trim(),
        quantity: formData.quantity,
        category: formData.category.trim(),
        tags: formData.tags,
        image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw new Error('Erro ao atualizar produto. Por favor, tente novamente.');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao atualizar produto');
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Get product details first to get the image URL
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching product:', fetchError);
      throw new Error('Erro ao buscar produto para exclusão.');
    }

    // Delete the product image if it exists
    if (product?.image_url) {
      await deleteProductImage(product.image_url);
    }

    // Delete the product record
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting product:', deleteError);
      throw new Error('Erro ao excluir produto. Por favor, tente novamente.');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao excluir produto');
  }
}

export async function getUserProducts(userId: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user products:', error);
      return []; // Return empty array instead of throwing
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserProducts:', error);
    return []; // Return empty array on any error
  }
}