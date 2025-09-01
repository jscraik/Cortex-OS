import { universalCliHandler } from '../universal-cli-handler.js';

async function addRepoPromptServer() {
  try {
    const result = await universalCliHandler.processMcpCommand(
      'cortex mcp add RepoPrompt /Users/jamiecraik/RepoPrompt/repoprompt_cli',
      {
        frontend: 'cortex',
        autoApprove: true,
      }
    );

    console.log('RepoPrompt Server Installation Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ RepoPrompt Server successfully installed!');
      console.log('\n📋 Configuration:');
      console.log('- Command: /Users/jamiecraik/RepoPrompt/repoprompt_cli');
      console.log('- Transport: stdio');
      console.log('- No additional arguments required');
      console.log('\n🎯 RepoPrompt is now available through all MCP frontends!');
    }
  } catch (error) {
    console.error('Error adding RepoPrompt server:', error);
  }
}

addRepoPromptServer();
