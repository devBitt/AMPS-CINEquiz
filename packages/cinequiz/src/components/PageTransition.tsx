import { motion } from 'framer-motion';

export const PageTransition = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#0A0A0F] ${className}`}
    >
      {children}
    </motion.div>
  );
};
