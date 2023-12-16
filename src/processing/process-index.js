var fs = require("fs");
var path = require("path");
var Cont = require("./cont");
var domutils = require("domutils");
var processors = require("./processors");
var makeDOM = processors.cpsMakeDOM;
var processContents = processors.cpsHtmlDOM;

var templatePath = path.resolve(__dirname, "./index.html");
var template = makeDOM(fs.createReadStream(templatePath));

var compile = function(indexDOM) {
  var contents = extractContents(indexDOM);
  return template.map(function(templateDOM) {
    var container = getContainer(templateDOM);
    for (let i = 0; i < contents.length; i++) {
      domutils.appendChild(container, contents[i]);
    }
    return templateDOM;
  });
};

function extractContents(contents) {
  return domutils.filter(
    function(node) {
      return node && node.attribs && node.attribs["class"] === "section level2";
    },
    contents
  );
}
function getContainer(templateDOM) {
  return domutils.findOne(
    function(node) {
      return node.attribs && node.attribs.id === "posts";
    },
    templateDOM
  );
}

function processRawHtml(inputStream, opts, callback) {
  processContents(inputStream, {})
    .bind(compile)
    .map(function(dom) {
      return domutils.getOuterHTML(dom);
    })
    .runCont(function(err, data) {
      if (!err) {
        callback(null, data);
      } else {
        if (err.toString() !== "Error: Cont. Error") {
          console.error(err);
        }
      }
    });
}

if (require.main === module) {
  var argv = require("yargs").option("html", {
    alias: "h",
    default: ""
  }).argv;
  var inputStream = process.argv.html
    ? fs.createReadStream(argv.html)
    : process.stdin;
  processRawHtml(inputStream, {}, function(err, data) {
    console.log(data);
  });
}

module.exports = processRawHtml;
