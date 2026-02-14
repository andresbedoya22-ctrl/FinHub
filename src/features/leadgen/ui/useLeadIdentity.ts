"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export type LeadIdentity = {
  loading: boolean;
  loggedIn: boolean;
  email: string;
  fullName: string;
};

export function useLeadIdentity(): LeadIdentity {
  const [state, setState] = useState<LeadIdentity>({
    loading: true,
    loggedIn: false,
    email: "",
    fullName: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const supabase = createSupabaseBrowserClient();
        const u = await supabase.auth.getUser();
        const user = u.data.user;
        if (!cancelled && user) {
          const fullName =
            (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
            (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
            "";
          setState({
            loading: false,
            loggedIn: true,
            email: user.email ?? "",
            fullName,
          });
          return;
        }
      } catch {
        // no-op
      }
      if (!cancelled) {
        setState({ loading: false, loggedIn: false, email: "", fullName: "" });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
