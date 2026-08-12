import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/app";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import AppRoutes from "./routes";
import ScrollCoordinator from "./components/common/ScrollCoordinator";

export default function App() {
  return (
    <AccessibilityProvider>
      <BrowserRouter>
        <ScrollCoordinator />
        <AppProvider>
          <ThemeProvider>
            <SettingsProvider>
              <AppRoutes />
            </SettingsProvider>
          </ThemeProvider>
        </AppProvider>
      </BrowserRouter>
    </AccessibilityProvider>
  );
}
