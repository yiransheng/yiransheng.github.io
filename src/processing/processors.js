var fs = require("fs");

var argv = require("yargs").option("html", {
  alias: "h",
  default: ""
}).argv;

var _ = require("lodash");
var Stream = require("stream");
var concatStream = require("concat-stream");
var child_process = require("child_process");

var domutils = require("domutils");
var htmlparser = require("htmlparser2");

var Entities = require("html-entities").Html5Entities;
var entities = new Entities();

var mjAPI = require("mathjax-node/lib/mj-single.js");
mjAPI.config({
  MathJax: {}
});
mjAPI.start();

var Cont = require("./cont");

var makeDOM = Cont.cpsify(parseStream, true);
var tranverseDOM = Cont.cpsify(tranverse);
function htmlDOM(inputStream, opts, callback) {
  var originalDOM = makeDOM(inputStream);
  var transforms = baseTransforms.concat([]);
  return Cont.callCC(finish => {
    return originalDOM.bind(dom => {
      var counter = 1;
      return tranverseDOM(dom).bind(step => {
        var node = step.node;
        var cont = Cont.unit();
        if (step.stage === "pre") {
          counter++;
          return Cont.empty;
        } else {
          transforms.forEach(function(t) {
            var _cont = t(node);
            if (_cont) {
              cont = cont.bind(() => _cont);
            }
          });
          return cont.bind(() => {
            counter--;
            if (node === _.last(dom)) {
              counter--;
            }
            return counter === 0 ? finish(dom) : Cont.empty;
          });
        }
      });
    });
  });
}

function html(inputStream, opts, callback) {
  htmlDOM(inputStream, opts, callback)
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
        // console.log(++i);
      }
    });
}

var baseTransforms = [
  function(node) {
    // add css
    if (node.name === "head") {
      return makeDOM(
        streamFromString(
          '<link href="style/main.css" rel="stylesheet" type="text/css">' +
            "<link href='https://fonts.googleapis.com/css?family=Roboto+Mono:400,700&subset=latin,latin-ext' rel='stylesheet' type='text/css'>"
        )
      ).bind(link => {
        domutils.appendChild(node, link[0]);
        domutils.appendChild(node, link[1]);
        return Cont.unit();
      });
    }
  },
  // add nav link
  function (node) {
    if (node.name === 'body') {
      return makeDOM(
        streamFromString(`
				<div class="nav-back">
					 <a href="/">
							<span>
								 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 492 492" preserveAspectRatio="xMidYMid meet">
										<path d="M464.344 207.418l.768.168H135.888l103.496-103.724c5.068-5.064 7.848-11.924 7.848-19.124 0-7.2-2.78-14.012-7.848-19.088L223.28 49.538c-5.064-5.064-11.812-7.864-19.008-7.864-7.2 0-13.952 2.78-19.016 7.844L7.844 226.914C2.76 231.998-.02 238.77 0 245.974c-.02 7.244 2.76 14.02 7.844 19.096l177.412 177.412c5.064 5.06 11.812 7.844 19.016 7.844 7.196 0 13.944-2.788 19.008-7.844l16.104-16.112c5.068-5.056 7.848-11.808 7.848-19.008 0-7.196-2.78-13.592-7.848-18.652L134.72 284.406h329.992c14.828 0 27.288-12.78 27.288-27.6v-22.788c0-14.82-12.828-26.6-27.656-26.6z"/>
								 </svg>
							</span>
							Home
					 </a>
				</div>
        `.trim())
      ).bind(link => {
        domutils.prepend(node.children[0], link[0]);
        return Cont.unit();
      });
    }
  },
  function(node) {
    // remove script tags
    if (
      node.name === "script" || node.name === "link" || node.name === "style"
    ) {
      if (node.attribs['data-keep'] == null) {
        domutils.removeElement(node);
      }
    }
  },
  function(node) {
    // add bootstrap table classes
    if (node.name === "table") {
      node.attribs["class"] = "table table-condensed";
    }
  },
  function(node) {
    // pre compile TeX
    if (
      node &&
      node.name === "span" &&
      _.startsWith(node.attribs["class"], "math")
    ) {
      return Cont.cpsify(renderEq, true)(span2tex(node)).bind(function(
        eqHtmlStr
      ) {
        var stream = streamFromString(eqHtmlStr);
        return makeDOM(stream).bind(newSpan => {
          if (newSpan.length === 1) {
            node.children.forEach(c => domutils.removeElement(c));
            domutils.appendChild(node, newSpan[0]);
            var maths = node.parent.children;
            if (maths.length === 1 && maths[0] === node) {
              node.attribs["class"] += " eq";
            }
          }
          return Cont.unit();
        });
      });
    }
  },
  function(node) {
    // highlight
    var code;
    var lang = node.attribs && node.attribs["class"];
    if (
      node.name === "pre" &&
      node.children.length &&
      node.children[0].name === "code" &&
      lang
    ) {
      code = code2source(node.children[0]);
      if (!code) {
        return;
      }
      return Cont.cpsify(pygments, true)(code, lang).bind(function(hl) {
        return makeDOM(streamFromString(hl.html)).bind(div => {
          // node.children.forEach(c => domutils.removeElement(c));
          // domutils.appendChild(node, div[0]);
          domutils.replaceElement(node, div[0]);
          return Cont.unit();
        });
      });
    }
  }
];

