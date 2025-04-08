import React, { useState, useEffect } from 'react';
import { detectOSFromFilename, getIconUrl, OSIconMapping } from '@/lib/osDetection';
import { FaLinux, FaWindows, FaApple, FaQuestionCircle } from 'react-icons/fa';

interface OsIconProps {
  filename: string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

const OsIcon: React.FC<OsIconProps> = ({ 
  filename, 
  size = 20, 
  className = '',
  showLabel = false
 }) => {
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [osInfo, setOsInfo] = useState<OSIconMapping | null>(null);

  useEffect(() => {
    // Reset states when filename changes
    setIsLoading(true);
    setError(false);
    
    // Detect OS type
    const detectedOs = detectOSFromFilename(filename);
    setOsInfo(detectedOs);
    
    if (detectedOs) {
      const iconUrl = getIconUrl(detectedOs);
      // Preload the image
      const img = new Image();
      img.onload = () => {
        setIconSrc(iconUrl);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError(true);
        setIsLoading(false);
      };
      img.src = iconUrl;
    } else {
      setError(true);
      setIsLoading(false);
    }
  }, [filename]);

  // Fallback icon based on filename
  const getFallbackIcon = () => {
    if (!filename) return <FaQuestionCircle />;
    
    const lcName = filename.toLowerCase();
    if (lcName.includes('windows') || lcName.includes('win')) return <FaWindows />;
    if (lcName.includes('mac') || lcName.includes('osx')) return <FaApple />;
    return <FaLinux />;
  };

  return (
    <div className={`flex items-center ${showLabel ? 'gap-2' : ''} ${className}`}>
      {isLoading ? (
        <div className="w-5 h-5 rounded-full bg-[#292e42] animate-pulse"></div>
      ) : error || !iconSrc ? (
        <div style={{ width: size, height: size }} className="text-[#a9b1d6]">
          {getFallbackIcon()}
        </div>
      ) : (
        <img 
          src={iconSrc} 
          alt={osInfo?.name || 'OS Icon'}
          width={size} 
          height={size} 
          className="object-contain" 
        />
      )}
      
      {showLabel && osInfo && (
        <span 
          className="text-sm font-medium" 
          style={{ color: osInfo.color }}
        >
          {osInfo.name}
        </span>
      )}
    </div>
  );
};

export default OsIcon;
