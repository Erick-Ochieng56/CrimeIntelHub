import React from 'react';

const Card = ({
  children,
  className = '',
  padding = false,
  noBorder = false,
  noShadow = false,
  variant = 'default',
  onClick = null,
  ...rest
}) => {
  // Base styles for the card
  const baseStyles = 'bg-white rounded-lg overflow-hidden';
  
  // Shadow styles
  const shadowStyles = noShadow ? '' : 'shadow-md';
  
  // Border styles
  const borderStyles = noBorder ? '' : 'border border-gray-200';
  
  // Padding styles (if padding is true or a padding value is provided)
  const paddingStyles = padding ? (typeof padding === 'string' ? padding : 'p-6') : '';
  
  // Variant specific styles
  const variantStyles = {
    default: '',
    primary: 'border-blue-500 border-l-4',
    success: 'border-green-500 border-l-4',
    danger: 'border-red-500 border-l-4',
    warning: 'border-yellow-500 border-l-4',
    info: 'border-blue-400 border-l-4',
  };
  
  // Interactive styles
  const interactiveStyles = onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-lg' : '';
  
  // Combine all styles
  const cardStyles = `${baseStyles} ${shadowStyles} ${borderStyles} ${paddingStyles} ${variantStyles[variant]} ${interactiveStyles} ${className}`;
  
  return (
    <div className={cardStyles} onClick={onClick} {...rest}>
      {children}
    </div>
  );
};

export default Card;
