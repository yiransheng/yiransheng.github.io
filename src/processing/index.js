var processors = require("./processors");
var processIndex = require("./process-index");
var html = processors.html;

if (require.main === module) {
  var argv = require("yargs").option("html", {
    alias: "h",
    default: ""
  }).argv;
  var fs = require('fs');
  var inputStream = argv.html ? fs.createReadStream(argv.html) : process.stdin;
  html(inputStream, {}, function(err, data) {
    console.log(data);
  });
}
module.exports = {
  post : html,
  list : processIndex
};
