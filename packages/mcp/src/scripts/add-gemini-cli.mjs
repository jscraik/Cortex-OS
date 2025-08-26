import { universalCliHandler } from '../universal-cli-handler.js';

async function addGeminiCli() {
  try {
    const result = await universalCliHandler.processMcpCommand(
      'cortex mcp add gemini-cli npx -y gemini-mcp-tool',
      {
        frontend: 'cortex',
        autoApprove: true,
      },
    );
    console.log('Gemini CLI Installation Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error adding Gemini CLI:', error);
  }
}

addGeminiCli();
