#!/usr/bin/env node
import { Command } from 'commander';
import { a2aDoctor } from './commands/a2a/doctor.js';
import { a2aList } from './commands/a2a/list.js';
import { a2aSend } from './commands/a2a/send.js';
import { ctlCheck } from './commands/ctl/check.js';
import { evalGate } from './commands/eval/gate.js';
import { mcpAdd } from './commands/mcp/add.js';
import { mcpBridge } from './commands/mcp/bridge.js';
import { mcpDoctor } from './commands/mcp/doctor.js';
import { mcpList } from './commands/mcp/list.js';
import { mcpRemove } from './commands/mcp/remove.js';
import { mcpSearch } from './commands/mcp/search.js';
import { mcpShow } from './commands/mcp/show.js';
import { ragEval } from './commands/rag/eval.js';
import { ragIngest } from './commands/rag/ingest.js';
import { ragQuery } from './commands/rag/query.js';
import { simlabBench } from './commands/simlab/bench.js';
import { simlabList } from './commands/simlab/list.js';
import { simlabReport } from './commands/simlab/report.js';
import { simlabRun } from './commands/simlab/run.js';
import { tuiCommand } from './commands/tui.js';
import { agentCreate } from './commands/agent/create.js';

const program = new Command('cortex');
const mcp = new Command('mcp');
mcp.addCommand(mcpAdd);
mcp.addCommand(mcpBridge);
mcp.addCommand(mcpDoctor);
mcp.addCommand(mcpList);
mcp.addCommand(mcpRemove);
mcp.addCommand(mcpSearch);
mcp.addCommand(mcpShow);

program.addCommand(mcp);

const a2a = new Command('a2a');
a2a.addCommand(a2aSend);
a2a.addCommand(a2aList);
a2a.addCommand(a2aDoctor);
program.addCommand(a2a);

const rag = new Command('rag');
rag.addCommand(ragIngest);
rag.addCommand(ragQuery);
rag.addCommand(ragEval);
program.addCommand(rag);

const simlab = new Command('simlab');
simlab.addCommand(simlabRun);
simlab.addCommand(simlabBench);
simlab.addCommand(simlabReport);
simlab.addCommand(simlabList);
program.addCommand(simlab);

const ctl = new Command('ctl');
ctl.addCommand(ctlCheck);
program.addCommand(ctl);

const evalCmd = new Command('eval');
evalCmd.addCommand(evalGate);
program.addCommand(evalCmd);

program.addCommand(tuiCommand);

const agent = new Command('agent');
agent.addCommand(agentCreate);
program.addCommand(agent);
program.parseAsync(process.argv);
