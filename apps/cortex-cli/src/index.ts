#!/usr/bin/env node
import { Command } from 'commander';
import { mcpAdd } from './commands/mcp/add.js';
import { mcpList } from './commands/mcp/list.js';
import { mcpRemove } from './commands/mcp/remove.js';
import { mcpDoctor } from './commands/mcp/doctor.js';
import { a2aSend } from './commands/a2a/send.js';
import { a2aList } from './commands/a2a/list.js';
import { a2aDoctor } from './commands/a2a/doctor.js';
import ragIngest from './commands/rag/ingest.js';
import ragQuery from './commands/rag/query.js';
import ragEval from './commands/rag/eval.js';
import simlabRun from './commands/simlab/run.js';
import simlabBench from './commands/simlab/bench.js';
import simlabReport from './commands/simlab/report.js';
import simlabList from './commands/simlab/list.js';
import ctlCheck from './commands/ctl/check.js';

const program = new Command('cortex');
const mcp = new Command('mcp');
mcp.addCommand(mcpAdd);
mcp.addCommand(mcpList);
mcp.addCommand(mcpRemove);
mcp.addCommand(mcpDoctor);

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
program.parseAsync(process.argv);
