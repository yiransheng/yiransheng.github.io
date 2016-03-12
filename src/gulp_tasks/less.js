var path = require('path'),
    gulp = require('gulp'),
    less = require('gulp-less'),
  cssmin = require('gulp-cssmin');


module.exports = function(config) {

  gulp.task('less', function () {

    return gulp.src(config.src.less)
      .pipe(less().on('error', function (err) {
        console.log('Less Compile Failed', err);
      }))
      .pipe(cssmin().on('error', function(err) {
        console.log('CSS min failed', err);
      }))
      .pipe(gulp.dest(
        path.join(config.dist, 'style/')
      ));

  });

}
