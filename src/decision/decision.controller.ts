import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { Throttle } from '@nestjs/throttler';
import { WRITE_THROTTLE } from '../common/write-throttle';
import { DecisionService } from './decision.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { DecisionDto } from './dto/decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

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
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Record why a task was built the way it was' })
  @ApiCreatedResponse({ type: DecisionDto })
  add(@Body() body: CreateDecisionDto) {
    return this.decisionService.addDecision(body.taskId, body.note);
  }

  @Patch(':id')
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({
    summary: 'Correct a decision note - re-embeds it for search',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: DecisionDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDecisionDto,
  ) {
    return this.decisionService.updateDecision(id, body.note);
  }

  @Delete(':id')
  @Throttle(WRITE_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a single decision note' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.decisionService.deleteDecision(id);
  }
}
