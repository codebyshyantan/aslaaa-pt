import type { Sql } from "postgres";

import type { MergeSourceCollection } from "../../../contracts/competition-contract.js";
import { LobbyStateConflictError, type ScrimsRepository } from "../scrims.repository.js";
import type {
  CreateGroupInput,
  CreateLobbyInput,
  CreateMergePresetInput,
  CreateScrimInput,
  CreateTierInput,
  GroupRecord,
  LobbyEntryRecord,
  LobbyRecord,
  MergePresetRecord,
  MergeSourceCollectionsResult,
  ReplaceLobbyEntriesInput,
  ScrimRecord,
  ScrimsState,
  TierRecord,
} from "../scrims.types.js";

type ScrimRow = {
  created_at: Date | string;
  description: string | null;
  id: string;
  is_active: boolean;
  name: string;
  slug: string;
  updated_at: Date | string;
};

type TierRow = {
  created_at: Date | string;
  id: string;
  name: string;
  scrim_id: string;
  sort_order: number;
  updated_at: Date | string;
};

type GroupRow = {
  created_at: Date | string;
  id: string;
  name: string;
  sort_order: number;
  tier_id: string;
  updated_at: Date | string;
};

type LobbyRow = {
  created_at: Date | string;
  group_id: string;
  id: string;
  last_updated_by_user_id: string | null;
  last_updated_by_username: string | null;
  name: string;
  sort_order: number;
  updated_at: Date | string;
};

type LobbyEntryRow = {
  created_at: Date | string;
  id: string;
  kills: number;
  lobby_id: string;
  normalized_team_name: string;
  placement_points: number;
  position: number | null;
  rank: number;
  slot_number: number | null;
  team_name: string;
  total_points: number;
  updated_at: Date | string;
};

