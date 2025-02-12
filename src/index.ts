#!/usr/bin/env node

import {
  LinearClient,
  Team,
  Project,
  Issue,
  TeamConnection,
  ProjectConnection,
} from "@linear/sdk";
import { Command } from "commander";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Try loading API key from different sources
function getApiKey(): string {
  // 1. Try command line argument first (highest priority)
  const args = process.argv.slice(2);
  const apiKeyArgIndex = args.indexOf("--api-key");
  if (apiKeyArgIndex !== -1 && args[apiKeyArgIndex + 1]) {
    return args[apiKeyArgIndex + 1];
  }

  // 2. Try environment variable
  if (process.env.LINEAR_API_KEY) {
    return process.env.LINEAR_API_KEY;
  }

  // 3. Try .linear-cli config in home directory
  const homeConfigPath = join(homedir(), ".linear-cli");
  if (existsSync(homeConfigPath)) {
    try {
      const config = JSON.parse(readFileSync(homeConfigPath, "utf8"));
      if (config.apiKey) {
        return config.apiKey;
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
  }

  throw new Error(
    "Linear API key not found. Please provide it using one of these methods:\n" +
      "1. --api-key command line argument\n" +
      "2. LINEAR_API_KEY environment variable\n" +
      "3. ~/.linear-cli config file (create using 'linear init --api-key <key>')"
  );
}

const program = new Command();

program
  .name("linear-cli")
  .description("CLI tool for interacting with Linear")
  .version("1.0.0");

let linearClient: LinearClient;

// Middleware to ensure API key is set before any command
program.hook("preAction", (thisCommand) => {
  // Skip API key validation for init command
  if (thisCommand.name() === 'init') {
    return;
  }
  const apiKey = getApiKey();
  linearClient = new LinearClient({ apiKey });
});

program
  .command("init")
  .description("Initialize Linear CLI configuration")
  .requiredOption("--api-key <key>", "Linear API key")
  .action(async (options) => {
    try {
      // Verify the API key works
      const client = new LinearClient({ apiKey: options.apiKey });
      await client.viewer;

      // Save to config file
      const configPath = join(homedir(), ".linear-cli");
      const config = JSON.stringify({ apiKey: options.apiKey }, null, 2);
      await import("fs/promises").then((fs) =>
        fs.writeFile(configPath, config, "utf8")
      );

      console.log("✓ Configuration saved successfully");
    } catch (error) {
      console.error("Error initializing configuration:", error);
      process.exit(1);
    }
  });

program
  .command("create-issue")
  .description("Create a new issue")
  .requiredOption("-t, --title <title>", "Issue title")
  .requiredOption("-p, --project-id <projectId>", "Project ID")
  .requiredOption("--team-id <teamId>", "Team ID")
  .option("-d, --description <description>", "Issue description")
  .option("-s, --state-id <stateId>", "State ID")
  .option("--labels <labels>", "Comma-separated list of label IDs")
  .option("--assignee <assigneeId>", "Assignee user ID")
  .option("--priority <priority>", "Issue priority (0-4)")
  .action(async (options) => {
    try {
      console.log("Creating issue...");

      const labels = options.labels
        ?.split(",")
        .map((label: string) => label.trim());
      const priority = options.priority
        ? parseInt(options.priority)
        : undefined;

      if (priority !== undefined && (priority < 0 || priority > 4)) {
        throw new Error("Priority must be between 0 and 4");
      }

      const response = await linearClient.createIssue({
        title: options.title,
        projectId: options.projectId,
        teamId: options.teamId,
        description: options.description,
        stateId: options.stateId,
        labelIds: labels,
        assigneeId: options.assignee,
        priority,
      });

      const createdIssue = await response.issue;
      if (!createdIssue) {
        throw new Error("Failed to create issue");
      }

      console.log("✓ Created issue:");
      console.log({
        id: createdIssue.id,
        title: createdIssue.title,
        url: createdIssue.url,
      });
    } catch (error) {
      console.error("Error creating issue:", error);
      process.exit(1);
    }
  });

program
  .command("update-issue")
  .description("Update an existing issue")
  .requiredOption("-i, --issue-id <issueId>", "Issue ID")
  .option("-t, --title <title>", "New title")
  .option("-d, --description <description>", "New description")
  .option("-s, --state-id <stateId>", "New state ID")
  .option("--labels <labels>", "Comma-separated list of label IDs")
  .option("--assignee <assigneeId>", "Assignee user ID")
  .option("--priority <priority>", "Issue priority (0-4)")
  .action(async (options) => {
    try {
      console.log("Updating issue...");

      const labels = options.labels
        ?.split(",")
        .map((label: string) => label.trim());
      const priority = options.priority
        ? parseInt(options.priority)
        : undefined;

      if (priority !== undefined && (priority < 0 || priority > 4)) {
        throw new Error("Priority must be between 0 and 4");
      }

      const response = await linearClient.updateIssue(options.issueId, {
        title: options.title,
        description: options.description,
        stateId: options.stateId,
        labelIds: labels,
        assigneeId: options.assignee,
        priority,
      });

      const updatedIssue = await response.issue;
      if (!updatedIssue) {
        throw new Error("Failed to update issue");
      }

      console.log("✓ Updated issue:");
      console.log({
        id: updatedIssue.id,
        title: updatedIssue.title,
        url: updatedIssue.url,
      });
    } catch (error) {
      console.error("Error updating issue:", error);
      process.exit(1);
    }
  });

program
  .command("list-teams")
  .description("List all teams")
  .option("--json", "Output in JSON format")
  .action(async (options) => {
    try {
      const teamsConnection = await linearClient.teams();
      const teams = teamsConnection.nodes;

      if (options.json) {
        console.log(JSON.stringify(teams, null, 2));
        return;
      }

      console.log("\nTeams:");
      teams.forEach((team) => {
        console.log(`\n${team.name}`);
        console.log(`ID: ${team.id}`);
        console.log(`Key: ${team.key}`);
      });
    } catch (error) {
      console.error("Error listing teams:", error);
      process.exit(1);
    }
  });

program
  .command("list-projects")
  .description("List all projects")
  .option("--json", "Output in JSON format")
  .option("--team <teamId>", "Filter by team ID")
  .action(async (options) => {
    try {
      const projectsConnection = await linearClient.projects();
      const projects = projectsConnection.nodes;

      // If team ID is provided, fetch the team's projects
      const filteredProjects = options.team
        ? await Promise.all(
            projects.map(async (project) => {
              const projectTeams = await project.teams();
              return projectTeams.nodes.some((team) => team.id === options.team)
                ? project
                : null;
            })
          ).then((results) => results.filter((p): p is Project => p !== null))
        : projects;

      if (options.json) {
        console.log(JSON.stringify(filteredProjects, null, 2));
        return;
      }

      console.log("\nProjects:");
      filteredProjects.forEach((project) => {
        console.log(`\n${project.name}`);
        console.log(`ID: ${project.id}`);
        console.log(`State: ${project.state}`);
      });
    } catch (error) {
      console.error("Error listing projects:", error);
      process.exit(1);
    }
  });

program
  .command("get-issue")
  .description("Get issue details")
  .requiredOption("-i, --issue-id <issueId>", "Issue ID")
  .option("--json", "Output in JSON format")
  .action(async (options) => {
    try {
      const issue = await linearClient.issue(options.issueId);

      if (options.json) {
        console.log(JSON.stringify(issue, null, 2));
        return;
      }

      if (!issue) {
        throw new Error(`Issue ${options.issueId} not found`);
      }

      const [state, assignee] = await Promise.all([
        issue.state,
        issue.assignee,
      ]);

      const stateName = state ? await state.name : "Unknown";
      const assigneeName = assignee ? await assignee.name : "Unassigned";

      console.log("\nIssue Details:");
      console.log(`\n${issue.title}`);
      console.log(`ID: ${issue.id}`);
      console.log(`State: ${stateName}`);
      console.log(`Assignee: ${assigneeName}`);
      console.log(`Priority: ${issue.priority || "None"}`);
      console.log(`URL: ${issue.url}`);
    } catch (error) {
      console.error("Error getting issue:", error);
      process.exit(1);
    }
  });

program.parse();
