import { cn } from "@/lib/utils"; // Assuming you have a utility for class merging

export default function LoadingSpinner({ 
  className = "",
  size = "md",
  variant = "primary" 
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "destructive";
}) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-4",
    lg: "h-12 w-12 border-4"
  };

  const variantClasses = {
    primary: "border-t-primary border-r-primary border-b-transparent border-l-transparent",
    secondary: "border-t-secondary border-r-secondary border-b-transparent border-l-transparent",
    destructive: "border-t-destructive border-r-destructive border-b-transparent border-l-transparent"
  };

  return (
    <div 
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label="Loading"
      role="status"
    />
  );
}