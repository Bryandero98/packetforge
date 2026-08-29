import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskDto } from './dto/task.dto';

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
}
