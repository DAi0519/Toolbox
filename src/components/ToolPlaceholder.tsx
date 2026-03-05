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
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center p-8">
      <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-gradient-to-b from-white to-neutral-50 p-10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Wrench size={20} />
          </div>
          <p className="text-sm font-medium text-black/55">即将上线</p>
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-black/65">{subtitle}</p>
      </div>
    </div>
  );
}
