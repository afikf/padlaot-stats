'use client';

interface BaseSkeletonProps {
  className?: string;
}

interface TextSkeletonProps extends BaseSkeletonProps {
  lines?: number;
  width?: string;
}

interface CircleSkeletonProps extends BaseSkeletonProps {
  size?: number;
}

interface RectSkeletonProps extends BaseSkeletonProps {
  width?: string | number;
  height?: string | number;
}

const baseClass = 'animate-pulse bg-gray-200 rounded';

function Text({ lines = 1, width = 'full', className = '' }: TextSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`
            ${baseClass} h-4
            ${width === 'full' ? 'w-full' : `w-${width}`}
            ${i === lines - 1 && lines > 1 ? 'w-3/4' : ''} 
            ${className}
          `}
        />
      ))}
    </div>
  );
}

function Circle({ size = 40, className = '' }: CircleSkeletonProps) {
  return (
    <div
      className={`${baseClass} rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Rectangle({ 
  width = '100%', 
  height = '200px',
  className = '' 
}: RectSkeletonProps) {
  return (
    <div
      className={`${baseClass} ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
}

// Card skeleton with common card layout
function Card({ className = '' }: BaseSkeletonProps) {
  return (
    <div className={`${baseClass} p-4 rounded-lg space-y-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <Circle size={40} />
        <div className="space-y-2 flex-1">
          <Rectangle height={10} className="w-1/4" />
          <Rectangle height={10} className="w-1/2" />
        </div>
      </div>
      <Rectangle height={150} />
      <div className="space-y-2">
        <Rectangle height={10} />
        <Rectangle height={10} className="w-3/4" />
      </div>
    </div>
  );
}

// List item skeleton
function ListItem({ className = '' }: BaseSkeletonProps) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <Circle size={32} />
      <div className="flex-1">
        <Rectangle height={12} className="w-3/4 mb-2" />
        <Rectangle height={8} className="w-1/2" />
      </div>
    </div>
  );
}

// Export all components
export const Skeleton = {
  Text,
  Circle,
  Rectangle,
  Card,
  ListItem
}; 