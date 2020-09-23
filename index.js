'use strict'

const fs = require('fs')
const HtmlStylify = require('./lib/html-stylify');


//TEST DATA
var util = require('util');
const hs = new HtmlStylify()
//const dom = hs.process('<font> <br />this is the text </font><font></font>')

console.log('Reading test file...')
fs.readFile('data.html', 'utf8', (err, data) => {
    if (err) console.log('Read file error: ', err)
    const dom2 = hs.process(data)
    console.log('Reading done!')
    console.log('Writing parsed HTML to file...')
    fs.writeFile('data_processed.json', util.inspect(dom2), (err) => {
        if (err) console.log('Write file error: ', err)

        console.log('Writing to file done!')
    })
  });


// console.log('Writing parsed HTML to file...')
// fs.writeFile('data_processed.json', util.inspect(dom), (err) => {
//     if (err) console.log('Write file error: ', err)

//     console.log('Writing to file done!')
// })