import { ApiProperty } from '@nestjs/swagger';
import { DecisionDto } from '../../decision/dto/decision.dto';
import { DebtDto } from '../../debt/dto/debt.dto';
import { TaskDto } from './task.dto';

// The single-task read, with every decision and debt note already attached -
// the same "resolve the parent in one HTTP round trip" shape GET
// /graph/search already returns, so an agent reading one task's full
// context never has to chain three separate calls.
export class TaskDetailDto extends TaskDto {
  @ApiProperty({ type: [DecisionDto] })
  decisions!: DecisionDto[];

  @ApiProperty({ type: [DebtDto] })
  debt!: DebtDto[];
}
