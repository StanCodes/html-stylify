
'use strict'
const { Parser } = require("htmlparser2")
const { DomHandler } = require("domhandler")
const domSerializer = require("dom-serializer").default
const {} = require("domutils")
const css = require('css')

const HtmlStylify = function(parser){

    /* properties */
    this.domParser = parser | null
    
    /* private properties */
    let _uniquePrefix = null
    let _loadedRawHtml = ''
    let _htmlDocument = null
    let _htmlString = null
    let _domHandler = null
    let _cssAST = null
    let _cssProcessedElements = new Set()

    const _htmlParserOptions = [
        { decodeEntities: true }
    ]

    const _cssParserOptions = null

    /* binders */
    const parseInput = _parseInput.bind(this)
    const changeHtml = _changeHtml.bind(this)

    /* methods */
    /**
     * 
     * @param {string|HTMLDocument} input - A string representation of HTML document or an HTMLDocument element
     */
    this.process = function(input){
        _uniquePrefix = 'hs-' + Date.now()
        if(typeof input === 'string'){
            _loadedRawHtml = input
        }

        parseInput()

        //return this.getHtmlDocument()
        return this
    }

    this.getHtmlDocument = function(){
        //console.log(_htmlDocument)
        return _htmlDocument
    }

    this.getHtmlString = function(){
        return _htmlString
    }

    this.getCssAST = function(){
        return _cssAST
    }

    this.getCssProcessedElements = function(){
        return _cssProcessedElements
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
                changeHtml()
            }, {withStartIndices: true, withEndIndices: true})

            this.domParser = new Parser(_domHandler, _htmlParserOptions)
            this.domParser.write(_loadedRawHtml)
            this.domParser.end()
        }
    }

    function _parseCss(cssString){
        _cssAST = css.parse(cssString, _cssParserOptions)
        if(_cssAST.stylesheet.parsingErrors.length > 0) {
            console.log(_cssAST.stylesheet.parsingErrors)
            return
        }
        _addSplice()
        _processCssAST()
    }

    function _processCssAST(){
        _cssAST.stylesheet.rules.forEach(rule => {
            if(rule.type === 'rule'){
                let rules = []
                rule.selectors.forEach(ruleSelector => {
                    ruleSelector = _manageRuleSelector(ruleSelector)
                    rules.push(ruleSelector)
                })
                rule.selectors = rules
            }
        })
    }

    function _manageRuleSelector(ruleSelector){
        ruleSelector = ruleSelector.split(' ')
        let selectorsArr = []
        ruleSelector.forEach(selector => {
            if(selector.indexOf('.') === -1 && selector.indexOf('#') === -1){
                const attr = selector.indexOf('[')
                if(attr > -1) {
                    selectorsArr.push(`.${selector.splice(attr, `-${_uniquePrefix}`)}`)
                } else {
                    selectorsArr.push(`.${selector}-${_uniquePrefix}`)
                }
                _cssProcessedElements.add(selector)
            } else {
                selectorsArr.push(selector)
            }
        })
        return selectorsArr.join(' ')
    }

    function _changeHtml(){
        _htmlDocument.forEach((e, ndx) => {
            if(e.type === 'style' && e.attribs.type === 'text/css'){
                //console.log(typeof e.children[0].data)
                _parseCss(e.children[0].data)
                e.children[0].data = css.stringify(this.getCssAST())
            }
        })

        _htmlString = domSerializer(_htmlDocument, _htmlParserOptions)

        _deleteSplice()
    }

    function _addSplice(){
        if (String.prototype.splice === undefined) {
            /**
             * Splices text within a string.
             * @param {int} offset The position to insert the text at (before)
             * @param {string} text The text to insert
             * @param {int} [removeCount=0] An optional number of characters to overwrite
             * @returns {string} A modified string containing the spliced text.
             */
            String.prototype.splice = function(offset, text, removeCount=0) {
                let calculatedOffset = offset < 0 ? this.length + offset : offset;
                return this.substring(0, calculatedOffset) +
                text + this.substring(calculatedOffset + removeCount);
            };
        }
    }

    function _deleteSplice(){
        delete String.prototype.splice
    }

    /* executes */
}

module.exports = HtmlStylify