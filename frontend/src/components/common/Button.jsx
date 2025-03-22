import React from 'react';
import { Link } from 'react-router-dom';
import Loader from './Loader';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  to = null,
  href = null,
  target = '_self',
  onClick = () => {},
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  rounded = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center border font-medium shadow-sm focus:outline-none transition-colors duration-200';
  
  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border-transparent',
    secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 border-transparent',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 border-transparent',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 border-transparent',
    info: 'bg-blue-400 text-white hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 border-transparent',
    light: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 border-gray-200',
    dark: 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 border-transparent',
    outline: 'bg-transparent text-blue-600 hover:bg-blue-50 border-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    link: 'bg-transparent text-blue-600 hover:text-blue-800 hover:underline shadow-none border-transparent p-0',
  };
  
  // Size styles
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-6 py-3 text-base',
  };
  
  // Disabled and loading styles
  const stateStyles = (disabled || loading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';
  
  // Rounded styles
  const roundedStyles = rounded ? 'rounded-full' : 'rounded-md';
  
  // Full width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Combine all styles
  const buttonStyles = `${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${roundedStyles} ${stateStyles} ${widthStyles} ${className}`;
  
  // Render icon
  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <span className={`${iconPosition === 'left' ? 'mr-2' : 'ml-2'} ${size === 'xs' || size === 'sm' ? 'text-sm' : ''}`}>
        {icon}
      </span>
    );
  };
  
  // Render button content
  const buttonContent = (
    <>
      {loading ? (
        <Loader
          size={size === 'xs' || size === 'sm' ? 'sm' : 'md'}
          className={children ? 'mr-2' : ''}
        />
      ) : (
        iconPosition === 'left' && renderIcon()
      )}
      {children}
      {!loading && iconPosition === 'right' && renderIcon()}
    </>
  );
  
  // Render as link if "to" prop is provided (internal link)
  if (to) {
    return (
      <Link
        to={to}
        className={buttonStyles}
        {...props}
      >
        {buttonContent}
      </Link>
    );
  }
  
  // Render as anchor if "href" prop is provided (external link)
  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noreferrer noopener' : undefined}
        className={buttonStyles}
        {...props}
      >
        {buttonContent}
      </a>
    );
  }
  
  // Otherwise render as button
  return (
    <button
      type={type}
      className={buttonStyles}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {buttonContent}
    </button>
  );
};

export default Button;
