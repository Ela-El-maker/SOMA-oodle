/**
 * ecosystem.config.cjs — PM2 Process Manager config for SOMA
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs         # start
 *   pm2 restart soma-server                 # restart
 *   pm2 logs soma-server                    # tail logs
 *   pm2 save && pm2 startup                 # survive reboots
 */

module.exports = {
  apps: [
    {
      name: 'soma-server',
      script: 'launcher_ULTRA.mjs',
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=4096 --experimental-vm-modules',

      // Environment — mirrors start_production.bat
      env: {
        NODE_ENV: 'production',
        SOMA_HYBRID_SEARCH: 'true',
        SOMA_LOAD_TRADING: 'true',
        SOMA_GPU: 'true',
        SOMA_LOAD_HEAVY: 'true',
        UV_THREADPOOL_SIZE: '16',
      },

      // Auto-restart on crash, but not on clean exit (code 0)
      autorestart: true,
      watch: false,          // never watch in production — costs CPU, causes restart loops
      max_restarts: 10,
      min_uptime: '30s',     // must stay up 30s before restart counter resets
      restart_delay: 5000,   // 5s between restarts

      // Log rotation
      output: 'logs/pm2-out.log',
      error:  'logs/pm2-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Memory guardrail — restart if heap climbs past 4.5 GB
      max_memory_restart: '4500M',

      // Graceful shutdown: give SOMA 15s to finish in-flight requests
      kill_timeout: 15000,
      listen_timeout: 10000,
    },
  ],
};
