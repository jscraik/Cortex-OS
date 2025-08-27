import { universalCliHandler } from '../universal-cli-handler.js';

async function addMcpGatewayWrapper() {
  try {
    // Add the MCP Gateway Wrapper with environment variables
    const result = await universalCliHandler.processMcpCommand(
      'cortex mcp add mcpgateway-wrapper uvx run -- python -m mcpgateway.wrapper --env MCP_AUTH=<your-token> --env MCP_SERVER_URL=http://localhost:4444/servers/UUID_OF_SERVER_1/mcp',
      {
        frontend: 'cortex',
        autoApprove: true,
      },
    );

    console.log('MCP Gateway Wrapper Installation Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ MCP Gateway Wrapper successfully installed!');
      console.log('\n📝 Next steps:');
      console.log('1. Replace <your-token> with your actual auth token');
      console.log('2. Update UUID_OF_SERVER_1 with the correct server UUID');
      console.log('3. Ensure the gateway server is running on localhost:4444');
    }
  } catch (error) {
    console.error('Error installing MCP Gateway Wrapper:', error);
  }
}

addMcpGatewayWrapper();
