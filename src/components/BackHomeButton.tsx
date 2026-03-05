import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

interface BackHomeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  compact?: boolean;
}

export default function BackHomeButton({
  label = '返回主页',
  compact = false,
  className,
  onClick,
  ...props
}: BackHomeButtonProps) {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      navigate('/');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={clsx(
        'inline-flex items-center justify-center text-black/50 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
        compact ? 'h-11 w-11' : 'h-12 w-12',
        className,
      )}
      {...props}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center shrink-0 -translate-y-px">
        <ArrowLeft size={24} strokeWidth={2.5} />
      </span>
    </button>
  );
}
