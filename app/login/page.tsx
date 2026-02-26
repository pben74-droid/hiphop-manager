"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Errore login: " + error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#FFD700",
        fontFamily: "Arial",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2>Login Gestionale</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />
        <button
          onClick={handleLogin}
          style={{
            backgroundColor: "#FFD700",
            color: "black",
            padding: 10,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Accedi
        </button>
      </div>
    </div>
  );
}
