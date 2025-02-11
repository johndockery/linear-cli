# Linear CLI

A command-line interface for interacting with Linear.

## Installation

```bash
npm install -g @summer-health/linear-cli
```

## Configuration

You can provide your Linear API key in several ways (in order of priority):

1. Command-line argument:

```bash
linear --api-key your_api_key_here list-teams
```

2. Environment variable:

```bash
export LINEAR_API_KEY=your_api_key_here
linear list-teams
```

3. Configuration file (recommended):

```bash
linear init --api-key your_api_key_here
```

This will save your API key in `~/.linear-cli` for future use.

You can get your API key from Linear by going to Settings > API > Create Key.

## Usage

### Initialize Configuration

```bash
linear init --api-key your_api_key_here
```

### List Teams

```bash
linear list-teams [--json]
```

### List Projects

```bash
linear list-projects [--json] [--team <teamId>]
```

### Create Issue

```bash
linear create-issue -t "Issue title" -p <projectId> --team-id <teamId> [options]

Options:
  -d, --description <description>  Issue description
  -s, --state-id <stateId>        State ID
  --labels <labels>               Comma-separated list of label IDs
  --assignee <assigneeId>         Assignee user ID
  --priority <priority>           Issue priority (0-4)
```

### Update Issue

```bash
linear update-issue -i <issueId> [options]

Options:
  -t, --title <title>            New title
  -d, --description <description> New description
  -s, --state-id <stateId>       New state ID
  --labels <labels>              Comma-separated list of label IDs
  --assignee <assigneeId>        Assignee user ID
  --priority <priority>          Issue priority (0-4)
```

### Get Issue Details

```bash
linear get-issue -i <issueId> [--json]
```

## Examples

Initialize configuration:

```bash
linear init --api-key lin_api_xxxxxxxxxxxx
```

List all teams:

```bash
linear list-teams
```

Create a new issue:

```bash
linear create-issue -t "Fix login bug" -p proj_123 --team-id team_456 -d "Users can't login on Safari" --priority 2
```

Get issue details:

```bash
linear get-issue -i issue_789
```

## License

ISC
