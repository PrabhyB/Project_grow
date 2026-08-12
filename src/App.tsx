import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "./lib/firebase";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import GardenPage from "./pages/GardenPage";
import PlantPage from "./pages/PlantPage";

type ProtectedRouteProps = {
  user: User | null;
  children: React.ReactNode;
};

function ProtectedRoute({
  user,
  children,
}: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (authIsLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Loading GrowHub…
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/garden/:gardenId"
          element={
            <ProtectedRoute user={user}>
              <GardenPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/garden/:gardenId/plant/:plantId"
          element={
            <ProtectedRoute user={user}>
              <PlantPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}