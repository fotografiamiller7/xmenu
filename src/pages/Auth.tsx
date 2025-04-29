import React, { useState } from 'react';
import { Store, Eye, EyeOff, User, Building2, CreditCard, Mail, Lock } from 'lucide-react';
import DynamicText from '../components/DynamicText';
import { supabase } from '../lib/supabase';
import { formatCPF, validatePassword, validateCPF } from '../lib/utils';
import type { AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

type FormData = {
  name: string;
  storeName: string;
  cpf: string;
  email: string;
  password: string;
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    storeName: '',
    cpf: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const trimmedEmail = formData.email.trim().toLowerCase(); 
    const trimmedStoreName = formData.storeName.trim();
    const unformattedCPF = formData.cpf.replace(/\D/g, '');
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email ou senha incorretos. Por favor, verifique suas credenciais.');
          }
          throw error;
        }

        if (data.user) {
          console.log('Login successful, redirecting to dashboard...');
          navigate('/dashboard');
          return;
        }
      } else {
        // Validate password
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.message);
          setIsLoading(false);
          return;
        }

        // Check for existing email in auth.users
        const { data: existingUser, error: emailCheckError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (emailCheckError) {
          console.error('Error checking email:', emailCheckError);
          throw new Error('Erro ao verificar email. Por favor, tente novamente mais tarde.');
        }

        if (existingUser) {
          setError('Este email já está registrado. Por favor, utilize outro email ou faça login.');
          setIsLoading(false);
          return;
        }

        // Check for existing store name
        const { data: existingStore, error: storeCheckError } = await supabase
          .from('profiles')
          .select('id, store_name')
          .ilike('store_name', trimmedStoreName)
          .maybeSingle();

        if (storeCheckError) {
          console.error('Error checking store name:', storeCheckError);
          throw new Error('Erro ao verificar nome do estabelecimento. Por favor, tente novamente mais tarde.');
        }

        if (existingStore) {
          setError('Este nome de estabelecimento já está em uso. Por favor, escolha outro nome.');
          setIsLoading(false);
          return;
        }

        // Check for existing CPF
        const { data: existingCPF, error: cpfCheckError } = await supabase
          .from('profiles')
          .select('id, cpf')
          .eq('cpf', unformattedCPF)
          .maybeSingle();

        if (cpfCheckError) {
          console.error('Error checking CPF:', cpfCheckError);
          throw new Error('Erro ao verificar CPF. Por favor, tente novamente mais tarde.');
        }

        if (existingCPF) {
          setError('Este CPF já está cadastrado. Por favor, utilize outro CPF ou faça login.');
          setIsLoading(false);
          return;
        }

        // Try to sign up the user
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              name: formData.name.trim(),
              store_name: trimmedStoreName,
              cpf: unformattedCPF
            }
          }
        });

        if (error) {
          console.error('Signup error:', error);
          if (error.message.includes('User already registered')) {
            setError('Este email já está registrado. Por favor, faça login.');
            setIsLogin(true);
            setFormData(prev => ({
              ...prev,
              password: ''
            }));
          } else {
            throw error;
          }
        } else if (data.user) {
          // Redirect to dashboard after successful signup
          navigate('/dashboard');
        }
      }
    } catch (error: unknown) {
      console.error('Auth error:', error);
      const authError = error as AuthError;
      setError(authError.message || 'Erro ao processar sua solicitação. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-semibold">Catálogo Online</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Entre na sua conta' : 'Criar uma conta'}
          </h1>
          <p className="text-gray-600 mb-8">
            {isLogin ? 'Bem-vindo(a)! Digite seu e-mail e senha para logar' : 'Preencha os dados para criar sua conta gratis:'}
          </p>

          {error && (
            <div className="mb-4 p-4 text-sm text-red-800 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Nome do estabelecimento"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="CPF"
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      maxLength={14}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-gray-600">Lembrar-me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-800">Esqueceu a senha?</a>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setFormData({
                  name: '',
                  storeName: '',
                  cpf: '',
                  email: '',
                  password: ''
                });
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {isLogin ? 'Criar uma conta' : 'Fazer login'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side - Blue Background with Illustration */}
      <div className="hidden lg:flex lg:w-1/2 auth-background flex-col items-center justify-center p-16 text-white">
        <div className="auth-illustration"></div>
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold mb-4">Xmenu PRO Solutions</h2>
          <DynamicText />
          <div className="auth-dots">
            <div className="auth-dot active"></div>
            <div className="auth-dot"></div>
            <div className="auth-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
}