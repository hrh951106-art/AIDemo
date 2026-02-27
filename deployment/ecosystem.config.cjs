// ===========================================
// PM2 配置文件 - 项目管理系统
// ===========================================

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'project-management',

      // 启动命令
      script: 'npm',
      args: 'start',

      // 应用目录 (绝对路径)
      cwd: '/var/www/project-management-system',

      // 实例数量 (max = CPU 核心数)
      // 对于小型项目，可以使用 'max' 或指定数字如 2
      instances: 'max',

      // 集群模式
      exec_mode: 'cluster',

      // 自动重启
      autorestart: true,

      // 监听文件变化 (生产环境建议关闭)
      watch: false,

      // 内存限制 (超过自动重启)
      max_memory_restart: '1G',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // 日志配置
      error_file: '/var/log/pm2/project-management-error.log',
      out_file: '/var/log/pm2/project-management-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 日志轮转 (需要安装 pm2-logrotate)
      // pm2 install pm2-logrotate
      error: '/var/log/pm2/project-management-error.log',
      output: '/var/log/pm2/project-management-out.log',

      // 重启策略
      min_uptime: '10s',
      max_restarts: 10,

      // 优雅重启 (等待连接关闭)
      kill_timeout: 5000,
      wait_ready: true,

      // 进程管理
      listen_timeout: 10000,

      // 环境特定配置
      env_production: {
        NODE_ENV: 'production',
      },

      // 自动生成的配置
      // 不需要手动修改以下内容
      instance_var: 'INSTANCE_ID',
      pmx: true,
      automation: false,
      treekill: true,
      windowsHide: true,
    },
  ],

  // 部署配置 (可选，用于自动化部署)
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/project-management-system.git',
      path: '/var/www/project-management-system',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
    },
  },
};

// ===========================================
// 使用说明:
// ===========================================
// 1. 修改 cwd 为你的实际项目路径
// 2. (可选) 修改 deploy 部分配置用于自动化部署
// 3. 启动应用:
//    pm2 start ecosystem.config.cjs
// 4. 查看状态:
//    pm2 status
//    pm2 logs project-management
// 5. 重启应用:
//    pm2 restart project-management
// 6. 设置开机自启:
//    pm2 startup
//    pm2 save
// 7. 安装日志轮转:
//    pm2 install pm2-logrotate
//    pm2 set pm2-logrotate:max_size 10M
//    pm2 set pm2-logrotate:retain 7
// ===========================================
