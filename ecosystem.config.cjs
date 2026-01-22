// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
    apps: [
        {
            name: 'miniapp-backend',
            cwd: './server',
            script: 'dist/index.js',  // Используем скомпилированный JS
            interpreter: 'node',
            
            // Лимиты памяти
            max_memory_restart: '200M',
            
            env: {
                NODE_ENV: 'production',
            },
            
            // Автоперезапуск
            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000,
            
            // Graceful shutdown
            kill_timeout: 5000,
            
            // Логи
            log_file: './logs/backend.log',
            out_file: './logs/backend-out.log',
            error_file: './logs/backend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
        },
    ],
};
