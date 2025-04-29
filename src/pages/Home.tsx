import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectCoverflow } from 'swiper/modules';
import { supabase } from '../lib/supabase';
import {
  Store,
  ArrowRight,
  CheckCircle,
  Package,
  ChevronDown,
  Phone,
  Mail,
  Star,
  Users,
  ShoppingBag,
  Palette,
  Bell,
  BarChart3,
  Smartphone,
  Zap,
  MessageSquare,
  Shield,
  Clock,
  CreditCard,
  Rocket,
  Heart,
  TrendingUp,
  Sparkles
} from 'lucide-react';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';
import 'swiper/css/effect-coverflow';

function Home() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsRef, statsInView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  const stats = [
    { label: 'Clientes Ativos', value: '1000+', icon: <Users className="w-6 h-6" /> },
    { label: 'Pedidos Processados', value: '50K+', icon: <ShoppingBag className="w-6 h-6" /> },
    { label: 'Satisfação', value: '99%', icon: <Heart className="w-6 h-6" /> },
    { label: 'Crescimento Médio', value: '40%', icon: <TrendingUp className="w-6 h-6" /> }
  ];

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plansData, error: plansError } = await supabase
          .from('planosxmenu')
          .select('*')
          .order('price', { ascending: true });

        if (plansError) throw plansError;
        setPlans(plansData || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.2 }
    }
  };

  const features = [
    {
      icon: <Store className="h-6 w-6" />,
      title: "Catálogo Digital",
      description: "Crie um catálogo digital profissional para seus produtos com fotos, descrições e preços."
    },
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "Gestão de Pedidos",
      description: "Receba e gerencie pedidos de forma organizada, com notificações em tempo real."
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Personalização",
      description: "Personalize as cores, logo e estilo do seu catálogo para combinar com sua marca."
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: "Notificações",
      description: "Receba notificações instantâneas de novos pedidos via WhatsApp."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Análises e Relatórios",
      description: "Acompanhe o desempenho do seu negócio com relatórios detalhados e insights valiosos."
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "100% Responsivo",
      description: "Seu catálogo funciona perfeitamente em qualquer dispositivo, do desktop ao mobile."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Segurança Avançada",
      description: "Proteção total dos dados com criptografia e processamento seguro de pagamentos."
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Pagamento via PIX",
      description: "Receba pagamentos instantâneos via PIX com confirmação automática."
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Suporte Dedicado",
      description: "Atendimento personalizado via WhatsApp para resolver suas dúvidas."
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: "Controle de Estoque",
      description: "Gerencie seu estoque em tempo real, com alertas automáticos e atualizações após cada venda."
    },
    {
      icon: <Store className="h-6 w-6" />,
      title: "Link Exclusivo",
      description: "Cada estabelecimento recebe um link personalizado para compartilhar seu catálogo digital."
    },
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "Checkout Simplificado",
      description: "Processo de compra rápido e intuitivo, com confirmação instantânea de pagamento."
    }
  ];
  return (
    <React.Fragment>
      {/* Hero Section */}
      <div className="flex items-center relative min-h-[90vh] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-blue-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0">
            <svg 
              className="absolute inset-0 w-full h-full opacity-50"
              xmlns="http://www.w3.org/2000/svg"
              style={{ 
                transform: 'scale(1.5) rotate(-12deg) translateY(-10%)',
                filter: 'blur(1px)'
              }}
            >
              <defs>
                <pattern 
                  id="grid" 
                  width="60" 
                  height="60" 
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <path 
                    d="M 60 0 L 0 0 0 60" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="0.8" 
                    className="text-blue-200/30 dark:text-blue-700/30" 
                  />
                </pattern>
              </defs>
              <rect 
                width="200%" 
                height="200%" 
                fill="url(#grid)"
                className="animate-[float_20s_ease-in-out_infinite]"
              />
            </svg>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <motion.h1
                initial="hidden"
                animate="visible"
                variants={heroVariants}
              >
                <span className="block text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Revolucione seu Negócio
                  </span>
                </span>
                <span className="mt-1 block text-4xl sm:text-5xl xl:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Transforme seu negócio com um catálogo digital profissional
                </span>
              </motion.h1>
              <motion.p 
                className="mt-3 text-base text-gray-600 dark:text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                Gerencie seus produtos, receba pedidos e aumente suas vendas com uma plataforma completa e fácil de usar.
              </motion.p>
              <motion.div 
                className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <button
                  onClick={() => navigate('/auth')}
                  className="group inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105"
                >
                  <Rocket className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
                  Comece Gratuitamente.
                </button>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Não precisa de cartão de crédito.
                </p>
              </motion.div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <motion.div 
                className="relative mx-auto w-full rounded-2xl shadow-2xl overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="relative block w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden aspect-[16/10]">
                  <img
                    className="w-full h-full object-cover"
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                    alt="XMenu Dashboard Preview"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            ref={statsRef}
            className="grid grid-cols-2 gap-8 md:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.2, duration: 0.8 }}
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-2xl text-blue-600 dark:text-blue-400">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-8 bg-white dark:bg-gray-800 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="lg:text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-base text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">
              Principais Funcionalidades
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Tudo que você precisa em um só lugar
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-300 lg:mx-auto">
              Gerencie seu negócio de forma eficiente com nossas ferramentas intuitivas e poderosas.
            </p>
          </motion.div>

          <div className="mt-20">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white transform transition-transform duration-300 hover:scale-110">
                      {feature.icon}
                    </div>
                    <p className="ml-16 text-lg font-medium text-gray-900 dark:text-white">
                      {feature.title}
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-300">
                    {feature.description}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="sm:flex sm:flex-col sm:align-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white sm:text-center">
              Planos e Preços
            </h1>
            <p className="mt-5 text-xl text-gray-500 dark:text-gray-300 sm:text-center">
              Escolha o plano ideal para o seu negócio
            </p>
          </motion.div>
          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-3 flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-lg shadow-lg divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 ${
                      plan.name === 'Profissional' ? 'ring-2 ring-blue-500' : ''
                    } transition-all duration-300 hover:translate-y-[-8px] hover:scale-[1.02] hover:shadow-xl`}
                  >
                    <div className="p-6">
                      <h2 className="text-2xl leading-6 font-semibold text-gray-900 dark:text-white">
                        {plan.name}
                      </h2>
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-300">
                        {plan.description}
                      </p>
                      <p className="mt-8">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white transition-colors duration-300">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-base font-medium text-gray-500 dark:text-gray-300">
                          /mês
                        </span>
                      </p>
                      <button
                        onClick={() => navigate('/auth')}
                        className={`mt-8 block w-full bg-blue-600 hover:bg-blue-700 py-3 px-6 border border-transparent rounded-md text-center font-medium text-white transition-colors ${
                          plan.name === 'Profissional'
                            ? 'text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-white bg-blue-600 hover:bg-blue-700'
                        } transform transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        Começar Agora
                      </button>
                    </div>
                    <div className="pt-6 pb-8 px-6">
                      <h3 className="text-xs font-medium text-gray-900 dark:text-white tracking-wide uppercase">
                        O que está incluído
                      </h3>
                      <ul className="mt-6 space-y-4">
                        {plan.features?.map((feature: string, index: number) => (
                          <li key={index} className="flex space-x-3">
                            <CheckCircle
                              className="flex-shrink-0 h-5 w-5 text-green-500"
                              aria-hidden="true"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-white dark:bg-gray-800 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              O que nossos clientes dizem
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-300">
              Histórias reais de sucesso de estabelecimentos que transformaram seus negócios com o XMenu.
            </p>
          </motion.div>
          <div className="mt-20">
            <Swiper
              modules={[Autoplay, Pagination, EffectCoverflow]}
              spaceBetween={30}
              slidesPerView={1}
              autoplay={{ delay: 5000 }}
              pagination={{ clickable: true }}
              effect="coverflow"
              coverflowEffect={{
                rotate: 50,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: false
              }}
              breakpoints={{
                640: {
                  slidesPerView: 1,
                  spaceBetween: 20,
                },
                768: {
                  slidesPerView: 2,
                  spaceBetween: 30,
                },
                1024: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                },
              }}
              className="testimonials-swiper"
            >
              {[
                {
                  name: "Maria Silva",
                  role: "Proprietária",
                  company: "Café & Bistrô",
                  image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "O XMenu revolucionou meu negócio. A facilidade de atualizar o cardápio e receber pedidos é incrível!"
                },
                {
                  name: "João Santos",
                  role: "Gerente",
                  company: "Restaurante Sabor & Arte",
                  image: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "Desde que implementamos o XMenu, nossas vendas aumentaram em 40%. A experiência do cliente melhorou muito!"
                },
                {
                  name: "Ana Costa",
                  role: "Proprietária",
                  company: "Doceria Doce Amor",
                  image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "Interface intuitiva e suporte excepcional. Recomendo para qualquer estabelecimento!"
                },
                {
                  name: "Pedro Oliveira",
                  role: "Chef",
                  company: "Pizzaria Bella Napoli",
                  image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "O sistema de pedidos online do XMenu é perfeito. Nossos clientes adoram a praticidade e nós ganhamos mais eficiência."
                },
                {
                  name: "Carla Mendes",
                  role: "Proprietária",
                  company: "Padaria Pão Dourado",
                  image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "Conseguimos organizar melhor nossos produtos e as vendas aumentaram significativamente. O suporte é excelente!"
                },
                {
                  name: "Roberto Almeida",
                  role: "Gerente",
                  company: "Hamburgueria Prime",
                  image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "As notificações em tempo real e o controle de estoque são fantásticos. Melhorou muito nossa operação."
                },
                {
                  name: "Fernanda Lima",
                  role: "Proprietária",
                  company: "Sorveteria Gelato",
                  image: "https://images.unsplash.com/photo-1509783236416-c9ad59bae472?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "O catálogo digital é lindo e profissional. Nossos clientes sempre elogiam a facilidade de navegação."
                },
                {
                  name: "Lucas Santos",
                  role: "Proprietário",
                  company: "Food Truck Gourmet",
                  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                  content: "Mesmo com um negócio móvel, consigo gerenciar tudo pelo celular. O XMenu é perfeito para food trucks!"
                }
              ].map((testimonial, index) => (
                <SwiperSlide key={index}>
                  <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <div className="flex items-center">
                      <img
                        className="h-12 w-12 rounded-full"
                        src={testimonial.image}
                        alt={testimonial.name}
                      />
                      <div className="ml-4">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {testimonial.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {testimonial.role} - {testimonial.company}
                        </p>
                      </div>
                    </div>
                    <blockquote className="mt-8">
                      <p className="text-base text-gray-500 dark:text-gray-300">
                        "{testimonial.content}"
                      </p>
                    </blockquote>
                    <div className="mt-4 flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 text-yellow-400"
                          fill="currentColor"
                        />
                      ))}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Perguntas Frequentes
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Encontre respostas para as dúvidas mais comuns sobre nossa plataforma
            </p>
          </motion.div>
          <div className="max-w-3xl mx-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                {
                  question: "Como começar a usar o XMenu?",
                  answer: "Comece criando sua conta gratuitamente - não é necessário cartão de crédito. Após o cadastro, você terá acesso ao painel de controle onde poderá personalizar seu perfil, adicionar seus produtos e começar a receber pedidos imediatamente."
                },
                {
                  question: "Como adicionar produtos ao meu catálogo?",
                  answer: "No painel de controle, acesse a seção 'Produtos' e clique em 'Novo Produto'. Você pode adicionar nome, preço, descrição, categoria e fotos. Os produtos podem ser organizados por categorias e marcados com etiquetas como 'Novo', 'Mais Pedido' ou 'Em Falta'."
                },
                {
                  question: "Como funciona o sistema de pedidos?",
                  answer: "Quando um cliente faz um pedido, você recebe uma notificação instantânea via WhatsApp e email com todos os detalhes. No painel de pedidos, você pode visualizar, gerenciar e atualizar o status de cada pedido, além de acompanhar o histórico completo de vendas."
                },
                {
                  question: "Como personalizar a aparência da minha loja?",
                  answer: "Na seção de 'Personalização', você pode adicionar seu logo, imagem de fundo e escolher as cores do seu tema. Os planos pagos oferecem opções avançadas de personalização, permitindo que você adapte completamente o visual às cores da sua marca."
                },
                {
                  question: "Quais são as formas de pagamento aceitas?",
                  answer: "O sistema aceita pagamentos via PIX, proporcionando uma experiência rápida e segura para seus clientes. Os pagamentos são processados automaticamente e você recebe notificações instantâneas de cada transação."
                },
                {
                  question: "Como funciona a gestão de estoque?",
                  answer: "O sistema atualiza automaticamente o estoque após cada venda. Você pode definir quantidades, receber alertas de produtos com baixo estoque e marcar itens como 'Em Falta' quando necessário. O controle de estoque ajuda a evitar vendas de produtos indisponíveis."
                },
                {
                  question: "Como acompanhar o desempenho das vendas?",
                  answer: "O painel administrativo oferece relatórios detalhados com gráficos de vendas, produtos mais vendidos, horários de pico e tendências de consumo. Você pode filtrar os dados por período e exportar relatórios para análise mais aprofundada."
                },
                {
                  question: "Como garantir a segurança dos dados?",
                  answer: "Utilizamos criptografia de ponta a ponta e seguimos rigorosos protocolos de segurança. Todos os dados sensíveis são protegidos, e as transações são processadas em ambiente seguro. Realizamos backups regulares para garantir a integridade das informações."
                },
                {
                  question: "Como funciona o suporte técnico?",
                  answer: "Oferecemos suporte via WhatsApp e email com tempo de resposta rápido. Nossa equipe está disponível para ajudar com dúvidas, configurações e resolução de problemas. Os planos pagos incluem suporte prioritário com atendimento personalizado."
                },
                {
                  question: "Posso integrar com outros sistemas?",
                  answer: "Sim, o XMenu oferece API para integração com sistemas de gestão, contabilidade e delivery. As integrações permitem automatizar processos e sincronizar dados entre diferentes plataformas, otimizando sua operação."
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="faq-accordion-item"
                  data-state="closed"
                  onClick={(e) => {
                    const target = e.currentTarget;
                    const isOpen = target.getAttribute('data-state') === 'open';
                    
                    // Close all other items
                    document.querySelectorAll('.faq-accordion-item').forEach(item => {
                      if (item !== target) {
                        item.setAttribute('data-state', 'closed');
                        (item.querySelector('.faq-accordion-content') as HTMLElement).style.maxHeight = '0px';
                      }
                    });
                    
                    // Toggle current item
                    target.setAttribute('data-state', isOpen ? 'closed' : 'open');
                    const content = target.querySelector('.faq-accordion-content') as HTMLElement;
                    content.style.maxHeight = isOpen ? '0px' : `${content.scrollHeight}px`;
                  }}
                >
                  <h3>
                    <button className="faq-accordion-header group">
                      <span className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {faq.question}
                      </span>
                      <ChevronDown 
                        className="faq-accordion-icon w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" 
                      />
                    </button>
                  </h3>
                  <div className="faq-accordion-content" style={{ maxHeight: 0 }}>
                    <div className="pb-5 pt-2 px-1">
                      <p className="text-base text-gray-600 dark:text-gray-400">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <motion.h2 
            className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="block">Pronto para começar?</span>
            <span className="block text-blue-200">Crie sua conta gratuitamente hoje.</span>
          </motion.h2>
          <motion.div 
            className="mt-8 flex lg:mt-0 lg:flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex rounded-md shadow">
              <button
                onClick={() => navigate('/auth')}
                className="inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-blue-600 bg-white hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
              >
                Começar Agora
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Produto
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#features" className="text-base text-gray-300 hover:text-white">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-base text-gray-300 hover:text-white">
                    Preços
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Suporte
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#faq" className="text-base text-gray-300 hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#docs" className="text-base text-gray-300 hover:text-white">
                    Documentação
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Legal
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#privacy" className="text-base text-gray-300 hover:text-white">
                    Privacidade
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-base text-gray-300 hover:text-white">
                    Termos
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Contato
              </h3>
              <ul className="mt-4 space-y-4">
                <li className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-300">(11) 99999-9999</span>
                </li>
                <li className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-300">contato@xmenu.com</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700 pt-8">
            <p className="text-base text-gray-400 text-center">
              © 2024 XMenu. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </React.Fragment>
  );
}

export default Home