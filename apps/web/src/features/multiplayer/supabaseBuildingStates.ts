import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseMultiplayerEnabled } from "./supabaseMultiplayer";

export type WorldBuildingStateRow = {
  building_id: string;
  owner_player_id: string | null;
  state: Record<string, unknown>;
  updated_at: string;
};

export function isBuildingStateSyncEnabled() {
  return isSupabaseMultiplayerEnabled();
}

export function getBuildingStateClient() {
  return getSupabaseClient();
}

export async function fetchWorldBuildingState<T extends Record<string, unknown>>(
  client: SupabaseClient,
  buildingId: string,
): Promise<T | null> {
  const { data, error } = await client
    .from("world_building_states")
    .select("state")
    .eq("building_id", buildingId)
    .maybeSingle();

  if (error || !data?.state) return null;
  return data.state as T;
}

export async function upsertWorldBuildingState<T extends Record<string, unknown>>(
  client: SupabaseClient,
  buildingId: string,
  ownerPlayerId: string | null,
  state: T,
) {
  await client.from("world_building_states").upsert({
    building_id: buildingId,
    owner_player_id: ownerPlayerId,
    state,
    updated_at: new Date().toISOString(),
  });
}

export function subscribeWorldBuildingState(
  client: SupabaseClient,
  buildingId: string,
  onChange: (state: Record<string, unknown>) => void,
): RealtimeChannel {
  return client
    .channel(`world_building_state_${buildingId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "world_building_states", filter: `building_id=eq.${buildingId}` },
      (payload) => {
        const row = payload.new as WorldBuildingStateRow | null;
        if (row?.state) onChange(row.state);
      },
    )
    .subscribe();
}
