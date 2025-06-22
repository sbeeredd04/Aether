import React from 'react';
import {
  Folder, Code, Database, Globe, Zap, Star, Heart, Coffee,
  Briefcase, BookOpen, Palette, Camera, Music, Gamepad2,
  Rocket, Target, Trophy, Shield, Lock, Settings, X
} from 'lucide-react';

interface IconOption {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
}

const availableIcons: IconOption[] = [
  { name: 'Folder', icon: Folder, color: 'from-blue-400 to-blue-600' },
  { name: 'Code', icon: Code, color: 'from-green-400 to-green-600' },
  { name: 'Database', icon: Database, color: 'from-purple-400 to-purple-600' },
  { name: 'Globe', icon: Globe, color: 'from-cyan-400 to-cyan-600' },
  { name: 'Zap', icon: Zap, color: 'from-yellow-400 to-yellow-600' },
  { name: 'Star', icon: Star, color: 'from-amber-400 to-amber-600' },
  { name: 'Heart', icon: Heart, color: 'from-red-400 to-red-600' },
  { name: 'Coffee', icon: Coffee, color: 'from-orange-400 to-orange-600' },
  { name: 'Briefcase', icon: Briefcase, color: 'from-slate-400 to-slate-600' },
  { name: 'BookOpen', icon: BookOpen, color: 'from-indigo-400 to-indigo-600' },
  { name: 'Palette', icon: Palette, color: 'from-pink-400 to-pink-600' },
  { name: 'Camera', icon: Camera, color: 'from-emerald-400 to-emerald-600' },
  { name: 'Music', icon: Music, color: 'from-violet-400 to-violet-600' },
  { name: 'Gamepad2', icon: Gamepad2, color: 'from-lime-400 to-lime-600' },
  { name: 'Rocket', icon: Rocket, color: 'from-sky-400 to-sky-600' },
  { name: 'Target', icon: Target, color: 'from-rose-400 to-rose-600' },
  { name: 'Trophy', icon: Trophy, color: 'from-yellow-400 to-amber-600' },
  { name: 'Shield', icon: Shield, color: 'from-teal-400 to-teal-600' },
  { name: 'Lock', icon: Lock, color: 'from-red-400 to-pink-600' },
  { name: 'Settings', icon: Settings, color: 'from-gray-400 to-gray-600' }
];

export default function IconPickerModal({ isOpen, onClose, onSelect, currentIcon }: IconPickerModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleIconSelect = (iconName: string) => {
    onSelect(iconName);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-medium text-xl">Choose Icon</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-all duration-200"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Icon Grid */}
        <div className="grid grid-cols-6 gap-3">
          {availableIcons.map((iconOption) => {
            const IconComponent = iconOption.icon;
            const isSelected = currentIcon === iconOption.name;
            
            return (
              <button
                key={iconOption.name}
                onClick={() => handleIconSelect(iconOption.name)}
                className={`
                  group relative p-4 rounded-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-400
                  ${isSelected 
                    ? 'bg-purple-600/30 ring-2 ring-purple-400 scale-105' 
                    : 'hover:bg-white/10 focus:bg-white/10'
                  }
                `}
                title={iconOption.name}
                aria-label={`Select ${iconOption.name} icon`}
              >
                <IconComponent 
                  size={24} 
                  className={`
                    transition-colors duration-200
                    ${isSelected ? 'text-purple-300' : 'text-white/80 group-hover:text-white'}
                  `} 
                />
                
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-black/90" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/60 text-sm text-center">
            Click an icon to select it for your workspace
          </p>
        </div>
      </div>
    </div>
  );
}
