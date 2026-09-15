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
import { DebtService } from './debt.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { DebtDto } from './dto/debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

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

  @Patch(':id')
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Correct a debt note - re-embeds it for search' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: DebtDto })
  @ApiNotFoundResponse()
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateDebtDto) {
    return this.debtService.updateDebt(id, body.note);
  }

  @Delete(':id')
  @Throttle(WRITE_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a single debt note' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.debtService.deleteDebt(id);
  }
}
