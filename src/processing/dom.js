var fs = require('fs');
var _ = require('lodash');

var Entities = require('html-entities').Html5Entities;
 
var entities = new Entities();

// a simple TeX-input example
var mjAPI = require("mathjax-node/lib/mj-single.js");
mjAPI.config({
  MathJax: {
    // traditional MathJax configuration
  }
});
mjAPI.start();


var domutils = require('domutils');
var htmlparser = require("htmlparser2");
var handler = new htmlparser.DomHandler(function (error, dom) {
    if (!error) {
      tranverse(dom, function(node) {
        if(node.name === 'span' && node.attribs.class === 'math') {
          var tex = _(node.children || [])
            .filter({ type: 'text' })
            .map(function(node) {
              return node.data;
            })
            .value()
            .join(' ');
          tex = entities.decode(_.trim(tex))
            .replace(/^\\\(/, '')
            .replace(/\\\)$/, '')
            .replace(/\\\]$/, '')
            .replace(/^\\\[/, '')
            ;
          mjAPI.typeset({
            math: tex,
            format: "inline-TeX", // "inline-TeX", "MathML"
            // mml:true
            html: true,
            svg:true, //  svg:true,
          }, function (data) {
            if(!data.errors) {
              console.log(data.html);
            } else {
              console.error(data.errors, tex);
            }
          });
        }
      });
    }
});

var parser = new htmlparser.Parser(handler);
var rawHtml = fs.readFileSync('index.html', { encoding: 'utf8' }).toString();
parser.write(rawHtml);
parser.done();

function tranverse(root, pre, post){
  var stack = Array.isArray(root) ? root.concat([]) : [root];
  var node;
  while (stack.length) {
    node = stack.pop();
    pre && pre(node);
    if(node && Array.isArray(node.children)) {
      node.children.forEach(function(child) {
        stack.push(child);
      });
    }
  }
}
