'use strict'
const { Parser } = require("htmlparser2")
const { DomHandler } = require("domhandler")
const domSerializer = require("dom-serializer").default
const css = require('css')

const HtmlStylify = function(parser){

    /* properties */
    
    /* private properties */
    let domParser = parser | null
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
    //const parseInput = _parseInput.bind(this)
    //const changeHtml = _changeHtml.bind(this)
    //const traverseDomNodes = _traverseDomNodes.bind(this)

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
        _parseInput()
        return {
            html: _htmlDocument,
            htmlString: _htmlString,
            _cssAST: _cssAST,
            _cssProcessed: _cssProcessedElements
        }
    }

    /* private methods*/
    function _parseInput(){
        if(!domParser){
            _domHandler = new DomHandler((error, dom) => {
                if (error) {
                    console.log('domHandler error: ', error)
                    return
                }
                _htmlDocument = dom
                _changeHtml()
            }, {withStartIndices: true, withEndIndices: true})

            domParser = new Parser(_domHandler, _htmlParserOptions)
            domParser.write(_loadedRawHtml)
            domParser.end()
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
        _traverseDomNodes(_htmlDocument)
        _htmlString = domSerializer(_htmlDocument, _htmlParserOptions)
        _deleteSplice()
    }

    function _traverseDomNodes(DOMNodes){
        DOMNodes.forEach((e, ndx, nodes) => {
            if(e.type === 'style' && e.attribs.type === 'text/css'){
                _parseCss(e.children[0].data)
                e.children[0].data = css.stringify(_cssAST)
            } 
            //remove head, meta, title, comments
            if(e.type === 'tag' && e.name === 'head'){
                nodes.splice(ndx, 1)
            }
            if(e.type === 'tag' && e.name === 'meta'){
                nodes.splice(ndx, 1)
            }
            if(e.type === 'tag' && e.name === 'title'){
                nodes.splice(ndx, 1)
            }
            if(e.type === 'comment'){
                nodes.splice(ndx, 1)
            }
            //add class to processed element
            if(_cssProcessedElements.has(e.name)){
                const addClass = `${e.name}-${_uniquePrefix}`
                if(e.attribs && e.attribs.class){
                    e.attribs.class += ` ${addClass}`
                } else {
                    e.attribs.class = addClass
                }
            }
            if(e.childNodes)
                _traverseDomNodes(e.childNodes)
        })
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