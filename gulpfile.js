var gulp = require('gulp');
var config = require('./config.js');
require('./src/gulp_tasks/less')(config);
require('./src/gulp_tasks/render')(config);

gulp.task('default', ['render', 'less']);
