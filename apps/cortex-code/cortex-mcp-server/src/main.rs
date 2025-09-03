use cortex_arg0::arg0_dispatch_or_else;
use cortex_common::CliConfigOverrides;
use cortex_mcp_server::run_main;

fn main() -> anyhow::Result<()> {
    arg0_dispatch_or_else(|cortex_linux_sandbox_exe| async move {
        run_main(cortex_linux_sandbox_exe, CliConfigOverrides::default()).await?;
        Ok(())
    })
}
