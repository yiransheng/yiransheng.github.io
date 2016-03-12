var gulp = require('gulp');
var changed = require('gulp-changed');
var htmlmin = require('gulp-htmlmin');

var process = require('../processing');
var through = require('through2');

var PassThrough = require('stream').PassThrough;

var render = function(opts) {
  opts = opts || {};
  return through.obj(function(file, encoding, callback) {
    if(/index\.html$/.test(file.path)) {
      opts.index = true;
    }
    var bufferStream = PassThrough();
    bufferStream.end(file.contents);
    process(bufferStream, opts, function(err, htmlStr) {
      if(!err) {
        file.contents = new Buffer(htmlStr);
        callback(null, file);
      } else {
        callback(err, file);
      }
    }); 
  });
};

module.exports = function(config) {
  gulp.task('render', function() {
    return gulp.src(config.src.posts)
      .pipe(changed(config.dist))
      .pipe(render())
      .pipe(htmlmin())
      .pipe(gulp.dest(config.dist));
  });
};
