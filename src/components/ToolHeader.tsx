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
        'tool-header flex min-h-14 items-center justify-between border-b border-black/5 bg-[var(--bg)] px-2.5 pt-[var(--safe-top)] sm:min-h-16 sm:px-5 lg:px-8',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 h-10 items-center gap-1.5 sm:h-11 sm:gap-2">
        <BackHomeButton compact className="-translate-y-px" />
        <h1 className="inline-flex min-w-0 h-10 items-center truncate pb-[1px] text-sm font-extrabold leading-none tracking-tight text-[var(--ink)] sm:h-11 sm:text-lg">
          {title}
        </h1>
      </div>
      <div className="tool-header-actions ml-2 max-w-[55vw] justify-end sm:max-w-none">
        {rightSlot}
      </div>
    </header>
  );
}
