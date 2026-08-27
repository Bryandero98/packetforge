import { Body, Controller, Get, Post } from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph/tasks')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  listTasks() {
    return this.graphService.listTasks();
  }

  @Post()
  createTask(@Body() body: { id: string; title: string }) {
    return this.graphService.createTask(body.id, body.title);
  }
}
