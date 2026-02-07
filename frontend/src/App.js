import React, { useEffect, useState } from "react";
import LoginPage from "./LoginPage";
import ItemsPage from "./ItemsPage";
import { setAuthToken } from "./api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const onLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  return (
    <div>
      {!token ? <LoginPage onLogin={onLogin} /> : <ItemsPage onLogout={onLogout} />}
    </div>
  );
}
