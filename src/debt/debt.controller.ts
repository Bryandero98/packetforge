import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WRITE_THROTTLE } from '../common/write-throttle';
import { DebtService } from './debt.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { DebtDto } from './dto/debt.dto';

@ApiTags('debt')
@Controller('debt')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  @Get()
  @ApiOperation({ summary: 'List debt, optionally filtered to one task' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiOkResponse({ type: [DebtDto] })
  list(@Query('taskId') taskId?: string) {
    return this.debtService.listDebt(taskId);
  }

  @Post()
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({
    summary:
      'Record a known limitation a task leaves for whatever depends on it',
  })
  @ApiCreatedResponse({ type: DebtDto })
  add(@Body() body: CreateDebtDto) {
    return this.debtService.addDebt(body.taskId, body.note);
  }
}
