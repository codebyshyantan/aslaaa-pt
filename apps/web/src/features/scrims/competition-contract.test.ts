import { describe, expect, it } from "vitest";

import { buildLobbyStandings, mergeStandings } from "@contracts/competition-contract";

describe("competition-contract", () => {
  it("ranks lobby entries by total points and kills", () => {
    const standings = buildLobbyStandings(
      [
        { kills: 3, position: 2, slotNumber: 1, teamName: "Team Alpha" },
        { kills: 1, position: 1, slotNumber: 2, teamName: "Team Bravo" },
      ],
      { killPointValue: 1, positionPoints: [15, 12] },
    );

    expect(standings[0]?.teamName).toBe("Team Bravo");
    expect(standings[0]?.totalPoints).toBe(16);
    expect(standings[1]?.teamName).toBe("Team Alpha");
  });

  it("merges repeated teams across lobbies", () => {
    const standings = mergeStandings(
      [
        {
          entries: [{ kills: 2, position: 1, slotNumber: 1, teamName: "Team Alpha" }],
          lobbyId: "l1",
          lobbyName: "Lobby 1",
        },
        {
          entries: [{ kills: 4, position: 2, slotNumber: 2, teamName: "Team Alpha" }],
          lobbyId: "l2",
          lobbyName: "Lobby 2",
        },
      ],
      { killPointValue: 1, positionPoints: [15, 12] },
    );

    expect(standings).toHaveLength(1);
    expect(standings[0]?.matchesPlayed).toBe(2);
    expect(standings[0]?.kills).toBe(6);
    expect(standings[0]?.totalPoints).toBe(33);
  });
});
