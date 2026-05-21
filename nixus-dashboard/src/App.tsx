import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [session, setSession] = useState<{
    groupId: string;
    companyName: string;
    role: "leader" | "worker";
    workerName: string;
  } | null>(null);

  // Load session from localStorage on startup
  useEffect(() => {
    const cachedSession = localStorage.getItem("nixus_command_session");
    if (cachedSession) {
      try {
        setSession(JSON.parse(cachedSession));
      } catch (err) {
        console.error("Failed to restore cached session", err);
        localStorage.removeItem("nixus_command_session");
      }
    }
  }, []);

  const handleLoginSuccess = (userSession: typeof session) => {
    setSession(userSession);
    if (userSession) {
      localStorage.setItem("nixus_command_session", JSON.stringify(userSession));
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("nixus_command_session");
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-200">
      {session ? (
        <Dashboard session={session} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
