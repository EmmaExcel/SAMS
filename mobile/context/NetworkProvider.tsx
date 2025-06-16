// components/NetworkProvider.tsx
import React, { createContext, useEffect, useState, useContext } from "react";
import NetInfo from "@react-native-community/netinfo";

type NetworkContextType = {
  isConnected: boolean;
};

const NetworkContext = createContext<NetworkContextType>({ isConnected: true });

export const NetworkProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
};

// Hook to use anywhere
export const useNetwork = () => useContext(NetworkContext);
