import React from 'react';
import { Search, Settings, Bell, User, Zap } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick, currentView, onViewChange }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                PineLens
              </h1>
              <p className="text-xs text-gray-500 -mt-1">AI-Powered Search</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => onViewChange('dashboard')}
              className={`transition-colors ${
                currentView === 'dashboard' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => onViewChange('analytics')}
              className={`transition-colors ${
                currentView === 'analytics' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Analytics
            </button>
            <button 
              onClick={() => onViewChange('integrations')}
              className={`transition-colors ${
                currentView === 'integrations' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Integrations
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            
            <button
              onClick={onSettingsClick}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <button className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                Admin
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};