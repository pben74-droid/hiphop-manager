"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div style={{ background: "#0a0a0a", height: "100vh" }}></div>
    );
  }

  return (
    <main
      style={{
        backgroundColor: "#0a0a0a",
        color: "#FFD700",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
        fontSize: "2rem",
      }}
    >
      Dashboard Hip Hop Manager
    </main>
  );
}
