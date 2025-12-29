// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
    apps: [
        {
            name: 'miniapp-backend',
            cwd: './server',
            script: 'npx',
            args: 'ts-node src/index.ts',
            interpreter: 'none',
            env: {
                NODE_ENV: 'production',
            },
            // Restart on crash
            autorestart: true,
            max_restarts: 10,
            // Watch for changes (disable in production)
            watch: false,
            // Logs
            log_file: './logs/backend.log',
            out_file: './logs/backend-out.log',
            error_file: './logs/backend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
