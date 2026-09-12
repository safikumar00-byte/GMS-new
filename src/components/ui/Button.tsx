import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-medium tracking-wide uppercase transition-colors select-none focus:outline-none focus:ring-1 focus:ring-[#e17100] disabled:opacity-50 disabled:cursor-not-allowed rounded-none cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8',
    md: 'text-xs px-4 py-2 h-9',
    lg: 'text-sm px-6 py-3 h-11',
  };

  const variantStyles = {
    primary: 'bg-[#e17100] text-white border border-[#e17100] hover:bg-[#c66200] active:bg-[#aa5300]',
    secondary: 'bg-[#f5f5f5] dark:bg-[#171717] text-[#171717] dark:text-[#f5f5f4] border border-[#d6d3d1] dark:border-[#44403b] hover:bg-[#e7e5e4] dark:hover:bg-[#292524]',
    outline: 'bg-transparent text-[#171717] dark:text-[#f5f5f4] border border-[#d6d3d1] dark:border-[#44403b] hover:bg-[#f5f5f5] dark:hover:bg-[#171717]',
    destructive: 'bg-[#e7000b] text-white border border-[#e7000b] hover:bg-[#c10007]',
    ghost: 'bg-transparent text-[#171717] dark:text-[#f5f5f4] hover:bg-[#e7e5e4] dark:hover:bg-[#1c1917] border border-transparent',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin inline-block" />
          <span>LOADING...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
