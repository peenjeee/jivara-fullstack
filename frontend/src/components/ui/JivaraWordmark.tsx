import Image from "next/image";

type JivaraWordmarkSize = "compact" | "sidebar";

interface JivaraWordmarkProps {
  readonly size?: JivaraWordmarkSize;
  readonly priority?: boolean;
  readonly className?: string;
}

const wordmarkSizeClasses: Record<JivaraWordmarkSize, { readonly frame: string; readonly image: string; readonly imageSize: number; readonly sizes: string }> = {
  compact: {
    frame: "h-[50px] w-[132px]",
    image: "-left-[15px] -top-[56px] h-[162px] w-[162px]",
    imageSize: 162,
    sizes: "132px",
  },
  sidebar: {
    frame: "h-[68px] w-[172px]",
    image: "-left-[24px] -top-[76px] h-[220px] w-[220px]",
    imageSize: 220,
    sizes: "172px",
  },
};

export default function JivaraWordmark({ size = "compact", priority = false, className = "" }: JivaraWordmarkProps) {
  const logoSize = wordmarkSizeClasses[size];

  return (
    <span className={`relative block shrink-0 overflow-hidden ${logoSize.frame} ${className}`} aria-label="Jivara">
      <Image
        src="/images/logo/notext.png"
        alt="Jivara"
        width={logoSize.imageSize}
        height={logoSize.imageSize}
        sizes={logoSize.sizes}
        preload={priority}
        fetchPriority={priority ? "high" : "auto"}
        className={`absolute max-w-none object-contain ${logoSize.image}`}
      />
    </span>
  );
}
