var fs = require("fs");


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

var makeDOM = Cont.cpsify(parseStream, false);
var tranverseDOM = Cont.cpsify(tranverse);
function htmlDOM(inputStream, opts, callback) {
  var originalDOM = makeDOM(inputStream);
  var transforms = baseTransforms.concat([]);
  return Cont.callCC(finish => {
    return originalDOM.bind(dom => {
      return tranverseDOM(dom).bind(step => {
        if (step.node.__end) {
          return finish(dom);
        }
        var node = step.node;
        var cont = Cont.unit();
        transforms.forEach(function(t) {
          var _cont = t(node);
          if (_cont) {
            cont = cont.bind(() => _cont);
          }
        });
        return cont; 
      });
    });
  });
}

function html(inputStream, opts, callback) {
  htmlDOM(inputStream, opts, callback)
    .runCont(function(err, data) {
      if (!err) {
        if (data) {
          setTimeout(() => {
            callback(null, domutils.getOuterHTML(data));
          }, 200);
        }
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
            "<link href='https://fonts.googleapis.com/css?family=Roboto+Mono:400,700&subset=latin,latin-ext' rel='stylesheet' type='text/css'>" +
          '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/tonsky/FiraCode@1.206/distr/fira_code.css">',
        )
      ).bind(link => {
        domutils.appendChild(node, link[0]);
        domutils.appendChild(node, link[1]);
        domutils.appendChild(node, link[2]);

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
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460.3 460.3"><path d="M230.149 120.939L65.986 256.274c0 .191-.048.472-.144.855-.094.38-.144.656-.144.852v137.041c0 4.948 1.809 9.236 5.426 12.847 3.616 3.613 7.898 5.431 12.847 5.431h109.63V303.664h73.097v109.64h109.629c4.948 0 9.236-1.814 12.847-5.435 3.617-3.607 5.432-7.898 5.432-12.847V257.981c0-.76-.104-1.334-.288-1.707L230.149 120.939z"/><path d="M457.122 225.438L394.6 173.476V56.989c0-2.663-.856-4.853-2.574-6.567-1.704-1.712-3.894-2.568-6.563-2.568h-54.816c-2.666 0-4.855.856-6.57 2.568-1.711 1.714-2.566 3.905-2.566 6.567v55.673l-69.662-58.245c-6.084-4.949-13.318-7.423-21.694-7.423-8.375 0-15.608 2.474-21.698 7.423L3.172 225.438c-1.903 1.52-2.946 3.566-3.14 6.136-.193 2.568.472 4.811 1.997 6.713l17.701 21.128c1.525 1.712 3.521 2.759 5.996 3.142 2.285.192 4.57-.476 6.855-1.998L230.149 95.817l197.57 164.741c1.526 1.328 3.521 1.991 5.996 1.991h.858c2.471-.376 4.463-1.43 5.996-3.138l17.703-21.125c1.522-1.906 2.189-4.145 1.991-6.716-.195-2.563-1.242-4.609-3.141-6.132z"/></svg>
          </a>
          <a href="https://github.com/yiransheng">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35.318 35.318"><path d="M23.71 34.689c-.172.062-.345.137-.522.168-.678.121-1.112-.229-1.116-.922-.009-1.287-.009-2.572.012-3.859.022-1.48-.012-2.941-1.139-4.162.67-.12 1.266-.204 1.849-.338 3.862-.887 5.868-3.323 6.124-7.366.131-2.058-.236-3.946-1.604-5.567-.099-.114-.104-.373-.057-.539.364-1.34.258-2.649-.166-3.959-.105-.327-.279-.428-.602-.407-1.134.063-2.173.461-3.089 1.073-.883.593-1.705.722-2.754.482-2.31-.521-4.635-.369-6.94.165-.261.062-.612-.021-.851-.161-1.082-.634-2.164-1.25-3.412-1.496-.965-.188-1.049-.14-1.305.793-.322 1.176-.354 2.353-.025 3.536.047.172-.002.448-.117.575-2.557 2.853-1.631 8.244.092 10.309 1.34 1.604 3.12 2.326 5.096 2.701.345.064.688.113 1.033.173-.296.77-.562 1.497-.863 2.212-.059.138-.246.254-.399.312-1.938.752-3.604.199-4.713-1.56-.593-.938-1.354-1.639-2.488-1.842-.036-.007-.073-.026-.106-.021-.305.08-.607.164-.911.246.171.238.292.558.521.701.961.608 1.586 1.475 1.999 2.498.649 1.604 1.909 2.319 3.546 2.459.799.065 1.606.01 2.481.01 0 .996.036 2.133-.015 3.265-.026.61-.639.854-1.373.604-1.947-.666-3.752-1.621-5.311-2.963C.956 26.96-1.214 20.83.657 13.655 2.522 6.503 7.383 2.116 14.651.739 24.708-1.163 34.235 6.161 35.233 16.37c.788 8.048-3.949 15.579-11.523 18.319zm-9.481-8.839l-.016.038.055.009c.014.001.026.026-.039-.047zm-4.55 3.181c.157.097.307.22.477.273.062.02.177-.121.38-.271-.282-.107-.448-.201-.623-.225-.068-.008-.156.145-.234.223zm1.433.246c.023.105.232.236.355.234.119-.002.235-.16.354-.25-.108-.099-.216-.195-.548-.494-.072.208-.191.376-.161.51zm1.758-.423c-.148.035-.273.172-.408.266.079.1.158.193.285.35.175-.16.294-.271.414-.379-.1-.087-.217-.255-.291-.237zm-4.358-.593c.082.155.209.289.381.508.115-.188.24-.332.218-.361a1.931 1.931 0 0 0-.403-.367c-.01-.008-.213.186-.196.22z"/></svg>
					 </a>
				</div>
        `.trim())
      ).bind(link => {
        if (node.children.length) {
          domutils.prepend(node.children[0], link[0]);
        } else {
          domutils.appendChild(node, link[0]);
        }
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
  stack.push({ __end: true });
  stack.reverse();

  var node;
  while (stack.length) {
    node = stack.pop();
    callback && callback(null, { node: node, root: root });

    if (node && Array.isArray(node.children)) {
      node.children.forEach(function(child) {
        stack.push(child);
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
