#!/usr/bin/env python
import sys
import argparse
import json

from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter

def main(lang, code):
    lexer = get_lexer_by_name(lang, stripall=True)
    html = highlight(code, lexer, HtmlFormatter())
    style = HtmlFormatter().get_style_defs('.highlight')
    return { 'html': html, 'style': style, 'lang' : lang }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        '-l', '--lang',
        help='Language to use pygments on',
        type=str,
        default='js')
    parser.add_argument(
        '-o', '--output',
        help='output format',
        type=str,
        default='json')

    args = parser.parse_args()
    code = '\n'.join(sys.stdin)

    try:
        hl = main(args.lang, code)
        if args.output == 'json':
            print(json.dumps(hl))
        elif args.output == 'html':
            print('<style>')
            print(hl['style'])
            print('</style>')
            print(hl['html'])
        else:
            exit(0)
    except:
        exit(1)
