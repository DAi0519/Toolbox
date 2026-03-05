import { Wrench } from 'lucide-react';

interface ToolPlaceholderProps {
  title: string;
  subtitle?: string;
}

export default function ToolPlaceholder({
  title,
  subtitle = `${title}功能正在完善中，后续版本将开放完整功能。`,
}: ToolPlaceholderProps) {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl rounded-2xl border border-black/10 bg-gradient-to-b from-white to-neutral-50 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] sm:rounded-3xl sm:p-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white sm:h-12 sm:w-12 sm:rounded-2xl">
            <Wrench size={20} />
          </div>
          <p className="text-sm font-medium text-black/55">即将上线</p>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-black/65 sm:mt-6 sm:text-[15px]">{subtitle}</p>
      </div>
    </div>
  );
}
