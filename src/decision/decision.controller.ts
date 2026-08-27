import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DecisionService } from './decision.service';

@Controller('decisions')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Get()
  list(@Query('taskId') taskId?: string) {
    return this.decisionService.listDecisions(taskId);
  }

  @Post()
  add(@Body() body: { taskId: string; note: string }) {
    return this.decisionService.addDecision(body.taskId, body.note);
  }
}
