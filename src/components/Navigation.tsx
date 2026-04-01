import React from 'react';
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Explore, ExploreOutlined,
  Garage, GarageOutlined,
  CalendarToday, CalendarTodayOutlined,
  Person, PersonOutlined
} from '@mui/icons-material';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'explore', label: 'Explore', activeIcon: <Explore />, inactiveIcon: <ExploreOutlined /> },
    { id: 'myslots', label: 'My Slots', activeIcon: <Garage />, inactiveIcon: <GarageOutlined /> },
    { id: 'bookings', label: 'Bookings', activeIcon: <CalendarToday />, inactiveIcon: <CalendarTodayOutlined /> },
    { id: 'profile', label: 'Profile', activeIcon: <Person />, inactiveIcon: <PersonOutlined /> },
  ];

  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      zIndex: 1000,
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(40px)',
      borderTop: '1px solid rgba(0, 0, 0, 0.05)',
      pb: 'env(safe-area-inset-bottom)'
    }}>
      <BottomNavigation
        showLabels
        value={activeTab}
        onChange={(_event, newValue) => {
          setActiveTab(newValue);
        }}
        sx={{
          height: 80,
          backgroundColor: 'transparent',
          fontFamily: '"Roboto", sans-serif',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '12px 0',
            color: '#44474E',
            '&.Mui-selected': {
              color: '#007AFF',
              '& .MuiBottomNavigationAction-label': {
                fontWeight: 700,
              }
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontFamily: '"Roboto", sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            marginTop: '4px',
            '&.Mui-selected': {
              fontSize: '12px',
            },
          },
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.id}
            label={item.label}
            value={item.id}
            icon={
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 32 }}>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="nav-pill"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#D3E3FD',
                      borderRadius: 16,
                      zIndex: 0,
                    }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                  {activeTab === item.id ? item.activeIcon : item.inactiveIcon}
                </Box>
              </Box>
            }
          />
        ))}
      </BottomNavigation>
    </Box>
  );
};

export default Navigation;
