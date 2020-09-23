
'use strict'
const { Parser } = require("htmlparser2")
const { DomHandler } = require("domhandler")
const domSerializer = require("dom-serializer")
const {} = require("domutils")

const HtmlStylify = function(parser){

    /* properties */
    this.domParser = parser | null
    
    /* private properties */
    let _loadedRawHtml = ''
    let _htmlDocument = null
    let _domHandler = null

    const _htmlParserOptions = [
        { decodeEntities: true }
    ]

    /* bounders */
    const parseInput = _parseInput.bind(this)

    /* methods */
    /**
     * 
     * @param {string|HTMLDocument} input - A string representation of HTML document or an HTMLDocument element
     */
    this.process = function(input){
        if(typeof input === 'string'){
            _loadedRawHtml = input
        }

        parseInput()

        return this.getHtmlDocument()
    }

    this.getHtmlDocument = function(){
        //console.log(_htmlDocument)
        return _htmlDocument
    }

    /* private methods*/

    function _parseInput(){
        if(!this.domParser){
            _domHandler = new DomHandler((error, dom) => {
                if (error) {
                    console.log('domHandler error: ', error)
                    return
                }
                _htmlDocument = dom
                //_htmlDocument = domSerializer.default(dom)
                //console.log(dom)
                _changeHtml()
            }, {withStartIndices: true, withEndIndices: true})

            this.domParser = new Parser(_domHandler, _htmlParserOptions)
            this.domParser.write(_loadedRawHtml)
            this.domParser.end()
        }
    }

    function _changeHtml(){
        const rexp = new RegExp(/(^((.|\s)*?)\{)|(\}((.|\s)*?)\{)/g)
        _htmlDocument.forEach((e, ndx) => {
            if(e.type === 'style' && e.attribs.type === 'text/css'){
                console.log(typeof e.children[0].data)
                e.children[0].data + 'asd'
                console.log(e.children[0].data)
                const 
            }
        })
    }

    /* executes */
}

module.exports = HtmlStylify