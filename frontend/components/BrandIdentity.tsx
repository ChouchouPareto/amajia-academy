import Image from "next/image";

type BrandIdentityProps = {
  compact?: boolean;
  showEnglish?: boolean;
  className?: string;
};

export function BrandIdentity({ compact = false, showEnglish = true, className = "" }: BrandIdentityProps) {
  return (
    <div className={`brand-identity${compact ? " is-compact" : ""} ${className}`.trim()} aria-label="阿嬷学院，AMA ACADEMY">
      <Image className="brand-identity__symbol" src="/brand/ama-academy-symbol-v2.png" alt="" width={84} height={84} priority />
      <span className="brand-identity__copy">
        <strong>阿嬷学院</strong>
        {showEnglish && <small>AMA ACADEMY</small>}
      </span>
    </div>
  );
}
