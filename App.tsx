
import React, { useState, useEffect } from 'react';
import type { User } from './types';
import { authService } from './services/firebaseService';
import MapView from './components/MapView';
import NewListingForm from './components/NewListingForm';
import IsoBoard from './components/IsoBoard';
import Gallery from './components/Gallery';
import Profile from './components/Profile';
import Auth from './components/Auth';
import { MapPinIcon, PlusCircleIcon, SearchIcon, ImageIcon } from './components/icons';

type View = 'map' | 'newListing' | 'isoBoard' | 'gallery' | 'profile';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<View>('map');

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(firebaseUser => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'map':
        return <MapView user={user} />;
      case 'newListing':
        if (user) {
            return <NewListingForm user={user} onListingCreated={() => setCurrentView('map')} />;
        }
        return null;
      case 'isoBoard':
        return <IsoBoard user={user} />;
      case 'gallery':
        return <Gallery />;
      case 'profile':
        if (user) {
          return <Profile user={user} />;
        }
        return null;
      default:
        return <MapView user={user} />;
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const NavItem: React.FC<{
    label: string, 
    icon: React.ReactNode, 
    view: View, 
    isActive: boolean, 
    onClick: (view: View) => void
  }> = ({ label, icon, view, isActive, onClick }) => (
    <button
      onClick={() => onClick(view)}
      className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
        isActive
          ? 'bg-teal-100 text-teal-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-teal-700">Re-Thread</h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-2 sm:gap-4">
                 <NavItem label="Map" icon={<MapPinIcon className="w-5 h-5"/>} view="map" isActive={currentView === 'map'} onClick={setCurrentView} />
                 <NavItem label="ISO Board" icon={<SearchIcon className="w-5 h-5"/>} view="isoBoard" isActive={currentView === 'isoBoard'} onClick={setCurrentView} />
                 <NavItem label="Gallery" icon={<ImageIcon className="w-5 h-5"/>} view="gallery" isActive={currentView === 'gallery'} onClick={setCurrentView} />
              </nav>
              <div className="border-l border-gray-200 pl-4 flex items-center gap-4">
                 <button onClick={() => setCurrentView('newListing')} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition shadow-sm">
                    <PlusCircleIcon className="w-5 h-5"/>
                    <span className="hidden md:inline">New Listing</span>
                </button>
                <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentView('profile')}
                      className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700 hover:bg-teal-200 transition cursor-pointer"
                      title="View Profile"
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </button>
                    <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">Sign Out</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        {renderView()}
      </main>
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} The Re-Thread Fabric Exchange. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default App;
