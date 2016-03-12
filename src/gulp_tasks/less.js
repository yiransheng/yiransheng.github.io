var path = require('path'),
    gulp = require('gulp'),
    less = require('gulp-less'),
  cssmin = require('gulp-clean-css');


module.exports = function(config) {

  gulp.task('fonts', function() {
    return gulp.src(path.join(path.dirname(config.src.less), '/fonts/**/*.*'))
      .pipe(gulp.dest( 
        path.join(config.dist, 'style/fonts/')
      ));
  });

  gulp.task('less', ['fonts'], function () {

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
