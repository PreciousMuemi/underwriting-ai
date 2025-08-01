import React from 'react'
import { useTranslation } from 'react-i18next'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = ''
}) => {
  const { t } = useTranslation()

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const displayText = text || t('common.loading')

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}
      />
      {displayText && (
        <p className="mt-4 text-sm text-gray-600 font-medium">
          {displayText}
        </p>
      )}
    </div>
  )
}

export default LoadingSpinner