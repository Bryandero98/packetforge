import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskDto } from './dto/task.dto';
import { TaskDetailDto } from './dto/task-detail.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@ApiTags('tasks')
@Controller('graph/tasks')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

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
