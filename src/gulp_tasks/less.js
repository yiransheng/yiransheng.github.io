var path          = require('path'),
    gulp          = require('gulp'),
    less          = require('gulp-less'),
    inline_base64 = require('gulp-inline-base64')
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
      .pipe(inline_base64({
        baseDir: path.dirname(config.src.less) + '/',
        maxSize: 32 * 1024,
        debug : true
      }).on('error', function(err) {
        console.error('Inline Base64 error:', err);
      }))
      .pipe(cssmin({compatibility: 'ie8', keepSpecialComments: 0}).on('error', function(err) {
        console.log('CSS min failed', err);
      }))
      .pipe(gulp.dest(
        path.join(config.dist, 'style/')
      ));

  });

}
