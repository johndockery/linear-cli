import { LinearClient } from "@linear/sdk";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.LINEAR_API_KEY) {
  throw new Error("LINEAR_API_KEY not found in environment");
}

const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

interface LinearToolInput {
  command:
    | "create-issue"
    | "update-issue"
    | "list-teams"
    | "list-projects"
    | "get-issue";
  args?: {
    title?: string;
    projectId?: string;
    teamId?: string;
    description?: string;
    stateId?: string;
    labelIds?: string[];
    assigneeId?: string;
    priority?: number;
    issueId?: string;
    json?: boolean;
  };
}

export async function linearTool(input: LinearToolInput): Promise<any> {
  try {
    switch (input.command) {
      case "create-issue": {
        if (
          !input.args?.title ||
          !input.args?.projectId ||
          !input.args?.teamId
        ) {
          throw new Error("Missing required arguments for create-issue");
        }

        const response = await linearClient.createIssue({
          title: input.args.title,
          projectId: input.args.projectId,
          teamId: input.args.teamId,
          description: input.args.description,
          stateId: input.args.stateId,
          labelIds: input.args.labelIds,
          assigneeId: input.args.assigneeId,
          priority: input.args.priority,
        });

        const createdIssue = await response.issue;
        if (!createdIssue) {
          throw new Error("Failed to create issue");
        }

        return {
          id: createdIssue.id,
          title: createdIssue.title,
          url: createdIssue.url,
        };
      }

      case "update-issue": {
        if (!input.args?.issueId) {
          throw new Error("Missing required arguments for update-issue");
        }

        const response = await linearClient.updateIssue(input.args.issueId, {
          title: input.args.title,
          description: input.args.description,
          stateId: input.args.stateId,
          labelIds: input.args.labelIds,
          assigneeId: input.args.assigneeId,
          priority: input.args.priority,
        });

        const updatedIssue = await response.issue;
        if (!updatedIssue) {
          throw new Error("Failed to update issue");
        }

        return {
          id: updatedIssue.id,
          title: updatedIssue.title,
          url: updatedIssue.url,
        };
      }

      case "list-teams": {
        const teamsConnection = await linearClient.teams();
        const teams = teamsConnection.nodes;

        return input.args?.json
          ? teams
          : teams.map((team) => ({
              name: team.name,
              id: team.id,
              key: team.key,
            }));
      }

      case "list-projects": {
        const projectsConnection = await linearClient.projects();
        const projects = projectsConnection.nodes;

        // If team ID is provided, fetch the team's projects
        const filteredProjects = input.args?.teamId
          ? await Promise.all(
              projects.map(async (project) => {
                const projectTeams = await project.teams();
                return projectTeams.nodes.some(
                  (team) => team.id === input.args?.teamId
                )
                  ? project
                  : null;
              })
            ).then((results) =>
              results.filter((p): p is (typeof projects)[0] => p !== null)
            )
          : projects;

        return input.args?.json
          ? filteredProjects
          : filteredProjects.map((project) => ({
              name: project.name,
              id: project.id,
              state: project.state,
            }));
      }

      case "get-issue": {
        if (!input.args?.issueId) {
          throw new Error("Missing required arguments for get-issue");
        }

        const issue = await linearClient.issue(input.args.issueId);
        if (!issue) {
          throw new Error(`Issue ${input.args.issueId} not found`);
        }

        if (input.args.json) {
          return issue;
        }

        const [state, assignee] = await Promise.all([
          issue.state,
          issue.assignee,
        ]);

        const stateName = state ? await state.name : "Unknown";
        const assigneeName = assignee ? await assignee.name : "Unassigned";

        return {
          title: issue.title,
          id: issue.id,
          state: stateName,
          assignee: assigneeName,
          priority: issue.priority || "None",
          url: issue.url,
        };
      }

      default:
        throw new Error(`Unknown command: ${input.command}`);
    }
  } catch (error) {
    console.error(`Error executing Linear command: ${error}`);
    throw error;
  }
}
