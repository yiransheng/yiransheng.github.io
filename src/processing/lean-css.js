var uncss = require('uncss');
var fs = require('fs');

var files   = ['out2.html'],
    options = {
        // ignore       : ['#added_at_runtime', /test\-[0-9]+/],
        // media        : ['(min-width: 700px) handheld and (orientation: landscape)'],
        // csspath      : '../public/css/',
        // raw          : 'h1 { color: green }',
        stylesheets  : ['bootstrap.css'],
        // ignoreSheets : [/fonts.googleapis/],
        timeout      : 1000,
        // htmlroot     : 'public',
        //report       : false,
        // uncssrc      : '.uncssrc'
    };

uncss(files, options, function (error, output) {
    console.log(output);
});

