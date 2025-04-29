import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const messages = [
  "Gerencie suas finanças de forma inteligente",
  "Acompanhe suas despesas em tempo real",
  "Crie metas financeiras personalizadas",
  "Visualize relatórios detalhados",
  "Organize suas transações por categorias",
  "Mantenha o controle do seu dinheiro",
  "Planeje seu futuro financeiro",
  "Monitore seus investimentos",
  "Receba alertas importantes",
  "Acesse de qualquer dispositivo"
];

export default function DynamicText() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[40px] relative">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 text-xl text-blue-100 text-center"
        >
          {messages[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}