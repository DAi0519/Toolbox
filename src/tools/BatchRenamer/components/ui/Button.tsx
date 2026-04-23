import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MotionButtonProps = React.ComponentPropsWithoutRef<typeof motion.button>;

interface ButtonProps extends MotionButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95 shadow-sm',
      secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 active:scale-95 shadow-sm',
      ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 active:scale-95',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs font-medium rounded-md',
      md: 'h-10 px-4 text-sm font-medium rounded-lg',
      lg: 'h-12 px-6 text-base font-medium rounded-lg',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'pressable inline-flex items-center justify-center transition-[background-color,border-color,color,box-shadow] focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
