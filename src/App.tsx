import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MoneyTrackerPage from './features/money-tracker/MoneyTrackerPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/money-tracker"
            element={
              <ProtectedRoute>
                <MoneyTrackerPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/money-tracker" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
