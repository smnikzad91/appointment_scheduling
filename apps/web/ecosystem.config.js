module.exports = {
    apps: [
        {
            name: 'mqttcloud.ir',
            cwd: __dirname,
            // Invoke next directly rather than `npm run start` — PM2 then manages
            // the actual Node process instead of an intermediate npm shell, so
            // max_memory_restart tracks real memory usage and shutdown signals
            // (SIGINT/SIGTERM) reach the server directly instead of being relayed
            // through npm (which can drop or delay them).
            script: 'node_modules/.bin/next',
            args: 'start',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 4015
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            merge_logs: true,
            time: true
        },
        {
            name: 'mqttcloud-broker',
            // broker-service is a sibling directory to this project, at the repo root.
            cwd: __dirname + '/../broker-service',
            script: 'src/index.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production',
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            merge_logs: true,
            time: true,
        }
    ]
};
