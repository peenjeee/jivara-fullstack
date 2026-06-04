import Image from "next/image";

type JivaraWordmarkSize = "compact" | "sidebar";

interface JivaraWordmarkProps {
  readonly size?: JivaraWordmarkSize;
  readonly priority?: boolean;
  readonly className?: string;
}

const wordmarkSizeClasses: Record<JivaraWordmarkSize, { readonly frame: string; readonly width: number; readonly height: number; readonly sizes: string }> = {
  compact: {
    frame: "h-[56px] w-[148px]",
    width: 148,
    height: 56,
    sizes: "148px",
  },
  sidebar: {
    frame: "h-[76px] w-[196px]",
    width: 196,
    height: 76,
    sizes: "196px",
  },
};

export default function JivaraWordmark({ size = "compact", priority = false, className = "" }: JivaraWordmarkProps) {
  const logoSize = wordmarkSizeClasses[size];

  return (
    <span className={`relative block shrink-0 overflow-hidden ${logoSize.frame} ${className}`} aria-label="Jivara">
      <Image
        src="/images/logo/notext.png"
        alt="Jivara"
        width={logoSize.width}
        height={logoSize.height}
        sizes={logoSize.sizes}
        preload={priority}
        fetchPriority={priority ? "high" : "auto"}
        className="h-full w-full object-cover object-center"
      />
    </span>
  );
}
