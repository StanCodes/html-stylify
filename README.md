# html-stylify

A simple library for working with HTML represented as `string`. Based on [css-parse](https://www.npmjs.com/package/css) and [htmlparser2](https://www.npmjs.com/package/htmlparser2). It interprets the style tag and changes all HTML tag selectors to classes. It adds the created classes to the corresponding html elements. An optional functionality is to normalize the HTML document, changing `<html>`, `<body>`, `<head>` to simpler html tag elements like `<div>` or `<span>` and removing `<title>`, `<meta>`, `<script>` tags.

## Installing
`$ npm install html-stylify`

## Using

```js
const HtmlStylify = require('./lib/html-stylify')
const hs = new HtmlStylify()
const dom = hs.process(htmlAsString)
```

## API

### hs.process(string, [options])

Where `string` is a valid HTML document of type `String`.

`options`:
- normalizeHtml: `[Boolean]` default:`false` - the flag used to initiate html normalizing
- replaceElement: `[String]` default:`div` - the element used to replace HTML document tags
- removeScripts: `[Boolean]` default: `true` - flag indicating the removal of `<scripts>` tag
- uniqueSuffix: `[String]` default: `null` - a string to be used as a uniq suffix in new css names. If omitted ` 'hs-' + Date.now()` will be used

Returns an `[Object]` containing `html` prop which has the HTML document represented as HTMLNodes and prop `htmlString` which is the same DOM, just serialized as `string`.

## Example

```js
const fs = require('fs')
const util = require('util')
const HtmlStylify = require('./lib/html-stylify')

const hs = new HtmlStylify()

console.log('Reading test file...')
fs.readFile('data.html', 'utf8', (err, data) => {
    if (err) console.log('Read file error: ', err)
    const dom = hs.process(data, {normalizeHtml: true, uniquePrefix: 'myApp'})
    console.log('Reading done!')
    console.log('Writing HTML string to file...')

    fs.writeFile('data_processed.html', dom.htmlString, (err) => {
        if (err) console.log('Write file error: ', err)
        console.log('Writing to HTML file done!')
    })
  })
```

## To do
- Add error reporting when parsing/traversing
- Increase algorithm effectiveness and speed

## License
MIT