import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DebtService } from './debt.service';

@Controller('debt')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  @Get()
  list(@Query('taskId') taskId?: string) {
    return this.debtService.listDebt(taskId);
  }

  @Post()
  add(@Body() body: { taskId: string; note: string }) {
    return this.debtService.addDebt(body.taskId, body.note);
  }
}
