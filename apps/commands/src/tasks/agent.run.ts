import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AgentGraphService } from '@gitroom/nestjs-libraries/agent/agent.graph.service';

@Injectable()
export class AgentRun {
  constructor(private _agentGraphService: AgentGraphService) {}
  @Command({
    command: 'run:agent',
    describe: 'Run the agent',
  })
  async agentRun() {
    // createGraph was removed from AgentGraphService; keep the command stub.
    console.log('run:agent is not available with the current AgentGraphService');
  }
}
