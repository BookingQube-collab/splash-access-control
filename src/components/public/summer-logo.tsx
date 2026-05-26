import { SummerSplashLogo, type SummerSplashLogoSize } from "@/components/brand/summer-splash-logo";
import { cn } from "@/lib/utils";

export function SummerLogo({
  className,
  href = "/",
  light: _light,
  size = "md",
  priority = false,
}: {
  className?: string;
  href?: string;
  /** @deprecated Logo image includes its own contrast; kept for API compatibility */
  light?: boolean;
  size?: SummerSplashLogoSize;
  priority?: boolean;
}) {
  return (
    <SummerSplashLogo
      href={href}
      size={size}
      className={cn(className)}
      framed={false}
      priority={priority}
    />
  );
}
