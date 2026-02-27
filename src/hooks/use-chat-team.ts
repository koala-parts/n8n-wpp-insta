import { useCallback, useEffect, useState } from "react";

import { createBrowserSupabase } from "@/lib/supabase";

export type TransferUser = {
  id: string;
  name: string;
  role: string;
  email: string;
};

type UseChatTeamResult = {
  teamNames: Set<string>;
  transferUsers: TransferUser[];
  loadingUsers: boolean;
  loadTransferUsers: () => Promise<LoadTransferUsersResult>;
};

type LoadTransferUsersResult =
  | { users: TransferUser[] }
  | { error: unknown };

export function useChatTeam(): UseChatTeamResult {
  const [teamNames, setTeamNames] = useState<Set<string>>(new Set());
  const [transferUsers, setTransferUsers] = useState<TransferUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        const supabase = createBrowserSupabase();
        const { data, error } = await supabase
          .from("users")
          .select("name")
          .order("name", { ascending: true });

        if (error) {
          console.error("Erro ao carregar usuários:", error);
          return;
        }

        const names = new Set(
          (data ?? [])
            .map((row) => String(row.name ?? "").trim().toLowerCase())
            .filter(Boolean)
        );
        setTeamNames(names);
      } catch (loadError) {
        console.error("Erro ao carregar usuários:", loadError);
      }
    };

    loadTeamNames();
  }, []);

  const loadTransferUsers = useCallback(async (): Promise<LoadTransferUsersResult> => {
    try {
      setLoadingUsers(true);
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role, email")
        .neq("role", "admin")
        .order("name", { ascending: true });

      if (error) {
        return { error };
      }

      const users = (data ?? []) as TransferUser[];
      setTransferUsers(users);
      return { users };
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  return {
    teamNames,
    transferUsers,
    loadingUsers,
    loadTransferUsers,
  };
}
