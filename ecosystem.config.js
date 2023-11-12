module.exports = {
  // apps : [{
  //   script: '../bin/www.js',
  //   watch: '.'
  // }, {
  //   script: './service-worker/',
  //   watch: ['./service-worker']
  // }],

  // deploy : {
  //   production : {
  //     user : 'SSH_USERNAME',
  //     host : 'SSH_HOSTMACHINE',
  //     ref  : 'origin/master',
  //     repo : 'GIT_REPOSITORY',
  //     path : 'DESTINATION_PATH',
  //     'pre-deploy-local': '',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': ''
  //   }
  // }
apps: [{
        name: 'app',
        script: './bin/www.js',
        instance: 0,
        exec_mode: 'cluster',
    }]
};