type MergePresetRow = {
  created_at: Date | string;
  id: string;
  is_favorite: boolean;
  lobby_ids: string[];
  name: string;
  scrim_id: string;
  updated_at: Date | string;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapScrimRow(row: ScrimRow): ScrimRecord {
  return {
    createdAt: toIsoString(row.created_at),
    description: row.description,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    slug: row.slug,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapTierRow(row: TierRow): TierRecord {
  return {
    createdAt: toIsoString(row.created_at),
    id: row.id,
    name: row.name,
    scrimId: row.scrim_id,
    sortOrder: row.sort_order,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapGroupRow(row: GroupRow): GroupRecord {
  return {
    createdAt: toIsoString(row.created_at),
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    tierId: row.tier_id,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapLobbyRow(row: LobbyRow): LobbyRecord {
  return {
    createdAt: toIsoString(row.created_at),
    groupId: row.group_id,
    id: row.id,
    lastUpdatedByUserId: row.last_updated_by_user_id,
    lastUpdatedByUsername: row.last_updated_by_username,
    name: row.name,
    sortOrder: row.sort_order,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapLobbyEntryRow(row: LobbyEntryRow): LobbyEntryRecord {
  return {
    createdAt: toIsoString(row.created_at),
    id: row.id,
    kills: row.kills,
    lobbyId: row.lobby_id,
    normalizedTeamName: row.normalized_team_name,
    placementPoints: row.placement_points,
    position: row.position,
    rank: row.rank,
    slotNumber: row.slot_number,
    teamName: row.team_name,
    totalPoints: row.total_points,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapMergePresetRow(row: MergePresetRow): MergePresetRecord {
  return {
    createdAt: toIsoString(row.created_at),
    id: row.id,
    isFavorite: row.is_favorite,
    lobbyIds: row.lobby_ids ?? [],
    name: row.name,
    scrimId: row.scrim_id,
    updatedAt: toIsoString(row.updated_at),
  };
}

export class PostgresScrimsRepository implements ScrimsRepository {
  private constructor(private readonly sql: Sql) {}

  static fromSql(sql: Sql) {
    return new PostgresScrimsRepository(sql);
  }

  async clearLobbyEntriesForScrim(scrimId: string) {
    await this.sql`
      delete from lobby_entries
      where lobby_id in (
        select l.id
        from lobbies l
        inner join scrim_groups g on g.id = l.group_id
        inner join scrim_tiers t on t.id = g.tier_id
        where t.scrim_id = ${scrimId}
      )
    `;
  }

  async countEntriesForScrim(scrimId: string) {
    const [row] = await this.sql<Array<{ total: number }>>`
      select count(le.id)::int as total
      from lobby_entries le
      inner join lobbies l on l.id = le.lobby_id
      inner join scrim_groups g on g.id = l.group_id
      inner join scrim_tiers t on t.id = g.tier_id
      where t.scrim_id = ${scrimId}
    `;

    return row?.total ?? 0;
  }

  async createGroup(input: CreateGroupInput) {
    const [row] = await this.sql<GroupRow[]>`
      insert into scrim_groups (tier_id, name, sort_order, created_at, updated_at)
      values (${input.tierId}, ${input.name}, ${input.sortOrder}, ${input.createdAt}, ${input.updatedAt})
      returning id, tier_id, name, sort_order, created_at, updated_at
    `;

    if (!row) {
      throw new Error("Failed to create group.");
    }

    return mapGroupRow(row);
  }

  async createLobby(input: CreateLobbyInput) {
    const [row] = await this.sql<LobbyRow[]>`
      insert into lobbies (group_id, name, sort_order, created_at, updated_at)
      values (${input.groupId}, ${input.name}, ${input.sortOrder}, ${input.createdAt}, ${input.updatedAt})
      returning id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
    `;

    if (!row) {
      throw new Error("Failed to create lobby.");
    }

    return mapLobbyRow(row);
  }

  async createMergePreset(input: CreateMergePresetInput) {
    return this.sql.begin(async (transaction) => {
      if (input.isFavorite) {
        await transaction`
          update merge_presets
          set is_favorite = false
          where scrim_id = ${input.scrimId}
        `;
      }

      const [presetRow] = await transaction<MergePresetRow[]>`
        with inserted_preset as (
          insert into merge_presets (scrim_id, name, is_favorite, created_at, updated_at)
          values (${input.scrimId}, ${input.name}, ${input.isFavorite}, ${input.createdAt}, ${input.updatedAt})
          returning id, scrim_id, name, is_favorite, created_at, updated_at
        )
        select
          ip.id,
          ip.scrim_id,
          ip.name,
          ip.is_favorite,
          ip.created_at,
          ip.updated_at,
          array[]::uuid[]::text[] as lobby_ids
        from inserted_preset ip
      `;

      if (!presetRow) {
        throw new Error("Failed to create merge preset.");
      }

      for (const lobbyId of [...new Set(input.lobbyIds)]) {
        await transaction`
          insert into merge_preset_lobbies (preset_id, lobby_id, created_at)
          values (${presetRow.id}, ${lobbyId}, ${input.createdAt})
        `;
      }

      return {
        ...mapMergePresetRow(presetRow),
        lobbyIds: [...new Set(input.lobbyIds)],
      };
    });
  }

  async createScrim(input: CreateScrimInput) {
    const [row] = await this.sql<ScrimRow[]>`
      insert into scrims (name, slug, description, is_active, created_at, updated_at)
      values (${input.name}, ${input.slug}, ${input.description}, ${input.isActive}, ${input.createdAt}, ${input.updatedAt})
      returning id, name, slug, description, is_active, created_at, updated_at
    `;

    if (!row) {
      throw new Error("Failed to create scrim.");
    }

    return mapScrimRow(row);
  }

  async createTier(input: CreateTierInput) {
    const [row] = await this.sql<TierRow[]>`
      insert into scrim_tiers (scrim_id, name, sort_order, created_at, updated_at)
      values (${input.scrimId}, ${input.name}, ${input.sortOrder}, ${input.createdAt}, ${input.updatedAt})
      returning id, scrim_id, name, sort_order, created_at, updated_at
    `;

    if (!row) {
      throw new Error("Failed to create tier.");
    }

    return mapTierRow(row);
  }

  async deleteGroup(id: string) {
    const [row] = await this.sql<GroupRow[]>`
      delete from scrim_groups
      where id = ${id}
      returning id, tier_id, name, sort_order, created_at, updated_at
    `;

    return row ? mapGroupRow(row) : null;
  }

  async deleteLobby(id: string) {
    const [row] = await this.sql<LobbyRow[]>`
      delete from lobbies
      where id = ${id}
      returning id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
    `;

    return row ? mapLobbyRow(row) : null;
  }

  async deleteMergePreset(id: string) {
    const [row] = await this.sql<MergePresetRow[]>`
      with deleted_preset as (
        delete from merge_presets
        where id = ${id}
        returning id, scrim_id, name, is_favorite, created_at, updated_at
      )
      select
        dp.id,
        dp.scrim_id,
        dp.name,
        dp.is_favorite,
        dp.created_at,
        dp.updated_at,
        coalesce(
          array_agg(mpl.lobby_id order by mpl.lobby_id) filter (where mpl.lobby_id is not null),
          array[]::uuid[]
        )::text[] as lobby_ids
      from deleted_preset dp
      left join merge_preset_lobbies mpl on mpl.preset_id = dp.id
      group by dp.id
      limit 1
    `;

    return row ? mapMergePresetRow(row) : null;
  }

  async deleteScrim(id: string) {
    const [row] = await this.sql<ScrimRow[]>`
      delete from scrims
      where id = ${id}
      returning id, name, slug, description, is_active, created_at, updated_at
    `;

    return row ? mapScrimRow(row) : null;
  }

  async deleteTier(id: string) {
    const [row] = await this.sql<TierRow[]>`
      delete from scrim_tiers
      where id = ${id}
      returning id, scrim_id, name, sort_order, created_at, updated_at
    `;

    return row ? mapTierRow(row) : null;
  }

  async findGroupById(id: string) {
    const [row] = await this.sql<GroupRow[]>`
      select id, tier_id, name, sort_order, created_at, updated_at
      from scrim_groups
      where id = ${id}
      limit 1
    `;

    return row ? mapGroupRow(row) : null;
  }

  async findLobbyById(id: string) {
    const [row] = await this.sql<LobbyRow[]>`
      select id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
      from lobbies
      where id = ${id}
      limit 1
    `;

    return row ? mapLobbyRow(row) : null;
  }

  async findMergePresetById(id: string) {
    const [row] = await this.sql<MergePresetRow[]>`
      select
        mp.id,
        mp.scrim_id,
        mp.name,
        mp.is_favorite,
        mp.created_at,
        mp.updated_at,
        coalesce(
          array_agg(mpl.lobby_id order by mpl.lobby_id) filter (where mpl.lobby_id is not null),
          array[]::uuid[]
        )::text[] as lobby_ids
      from merge_presets mp
      left join merge_preset_lobbies mpl on mpl.preset_id = mp.id
      where mp.id = ${id}
      group by mp.id
      limit 1
    `;

    return row ? mapMergePresetRow(row) : null;
  }

  async findScrimById(id: string) {
    const [row] = await this.sql<ScrimRow[]>`
      select id, name, slug, description, is_active, created_at, updated_at
      from scrims
      where id = ${id}
      limit 1
    `;

    return row ? mapScrimRow(row) : null;
  }

  async findTierById(id: string) {
    const [row] = await this.sql<TierRow[]>`
      select id, scrim_id, name, sort_order, created_at, updated_at
      from scrim_tiers
      where id = ${id}
      limit 1
    `;

    return row ? mapTierRow(row) : null;
  }

  async getMergeSourceCollectionsByLobbyIds(lobbyIds: string[]): Promise<MergeSourceCollectionsResult> {
    const uniqueLobbyIds = [...new Set(lobbyIds)];

    if (uniqueLobbyIds.length === 0) {
      return {
        collections: [],
        preset: null,
      };
    }

    const lobbyRows = await this.sql<LobbyRow[]>`
      select id, group_id, name, sort_order, created_at, updated_at
      from lobbies
      where id = any(${this.sql.array(uniqueLobbyIds)})
      order by sort_order asc, name asc
    `;

    const entryRows = await this.sql<LobbyEntryRow[]>`
      select id, lobby_id, team_name, normalized_team_name, slot_number, position, kills, placement_points, total_points, rank, created_at, updated_at
      from lobby_entries
      where lobby_id = any(${this.sql.array(uniqueLobbyIds)})
      order by rank asc, team_name asc
    `;

    const collections: MergeSourceCollection[] = lobbyRows.map((lobbyRow) => ({
      entries: entryRows
        .filter((entry) => entry.lobby_id === lobbyRow.id)
        .map((entry) => ({
          kills: entry.kills,
          position: entry.position,
          slotNumber: entry.slot_number,
          teamName: entry.team_name,
        })),
      lobbyId: lobbyRow.id,
      lobbyName: lobbyRow.name,
    }));

    return {
      collections,
      preset: null,
    };
  }

  async getMergeSourceCollectionsByPresetId(presetId: string): Promise<MergeSourceCollectionsResult> {
    const preset = await this.findMergePresetById(presetId);

    if (!preset) {
      return {
        collections: [],
        preset: null,
      };
    }

    const collections = await this.getMergeSourceCollectionsByLobbyIds(preset.lobbyIds);
    return {
      collections: collections.collections,
      preset,
    };
  }

  async listState(): Promise<ScrimsState> {
    const [scrims, tiers, groups, lobbies, lobbyEntries, mergePresets] = await Promise.all([
      this.sql<ScrimRow[]>`
        select id, name, slug, description, is_active, created_at, updated_at
        from scrims
        order by name asc
      `,
      this.sql<TierRow[]>`
        select id, scrim_id, name, sort_order, created_at, updated_at
        from scrim_tiers
        order by sort_order asc, name asc
      `,
      this.sql<GroupRow[]>`
        select id, tier_id, name, sort_order, created_at, updated_at
        from scrim_groups
        order by sort_order asc, name asc
      `,
      this.sql<LobbyRow[]>`
        select id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
        from lobbies
        order by sort_order asc, name asc
      `,
      this.sql<LobbyEntryRow[]>`
        select id, lobby_id, team_name, normalized_team_name, slot_number, position, kills, placement_points, total_points, rank, created_at, updated_at
        from lobby_entries
        order by rank asc, team_name asc
      `,
      this.sql<MergePresetRow[]>`
        select
          mp.id,
          mp.scrim_id,
          mp.name,
          mp.is_favorite,
          mp.created_at,
          mp.updated_at,
          coalesce(
            array_agg(mpl.lobby_id order by mpl.lobby_id) filter (where mpl.lobby_id is not null),
            array[]::uuid[]
          )::text[] as lobby_ids
        from merge_presets mp
        left join merge_preset_lobbies mpl on mpl.preset_id = mp.id
        group by mp.id
        order by mp.name asc
      `,
    ]);

    return {
      groups: groups.map(mapGroupRow),
      lobbies: lobbies.map(mapLobbyRow),
      lobbyEntries: lobbyEntries.map(mapLobbyEntryRow),
      mergePresets: mergePresets.map(mapMergePresetRow),
      scrims: scrims.map(mapScrimRow),
      tiers: tiers.map(mapTierRow),
    };
  }

  async replaceLobbyEntries(input: ReplaceLobbyEntriesInput) {
    return this.sql.begin(async (transaction) => {
      const [lockedLobbyRow] = await transaction<LobbyRow[]>`
        select id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
        from lobbies
        where id = ${input.lobbyId}
        limit 1
        for update
      `;

      if (!lockedLobbyRow) {
        throw new Error("Lobby not found during update.");
      }

      const lockedLobby = mapLobbyRow(lockedLobbyRow);

      if (input.expectedUpdatedAt && lockedLobby.updatedAt !== input.expectedUpdatedAt) {
        throw new LobbyStateConflictError(lockedLobby, input.expectedUpdatedAt);
      }

      await transaction`
        delete from lobby_entries
        where lobby_id = ${input.lobbyId}
      `;

      const rows: LobbyEntryRecord[] = [];

      for (const entry of input.entries) {
        const [row] = await transaction<LobbyEntryRow[]>`
          insert into lobby_entries (
            lobby_id,
            team_name,
            normalized_team_name,
            slot_number,
            position,
            kills,
            placement_points,
            total_points,
            rank,
            created_at,
            updated_at
          )
          values (
            ${input.lobbyId},
            ${entry.teamName},
            ${entry.normalizedTeamName},
            ${entry.slotNumber},
            ${entry.position},
            ${entry.kills},
            ${entry.placementPoints},
            ${entry.totalPoints},
            ${entry.rank},
            ${entry.createdAt},
            ${entry.updatedAt}
          )
          returning id, lobby_id, team_name, normalized_team_name, slot_number, position, kills, placement_points, total_points, rank, created_at, updated_at
        `;

        if (row) {
          rows.push(mapLobbyEntryRow(row));
        }
      }

      const [updatedLobbyRow] = await transaction<LobbyRow[]>`
        update lobbies
        set
          updated_at = ${input.nextUpdatedAt},
          last_updated_by_user_id = ${input.lastUpdatedByUserId},
          last_updated_by_username = ${input.lastUpdatedByUsername}
        where id = ${input.lobbyId}
        returning id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
      `;

      if (!updatedLobbyRow) {
        throw new Error("Failed to update lobby metadata.");
      }

      return {
        entries: rows,
        lobby: mapLobbyRow(updatedLobbyRow),
      };
    });
  }

  async updateGroupName(id: string, name: string, updatedAt: string) {
    const [row] = await this.sql<GroupRow[]>`
      update scrim_groups
      set name = ${name}, updated_at = ${updatedAt}
      where id = ${id}
      returning id, tier_id, name, sort_order, created_at, updated_at
    `;

    return row ? mapGroupRow(row) : null;
  }

  async updateLobbyName(id: string, name: string, updatedAt: string) {
    const [row] = await this.sql<LobbyRow[]>`
      update lobbies
      set name = ${name}, updated_at = ${updatedAt}
      where id = ${id}
      returning id, group_id, name, sort_order, last_updated_by_user_id, last_updated_by_username, created_at, updated_at
    `;

    return row ? mapLobbyRow(row) : null;
  }

  async updateMergePresetName(id: string, name: string, updatedAt: string) {
    const [row] = await this.sql<MergePresetRow[]>`
      with updated_preset as (
        update merge_presets
        set name = ${name}, updated_at = ${updatedAt}
        where id = ${id}
        returning id, scrim_id, name, is_favorite, created_at, updated_at
      )
      select
        up.id,
        up.scrim_id,
        up.name,
        up.is_favorite,
        up.created_at,
        up.updated_at,
        coalesce(
          array_agg(mpl.lobby_id order by mpl.lobby_id) filter (where mpl.lobby_id is not null),
          array[]::uuid[]
        )::text[] as lobby_ids
      from updated_preset up
      left join merge_preset_lobbies mpl on mpl.preset_id = up.id
      group by up.id
      limit 1
    `;

    return row ? mapMergePresetRow(row) : null;
  }

  async updateScrim(id: string, name: string, slug: string, updatedAt: string) {
    const [row] = await this.sql<ScrimRow[]>`
      update scrims
      set name = ${name}, slug = ${slug}, updated_at = ${updatedAt}
      where id = ${id}
      returning id, name, slug, description, is_active, created_at, updated_at
    `;

    return row ? mapScrimRow(row) : null;
  }

  async updateTierName(id: string, name: string, updatedAt: string) {
    const [row] = await this.sql<TierRow[]>`
      update scrim_tiers
      set name = ${name}, updated_at = ${updatedAt}
      where id = ${id}
      returning id, scrim_id, name, sort_order, created_at, updated_at
    `;

    return row ? mapTierRow(row) : null;
  }
}
