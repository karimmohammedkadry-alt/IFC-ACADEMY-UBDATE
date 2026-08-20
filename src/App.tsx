import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar, NavTab } from './components/Navbar';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PlayersView } from './views/PlayersView';
import { PlayerProfileView } from './views/PlayerProfileView';
import { AddEditPlayerModal } from './views/AddEditPlayerModal';
import { PaymentsView } from './views/PaymentsView';
import { AttendanceView } from './views/AttendanceView';
import { FinancialReportsView } from './views/FinancialReportsView';
import { CoachesView } from './views/CoachesView';
import { ActivityLogsView } from './views/ActivityLogsView';
import { SettingsView } from './views/SettingsView';
import { Footer } from './components/Footer';
import { Player } from './types';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isInitialBoot, setIsInitialBoot] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    const saved = localStorage.getItem('ifc_active_tab');
    if (saved && ['dashboard', 'players', 'player-profile', 'payments', 'financial', 'coaches', 'attendance', 'activity-logs', 'settings'].includes(saved)) {
      return saved as NavTab;
    }
    return 'dashboard';
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(() => {
    return localStorage.getItem('ifc_active_player_id') || null;
  });

  // Player Add/Edit Modal
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);

  React.useEffect(() => {
    localStorage.setItem('ifc_active_tab', currentTab);
  }, [currentTab]);

  React.useEffect(() => {
    if (selectedPlayerId) {
      localStorage.setItem('ifc_active_player_id', selectedPlayerId);
    } else {
      localStorage.removeItem('ifc_active_player_id');
    }
  }, [selectedPlayerId]);

  if (isInitialBoot || isLoading) {
    return <LoadingScreen onComplete={() => setIsInitialBoot(false)} />;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    setCurrentTab('player-profile');
  };

  const handleOpenAddPlayer = () => {
    setPlayerToEdit(null);
    setIsPlayerModalOpen(true);
  };

  const handleOpenEditPlayer = (player: Player) => {
    setPlayerToEdit(player);
    setIsPlayerModalOpen(true);
  };

  const handlePlayerSaved = (player: Player) => {
    if (selectedPlayerId === player.id) {
      setSelectedPlayerId(player.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f5] font-sans selection:bg-yellow-400 selection:text-black antialiased flex flex-col">
      {/* Top Fixed Sticky Navbar (NO SIDEBAR) */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={tab => {
          if (tab !== 'player-profile') {
            setSelectedPlayerId(null);
          }
          setCurrentTab(tab);
        }}
        onSelectPlayer={handleSelectPlayer}
      />

      {/* Main Page Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={tab => setCurrentTab(tab)}
            onOpenAddPlayer={handleOpenAddPlayer}
          />
        )}

        {currentTab === 'players' && (
          <PlayersView
            onSelectPlayer={handleSelectPlayer}
            onOpenAddPlayer={handleOpenAddPlayer}
            onEditPlayer={handleOpenEditPlayer}
          />
        )}

        {currentTab === 'player-profile' && selectedPlayerId && (
          <PlayerProfileView
            playerId={selectedPlayerId}
            onBack={() => setCurrentTab('players')}
            onEditPlayer={handleOpenEditPlayer}
            onOpenAddPayment={() => {
              setCurrentTab('payments');
            }}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsView onSelectPlayer={handleSelectPlayer} />
        )}

        {currentTab === 'financial' && (
          <FinancialReportsView />
        )}

        {currentTab === 'coaches' && (
          <CoachesView onNavigateToFinancial={() => setCurrentTab('financial')} />
        )}

        {currentTab === 'attendance' && (
          <AttendanceView onSelectPlayer={handleSelectPlayer} />
        )}

        {currentTab === 'activity-logs' && (
          <ActivityLogsView />
        )}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Footer */}
      <Footer className="mt-12" />

      {/* Global Add/Edit Player Modal */}
      <AddEditPlayerModal
        isOpen={isPlayerModalOpen}
        playerToEdit={playerToEdit}
        onClose={() => {
          setIsPlayerModalOpen(false);
          setPlayerToEdit(null);
        }}
        onSaved={handlePlayerSaved}
      />
    </div>
  );
};


export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
