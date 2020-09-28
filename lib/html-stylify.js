'use strict'
const { Parser } = require("htmlparser2")
const { DomHandler } = require("domhandler")
const domSerializer = require("dom-serializer").default
const css = require('css')

const HtmlStylify = function(parser){

    /* properties */
    
    /* private properties */
    let domParser = parser | null
    let _options = {
        normalizeHtml: false,
        replaceElement: 'div',
        removeScripts: true,
        uniqueSuffix: null
    }
    let _uniqueSuffix = null
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
     * @param {_options} options - An object containing options as properties. If omitted, default options will be used
     */
    this.process = function(input, options){
        _initOptions(options)
        _uniqueSuffix = _options.uniqueSuffix ? _options.uniqueSuffix : 'hs-' + Date.now()
        if(typeof input !== 'string'){
            throw Error('Passed input is not of type string!')
        }
        _loadedRawHtml = input
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
        _domHandler = new DomHandler((error, dom) => {
            if (error) {
                throw Error('domHandler error: ' + error)
            }
            _htmlDocument = dom
            _changeHtml()
        }, {withStartIndices: true, withEndIndices: true})

        domParser = new Parser(_domHandler, _htmlParserOptions)
        domParser.write(_loadedRawHtml)
        domParser.end()
    }

    function _parseCss(cssString){
        //if error in parsing is thrown, attempt to fix css by removing style
        try{
            _cssAST = css.parse(cssString, _cssParserOptions)
            _addSplice()
            _processCssAST()
        } catch(error){
            const errorPos = cssString.indexOf(error.source)
            const leftString = cssString.substring(0, errorPos)
            //find the nearest opening curly bracket
            const leftStringBracket = leftString.lastIndexOf('{')
            //find the nearest closing bracket in error string
            const rightStringBracket = error.source.indexOf('}')
            cssString = cssString.substring(0, leftStringBracket+1) + cssString.substring(errorPos + rightStringBracket)
            //atempt to parse again in silent
            _cssAST = css.parse(cssString, {silent: true})
            if(_cssAST.stylesheet.parsingErrors.length > 0) {
                console.log('CSS parsing errors: ' + _cssAST.stylesheet.parsingErrors)
            }
        }
    }

    function _processCssAST(){
        _cssAST.stylesheet.rules.forEach(rule => {
            if(rule.type === 'rule'){
                rule.selectors = _processRules(rule.selectors)
            } else if (rule.type === 'media' || rule.type === 'keyframes'){
                rule.rules.forEach(r => {
                    if(r.type === 'rule'){
                        r.selectors = _processRules(r.selectors)
                    }
                })
            }
        })
    }

    function _processRules(selectors){
        let rules = []
        selectors.forEach(ruleSelector => {
            ruleSelector = _manageRuleSelector(ruleSelector)
            rules.push(ruleSelector)
        })
        return rules
    }

    function _manageRuleSelector(ruleSelector){
        ruleSelector = ruleSelector.split(' ')
        let selectorsArr = []
        ruleSelector.forEach(selector => {
            //selector == 'html' && console.log(selector)
            if(selector.indexOf('.') === -1 && selector.indexOf('#') === -1 && selector != '+' && selector != '>'){
                const attr = selector.indexOf('[') > -1 ? selector.indexOf('[') : selector.indexOf(':')
                if(attr > -1) {
                    selectorsArr.push(`.${selector.splice(attr, `-${_uniqueSuffix}`)}`)
                } else {
                    selectorsArr.push(`.${selector}-${_uniqueSuffix}`)
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
        for (let i = DOMNodes.length; i >= 0; i--){
            const domElement = DOMNodes[i]
            _manageDomElement(i, DOMNodes)
            if(domElement && domElement.children && domElement.children.length)
                _traverseDomNodes(domElement.children)
        }
    }

    function _manageDomElement(ndx, nodes){
        let element = nodes[ndx]
        if(element && !element.processed){
            const addClass = `${element.name}-${_uniqueSuffix}`
            //process styles
            if(element.type === 'style' && element.attribs.type === 'text/css'){
                element.children.forEach(e => {
                    _parseCss(e.data)
                    e.data = css.stringify(_cssAST)
                })
            }
            //remove scripts
            if(_options.removeScripts){
                if(element.type === 'tag' && element.name === 'script'){
                    nodes.splice(ndx, 1)
                }
            }
            //replace html, head, body and remove meta, title, comments
            if(_options.normalizeHtml){
                if(element && element.type === 'tag' && (element.name === 'html' || element.name === 'body')){
                    _addClass(element, addClass)
                    _cssProcessedElements.delete(element.name)
                    element.name = _options.replaceElement
                }
                if(element && element.type === 'tag' && element.name === 'head'){
                    element.attribs.style = element.attribs.style ? (element.attribs.style + ' display: none;') : 'display: none;'
                    element.tagName = 'span'
                }
                if(element && element.type === 'tag' && element.name === 'meta'){
                    nodes.splice(ndx, 1)
                }
                if(element && element.type === 'tag' && element.name === 'title'){
                    nodes.splice(ndx, 1)
                }
                if(element && element.type === 'comment'){
                    nodes.splice(ndx, 1)
                }
            }
            //add class to processed element
            if(element && _cssProcessedElements.has(element.name)){
                _addClass(element, addClass)
            }
            //if the element has not been deleted, mark as processed
            if(element){
                element.processed = true
            }
        }
    }

    function _addClass(element, className){
        if(element.attribs && element.attribs.class){
            if(element.attribs.class.indexOf(className) === -1)
                element.attribs.class += ` ${className}`
        } else {
            element.attribs.class = className
        }
    }

    function _initOptions(opt){
        if(opt && typeof opt === 'object'){
            _options = Object.assign(_options, opt)
        }
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