// Global Menu Context - Ensures only one menu is open at a time
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MenuContextType {
  activeMenuId: string | null;
  setActiveMenu: (id: string | null) => void;
  closeActiveMenu: () => void;
}

const MenuContext = createContext<MenuContextType | null>(null);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const setActiveMenu = useCallback((id: string | null) => {
    setActiveMenuId(id);
  }, []);

  const closeActiveMenu = useCallback(() => {
    setActiveMenuId(null);
  }, []);

  return (
    <MenuContext.Provider value={{ activeMenuId, setActiveMenu, closeActiveMenu }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenuContext = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within MenuProvider');
  }
  return context;
};
