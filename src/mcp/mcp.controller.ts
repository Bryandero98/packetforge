import { Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServerFactory } from './mcp-server.factory';

const JSON_RPC_METHOD_NOT_ALLOWED = {
  jsonrpc: '2.0' as const,
  error: { code: -32000, message: 'Method not allowed.' },
  id: null,
};

const JSON_RPC_INTERNAL_ERROR = {
  jsonrpc: '2.0' as const,
  error: { code: -32603, message: 'Internal server error' },
  id: null,
};

// Exposes the graph as an MCP server over the Streamable HTTP transport
// (the current MCP spec's HTTP transport, superseding the older HTTP+SSE
// one) so an agent can call list_tasks/create_decision/search_graph/etc. as
// native tools instead of hand-rolling HTTP calls against the REST API.
//
// Stateless, on purpose: a fresh McpServer + transport per request, same as
// the SDK's own stateless example (simpleStatelessStreamableHttp.ts). Every
// tool here is a thin wrapper around an already-stateless HTTP service -
// there's no session state (like a multi-step elicitation) worth the
// bookkeeping cost of a persistent, per-client session.
// JSON-RPC over HTTP, not a REST resource - there's no meaningful OpenAPI
// schema for "the MCP protocol", so it's excluded from /docs rather than
// showing up as three undocumented, misleading REST endpoints.
@ApiExcludeController()
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpServerFactory: McpServerFactory) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response): Promise<void> {
    const server = this.mcpServerFactory.create();
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    } catch {
      if (!res.headersSent) {
        res.status(500).json(JSON_RPC_INTERNAL_ERROR);
      }
    }
  }

  // GET is for the SSE stream a *stateful* server uses to push
  // notifications on an existing session; DELETE is for closing one. There
  // is no session in stateless mode, so both are simply unsupported here -
  // matching the SDK's own stateless example rather than pretending to
  // support a capability this server doesn't have.
  @Get()
  rejectGet(@Res() res: Response): void {
    res.status(405).json(JSON_RPC_METHOD_NOT_ALLOWED);
  }

  @Delete()
  rejectDelete(@Res() res: Response): void {
    res.status(405).json(JSON_RPC_METHOD_NOT_ALLOWED);
  }
}
