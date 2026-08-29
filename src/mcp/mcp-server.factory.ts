import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { GraphService } from '../graph/graph.service';
import { DecisionService } from '../decision/decision.service';
import { DebtService } from '../debt/debt.service';
import { SearchService } from '../search/search.service';

function textResult(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

// MCP has a dedicated shape for "the call reached the tool but the tool
// itself failed" (isError: true on an otherwise-successful JSON-RPC
// response), distinct from a transport/protocol-level error. A NotFoundException
// or a Postgres constraint error thrown by a service is exactly that kind
// of failure - real, expected, and something the calling agent should see
// as text it can act on, not a dropped connection.
function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text', text: message }], isError: true };
}

// One MCP tool per graph operation that already exists as a REST endpoint -
// deliberately no tool for /adapters, which formats output for a specific
// external tool rather than reading or writing the graph itself, so it
// doesn't belong in the surface an agent queries/mutates through.
@Injectable()
export class McpServerFactory {
  constructor(
    private readonly graphService: GraphService,
    private readonly decisionService: DecisionService,
    private readonly debtService: DebtService,
    private readonly searchService: SearchService,
  ) {}

  create(): McpServer {
    const server = new McpServer({ name: 'packetforge', version: '0.0.1' });

    server.registerTool(
      'list_tasks',
      { description: 'List every task in the build graph.' },
      async () => {
        try {
          return textResult(await this.graphService.listTasks());
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      'create_task',
      {
        description:
          'Create a task - the node the rest of the graph hangs off of.',
        inputSchema: {
          id: z.string().describe('Unique task identifier'),
          title: z.string().describe('Human-readable task title'),
        },
      },
      async ({ id, title }) => {
        try {
          return textResult(await this.graphService.createTask(id, title));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      'list_decisions',
      {
        description: 'List decisions, optionally filtered to one task.',
        inputSchema: {
          taskId: z.string().optional().describe('Filter to this task only'),
        },
      },
      async ({ taskId }) => {
        try {
          return textResult(await this.decisionService.listDecisions(taskId));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      'create_decision',
      {
        description:
          'Record why a task was built the way it was. The result includes ' +
          'a "conflicts" list - existing decisions on the same task that are ' +
          'highly similar to this one. That is a warning, not a rejection: ' +
          'the write always succeeds either way.',
        inputSchema: {
          taskId: z.string().describe('The task this decision was made for'),
          note: z.string().describe('Why the task was built the way it was'),
        },
      },
      async ({ taskId, note }) => {
        try {
          return textResult(
            await this.decisionService.addDecision(taskId, note),
          );
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      'list_debt',
      {
        description: 'List debt, optionally filtered to one task.',
        inputSchema: {
          taskId: z.string().optional().describe('Filter to this task only'),
        },
      },
      async ({ taskId }) => {
        try {
          return textResult(await this.debtService.listDebt(taskId));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      'create_debt',
      {
        description:
          'Record a known limitation a task leaves for whatever depends on it.',
        inputSchema: {
          taskId: z.string().describe('The task this debt was left on'),
          note: z.string().describe('What is still wrong with the task'),
        },
      },
      async ({ taskId, note }) => {
        try {
          return textResult(await this.debtService.addDebt(taskId, note));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      'search_graph',
      {
        description:
          'Semantic search over decisions and debt, ranked by cosine ' +
          'similarity, each result with its parent task inline. Requires ' +
          "the server's embedding provider to be configured.",
        inputSchema: {
          query: z.string().describe('Natural-language search query'),
          limit: z
            .number()
            .int()
            .positive()
            .max(50)
            .optional()
            .describe('Max results, default 10'),
        },
      },
      async ({ query, limit }) => {
        try {
          return textResult(await this.searchService.search(query, limit));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    return server;
  }
}
