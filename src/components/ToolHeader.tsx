import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import BackHomeButton from './BackHomeButton';

interface ToolHeaderProps {
  title: string;
  rightSlot?: ReactNode;
  className?: string;
}

export default function ToolHeader({ title, rightSlot, className }: ToolHeaderProps) {
  return (
    <header
      className={clsx(
        'tool-header flex h-16 items-center justify-between border-b border-black/5 bg-[var(--bg)] px-3 sm:px-5 lg:px-8',
        className,
      )}
    >
      <div className="flex min-w-0 h-11 items-center gap-2">
        <BackHomeButton compact className="-translate-y-px" />
        <h1 className="inline-flex h-11 items-center truncate pb-[1px] text-base font-extrabold leading-none tracking-tight text-[var(--ink)] sm:text-lg">
          {title}
        </h1>
      </div>
      <div className="tool-header-actions">{rightSlot}</div>
    </header>
  );
}
