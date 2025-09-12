# Configuration

ASBR follows the [XDG Base Directory](https://specifications.freedesktop.org/basedir-spec/latest/) layout. Default locations:

| Type | Path |
| ---- | ---- |
| Config | `~/.config/cortex/asbr` |
| Data | `~/.local/share/cortex/asbr` |
| State | `~/.local/state/cortex/asbr` |
| Cache | `~/.cache/cortex/asbr` |

Configuration is stored as JSON under the config directory. Use `ASBR_PORT` and `ASBR_HOST` to override the server address.

Additional XDG variables (`XDG_CONFIG_HOME`, etc.) may be set to relocate directories.
