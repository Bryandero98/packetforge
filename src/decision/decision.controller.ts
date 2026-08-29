import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DecisionService } from './decision.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { DecisionDto } from './dto/decision.dto';

@ApiTags('decisions')
@Controller('decisions')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Get()
  @ApiOperation({ summary: 'List decisions, optionally filtered to one task' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiOkResponse({ type: [DecisionDto] })
  list(@Query('taskId') taskId?: string) {
    return this.decisionService.listDecisions(taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Record why a task was built the way it was' })
  @ApiCreatedResponse({ type: DecisionDto })
  add(@Body() body: CreateDecisionDto) {
    return this.decisionService.addDecision(body.taskId, body.note);
  }
}
