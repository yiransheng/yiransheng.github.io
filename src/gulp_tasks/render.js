var gulp = require('gulp');
var changed = require('gulp-changed');
var htmlmin = require('gulp-htmlmin');

var process = require('../processing');
var through = require('through2');

var PassThrough = require('stream').PassThrough;

var render = function() {
  return through.obj(function(file, encoding, callback) {
    var opts = {};
    var processor;
    if(/index\.html$/.test(file.path)) {
      processor = process.list;
    } else {
      processor = process.post;
    }
    var bufferStream = PassThrough();
    bufferStream.end(file.contents);
    processor(bufferStream, opts, function(err, htmlStr) {
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
