import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { PacketAdapter } from '../adapter/adapter.interface';
import { AdapterService } from '../adapter/adapter.service';
import { GraphService } from './graph.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PacketDto } from './dto/packet.dto';
import { TaskDto } from './dto/task.dto';
import { TaskDetailDto } from './dto/task-detail.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

const DEFAULT_ADAPTER = 'generic-json';

@ApiTags('tasks')
@Controller('graph/tasks')
export class GraphController {
  constructor(
    private readonly graphService: GraphService,
    private readonly adapterService: AdapterService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List every task' })
  @ApiOkResponse({ type: [TaskDto] })
  listTasks() {
    return this.graphService.listTasks();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a task - the node the rest of the graph hangs off of',
  })
  @ApiCreatedResponse({ type: TaskDto })
  createTask(@Body() body: CreateTaskDto) {
    return this.graphService.createTask(body.id, body.title);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read a task with every decision and debt note already attached',
  })
  @ApiParam({ name: 'id', example: 'CARD-MODEL' })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiNotFoundResponse()
  getTask(@Param('id') id: string) {
    return this.graphService.getTaskDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a task's status" })
  @ApiParam({ name: 'id', example: 'CARD-MODEL' })
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse()
  updateTaskStatus(@Param('id') id: string, @Body() body: UpdateTaskStatusDto) {
    return this.graphService.updateTaskStatus(id, body.status);
  }

  @Get(':id/packet')
  @ApiOperation({
    summary:
      "Read a task's full context formatted for a specific tool (an AI editor, a CLI, a custom integration) via a registered adapter",
  })
  @ApiParam({ name: 'id', example: 'CARD-MODEL' })
  @ApiQuery({
    name: 'adapter',
    required: false,
    description: `Adapter name (default "${DEFAULT_ADAPTER}") - GET /adapters lists what's registered.`,
  })
  @ApiOkResponse({ type: PacketDto })
  @ApiNotFoundResponse()
  async getPacket(
    @Param('id') id: string,
    @Query('adapter') adapterName: string = DEFAULT_ADAPTER,
  ): Promise<PacketDto> {
    const packet = await this.graphService.getPacket(id);
    let adapter: PacketAdapter;
    try {
      adapter = this.adapterService.get(adapterName);
    } catch {
      throw new BadRequestException(
        `no such adapter: "${adapterName}" - see GET /adapters for what's registered.`,
      );
    }
    return { adapter: adapter.name, content: adapter.format(packet) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a task - its decisions and debt go with it (cascade delete)',
  })
  @ApiParam({ name: 'id', example: 'CARD-MODEL' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async deleteTask(@Param('id') id: string) {
    await this.graphService.deleteTask(id);
  }
}
