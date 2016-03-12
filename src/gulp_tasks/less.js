var path = require('path'),
    gulp = require('gulp'),
    less = require('gulp-less'),
  cssmin = require('gulp-clean-css');


module.exports = function(config) {

  gulp.task('less', function () {

    return gulp.src(config.src.less)
      .pipe(less().on('error', function (err) {
        console.log('Less Compile Failed', err);
      }))
      .pipe(cssmin({compatibility: 'ie8', keepSpecialComments: 0}).on('error', function(err) {
        console.log('CSS min failed', err);
      }))
      .pipe(gulp.dest(
        path.join(config.dist, 'style/')
      ));

  });

}
