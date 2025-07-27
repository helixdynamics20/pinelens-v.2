import React from 'react';
import { Search, User, Zap, BarChart3, Grid3X3 } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  connectedServicesCount: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView,
  onViewChange,
  connectedServicesCount
}) => {
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
              <p className="text-xs text-gray-500 -mt-1">Unified Search Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => onViewChange('search')}
              className={`flex items-center space-x-2 transition-colors ${
                currentView === 'search' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
            <button 
              onClick={() => onViewChange('analytics')}
              className={`flex items-center space-x-2 transition-colors ${
                currentView === 'analytics' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button 
              onClick={() => onViewChange('integrations')}
              className={`flex items-center space-x-2 transition-colors ${
                currentView === 'integrations' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Integrations</span>
            </button>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Services Status */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`w-2 h-2 rounded-full ${
                connectedServicesCount > 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>{connectedServicesCount} services</span>
            </div>

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Profile */}
            <button className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="w-5 h-5" />
              <span className="hidden lg:block text-sm font-medium">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
