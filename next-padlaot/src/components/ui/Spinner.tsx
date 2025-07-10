'use client';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  fullPage?: boolean;
}

const SIZES = {
  small: 'w-4 h-4',
  medium: 'w-8 h-8',
  large: 'w-12 h-12'
};

export function Spinner({ 
  size = 'medium', 
  text, 
  className = '',
  fullPage = false 
}: SpinnerProps) {
  const spinnerContent = (
    <>
      <div
        className={`
          inline-block animate-spin rounded-full
          border-4 border-solid border-current
          border-l-transparent
          text-blue-600
          ${SIZES[size]}
          ${className}
        `}
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {text && (
        <p className="mt-2 text-sm text-gray-500">{text}</p>
      )}
    </>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-50">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {spinnerContent}
    </div>
  );
} 