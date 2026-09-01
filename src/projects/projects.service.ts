import { Inject, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { projects } from '../database/schema';

// Root of workspace scoping - see schema.ts's own doc comment on
// `projects` for why decisions/debt don't get a project_id of their own.
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listProjects() {
    return this.db.select().from(projects);
  }

  async createProject(id: string, name: string) {
    const [project] = await this.db
      .insert(projects)
      .values({ id, name })
      .returning();
    await this.auditLogService.record(
      'project',
      project.id,
      'created',
      project.id,
    );
    return project;
  }
}
