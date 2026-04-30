"use client";

import React from 'react';
import { motion } from 'motion/react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const AuthCard = ({ title, subtitle, children, footer }: AuthCardProps) => {
  return (
    <motion.div
      className="w-full max-w-md bg-white rounded-3xl p-8 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] shadow-sm"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-extrabold text-dark mb-2">{title}</h1>
        <p className="text-muted font-body">{subtitle}</p>
      </div>

      {children}

      {footer && (
        <div className="mt-10 text-center">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default AuthCard;
