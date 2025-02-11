import { linearTool } from "./tool.js";

async function test() {
  try {
    // List teams
    console.log("\nListing teams:");
    const teams = await linearTool({ command: "list-teams" });
    console.log(teams);

    // List projects
    console.log("\nListing projects:");
    const projects = await linearTool({ command: "list-projects" });
    console.log(projects);

    // If we have a team, try filtering projects by team
    if (teams.length > 0) {
      console.log(`\nListing projects for team ${teams[0].id}:`);
      const teamProjects = await linearTool({
        command: "list-projects",
        args: { teamId: teams[0].id },
      });
      console.log(teamProjects);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
