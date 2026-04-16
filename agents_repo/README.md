# SOMA Agent Plugin Library

A collection of specialized AI agent plugins used by SOMA's Marketplace and persona system.

## Structure

```
plugins/           — 72 focused, single-purpose agent plugins
docs/              — Plugin documentation and usage guides
```

## Plugins

74 plugins organized by domain — architecture, backend, frontend, security, data/AI, DevOps, business, and more.
These are loaded by SOMA's Marketplace when a user installs a plugin pack.

## Integration

SOMA loads plugins from this directory at boot via `CapabilityRegistry`.
Plugins installed through the Marketplace UI are activated by copying the relevant plugin directory
into `agents_repo/plugins/` and reloading the capability registry.

## License

MIT — see [LICENSE](./LICENSE) for details.
