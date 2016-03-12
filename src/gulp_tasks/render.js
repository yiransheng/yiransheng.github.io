var gulp = require('gulp');

var process = require('../processing');
var through = require('through2');

var PassThrough = require('stream').PassThrough;

var render = function(opts) {
  opts = opts || {};
  return through.obj(function(file, encoding, callback) {
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
      .pipe(render())
      .pipe(gulp.dest(config.dist));
  });
};
