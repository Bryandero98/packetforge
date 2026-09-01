import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WRITE_THROTTLE } from '../common/write-throttle';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'List every project - a "default" project always exists',
  })
  @ApiOkResponse({ type: [ProjectDto] })
  listProjects() {
    return this.projectsService.listProjects();
  }

  @Post()
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({
    summary:
      'Create a project - the workspace tasks are scoped under, one PacketForge deployment can now serve several',
  })
  @ApiCreatedResponse({ type: ProjectDto })
  createProject(@Body() body: CreateProjectDto) {
    return this.projectsService.createProject(body.id, body.name);
  }
}
