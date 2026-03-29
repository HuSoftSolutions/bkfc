import { Siren, Newspaper, CalendarDays } from "lucide-react";

type Variant = "call" | "news" | "event";

const config = {
  call: { icon: Siren, label: "Incident Report" },
  news: { icon: Newspaper, label: "News Article" },
  event: { icon: CalendarDays, label: "Event" },
};

export default function PlaceholderImage({
  variant = "call",
  className = "h-48",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { icon: Icon, label } = config[variant];

  return (
    <div
      className={`w-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <Icon size={32} className="text-gray-300" />
      <span className="text-gray-400 text-xs font-medium">{label}</span>
    </div>
  );
}
