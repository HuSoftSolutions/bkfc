import Link from "next/link";

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundImage?: string;
}

export default function Hero({
  title,
  subtitle,
  ctaText,
  ctaHref,
  backgroundImage,
}: HeroProps) {
  return (
    <section
      className="relative flex items-center justify-center min-h-[60vh] bg-gray-900 bg-cover bg-center"
      style={
        backgroundImage
          ? { backgroundImage: `url(${backgroundImage})` }
          : undefined
      }
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 text-center px-4 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-gray-300 mb-8">{subtitle}</p>
        )}
        {ctaText && ctaHref && (
          <Link
            href={ctaHref}
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded transition-colors"
          >
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}
