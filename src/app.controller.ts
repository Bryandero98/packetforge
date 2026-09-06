import { Controller, Get, Redirect } from '@nestjs/common';

// / is where a link to the project actually gets clicked, so it sends
// people straight to the one part of PacketForge meant to be opened in a
// browser - the NestJS boilerplate "Hello World!" it returned before was
// just a dead end.
@Controller()
export class AppController {
  @Get()
  @Redirect('/dashboard')
  root(): void {}
}
