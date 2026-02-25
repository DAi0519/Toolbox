import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs ring-offset-white file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-neutral-400 focus-visible:outline-none focus-visible:border-[var(--ink)] focus-visible:ring-1 focus-visible:ring-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50 transition-all text-[var(--ink)]',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';
