import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { tasks } from '../database/schema';

@Injectable()
export class GraphService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listTasks() {
    return this.db.select().from(tasks);
  }

  async createTask(id: string, title: string) {
    const [task] = await this.db
      .insert(tasks)
      .values({ id, title })
      .returning();
    return task;
  }
}
