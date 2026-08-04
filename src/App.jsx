import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/app";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import AppRoutes from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppRoutes />
          </SettingsProvider>
        </ThemeProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
