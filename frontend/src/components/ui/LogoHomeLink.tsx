import Image from "next/image";
import Link from "next/link";

interface LogoHomeLinkProps {
  readonly className?: string;
  readonly imageClassName?: string;
  readonly priority?: boolean;
  readonly unoptimized?: boolean;
  readonly ariaLabel?: string;
}

export default function LogoHomeLink({ className = "", imageClassName = "", priority = false, unoptimized = false, ariaLabel = "Jivara beranda" }: LogoHomeLinkProps) {
  return (
    <Link href="/" aria-label={ariaLabel} className={`flex w-full justify-center overflow-hidden ${className}`}>
      <Image
        src="/images/logo/text.png"
        alt="Jivara"
        width={1080}
        height={1080}
        preload={priority}
        fetchPriority={priority ? "high" : "auto"}
        unoptimized={unoptimized}
        sizes="(max-width: 640px) 210px, 260px"
        className={`mb-[-42px] h-auto w-[210px] translate-x-[-6px] sm:w-[260px] ${imageClassName}`}
        style={{ height: "auto" }}
      />
    </Link>
  );
}
