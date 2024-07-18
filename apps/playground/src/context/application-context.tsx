import { createContext, useContext } from "react";

export interface ApplicationContextValue {
  debugMode: boolean;
}

const ApplicationContext = createContext<ApplicationContextValue>({
  debugMode: false,
});

export const ApplicationContextProvider = ({
  children,
  debugMode = false,
}: {
  children: React.ReactNode;
  debugMode?: boolean;
}) => {
  return (
    <ApplicationContext.Provider value={{ debugMode }}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(ApplicationContext);
};