function parseStream(stream, callback) {
  var handler = new htmlparser.DomHandler(callback);
  var parser = new htmlparser.Parser(handler);
  // fs.createReadStream(fileName).pipe(parser);
  stream.pipe(parser);
}

function streamFromString(str) {
  var s = new Stream.Readable();
  s._read = function noop() {}; // redundant? see update below
  s.push(str);
  s.push(null);

  return s;
}

function tranverse(root, callback) {
  var stack = Array.isArray(root) ? root.concat([]) : [root];
  stack.reverse();
  var node;
  while (stack.length) {
    node = stack.pop();
    if (!node.sentinel) {
      callback && callback(null, { stage: "pre", node: node, root: root });
    } else {
      callback &&
        callback(null, { stage: "post", node: node.sentinel, root: root });
    }
    if (node && Array.isArray(node.children)) {
      node.children.forEach(function(child) {
        stack.push(child);
      });
    }
    if (!node.sentinel) {
      stack.push({
        sentinel: node
      });
    }
  }
}

function span2tex(spanNode) {
  var tex = _(spanNode.children || [])
    .filter({ type: "text" })
    .map(function(node) {
      return node.data;
    })
    .value()
    .join(" ");
  tex = entities
    .decode(_.trim(tex))
    .replace(/^\\\(/, "")
    .replace(/\\\)$/, "")
    .replace(/\\\]$/, "")
    .replace(/^\\\[/, "");
  return tex;
}

function code2source(codeNode) {
  var codeInner = domutils.getInnerHTML(codeNode);
  return entities.decode(codeInner);
}

function renderEq(tex, callback) {
  mjAPI.typeset(
    {
      math: tex,
      format: "TeX", // "inline-TeX", "MathML"
      html: true,
      svg: true //  svg:true,
    },
    function(data) {
      if (!data.errors) {
        callback(null, data.svg);
      } else {
        callback(data.errors, null);
      }
    }
  );
}

function pygments(code, lang, callback) {
  var codeStream = streamFromString(code);
  var child = child_process.spawn(
    "python",
    ["./src/processing/highlight.py", "--lang=" + lang],
    { stdio: ["pipe", null, null] }
  );
  codeStream.pipe(child.stdin);
  var outputStream = concatStream(function(data) {
    try {
      callback(null, JSON.parse(data.toString()));
    } catch (err) {
      callback(err, null);
    }
  });

  child.stdout.pipe(outputStream);
  child.stderr.on("error", function(err) {
    callback(err, null);
  });
  child.stdout.on("error", function(err) {
    callback(err, null);
  });
}

module.exports = {
  html: html,
  cpsHtmlDOM: htmlDOM,
  cpsMakeDOM: makeDOM
};
