/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler/src/ml_parser/parser", ["require", "exports", "tslib", "@angular/compiler/src/parse_util", "@angular/compiler/src/ml_parser/ast", "@angular/compiler/src/ml_parser/entities", "@angular/compiler/src/ml_parser/lexer", "@angular/compiler/src/ml_parser/tags"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = exports.ParseTreeResult = exports.TreeError = void 0;
    var tslib_1 = require("tslib");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var html = require("@angular/compiler/src/ml_parser/ast");
    var entities_1 = require("@angular/compiler/src/ml_parser/entities");
    var lexer_1 = require("@angular/compiler/src/ml_parser/lexer");
    var tags_1 = require("@angular/compiler/src/ml_parser/tags");
    var TreeError = /** @class */ (function (_super) {
        tslib_1.__extends(TreeError, _super);
        function TreeError(elementName, span, msg) {
            var _this = _super.call(this, span, msg) || this;
            _this.elementName = elementName;
            return _this;
        }
        TreeError.create = function (elementName, span, msg) {
            return new TreeError(elementName, span, msg);
        };
        return TreeError;
    }(parse_util_1.ParseError));
    exports.TreeError = TreeError;
    var ParseTreeResult = /** @class */ (function () {
        function ParseTreeResult(rootNodes, errors) {
            this.rootNodes = rootNodes;
            this.errors = errors;
        }
        return ParseTreeResult;
    }());
    exports.ParseTreeResult = ParseTreeResult;
    var Parser = /** @class */ (function () {
        function Parser(getTagDefinition) {
            this.getTagDefinition = getTagDefinition;
        }
        Parser.prototype.parse = function (source, url, options) {
            var tokenizeResult = lexer_1.tokenize(source, url, this.getTagDefinition, options);
            var parser = new _TreeBuilder(tokenizeResult.tokens, this.getTagDefinition);
            parser.build();
            return new ParseTreeResult(parser.rootNodes, tokenizeResult.errors.concat(parser.errors));
        };
        return Parser;
    }());
    exports.Parser = Parser;
    var _TreeBuilder = /** @class */ (function () {
        function _TreeBuilder(tokens, getTagDefinition) {
            this.tokens = tokens;
            this.getTagDefinition = getTagDefinition;
            this._index = -1;
            this._elementStack = [];
            this.rootNodes = [];
            this.errors = [];
            this._advance();
        }
        _TreeBuilder.prototype.build = function () {
            while (this._peek.type !== 24 /* EOF */) {
                if (this._peek.type === 0 /* TAG_OPEN_START */ ||
                    this._peek.type === 4 /* INCOMPLETE_TAG_OPEN */) {
                    this._consumeStartTag(this._advance());
                }
                else if (this._peek.type === 3 /* TAG_CLOSE */) {
                    this._consumeEndTag(this._advance());
                }
                else if (this._peek.type === 12 /* CDATA_START */) {
                    this._closeVoidElement();
                    this._consumeCdata(this._advance());
                }
                else if (this._peek.type === 10 /* COMMENT_START */) {
                    this._closeVoidElement();
                    this._consumeComment(this._advance());
                }
                else if (this._peek.type === 5 /* TEXT */ || this._peek.type === 7 /* RAW_TEXT */ ||
                    this._peek.type === 6 /* ESCAPABLE_RAW_TEXT */) {
                    this._closeVoidElement();
                    this._consumeText(this._advance());
                }
                else if (this._peek.type === 19 /* EXPANSION_FORM_START */) {
                    this._consumeExpansion(this._advance());
                }
                else {
                    // Skip all other tokens...
                    this._advance();
                }
            }
        };
        _TreeBuilder.prototype._advance = function () {
            var prev = this._peek;
            if (this._index < this.tokens.length - 1) {
                // Note: there is always an EOF token at the end
                this._index++;
            }
            this._peek = this.tokens[this._index];
            return prev;
        };
        _TreeBuilder.prototype._advanceIf = function (type) {
            if (this._peek.type === type) {
                return this._advance();
            }
            return null;
        };
        _TreeBuilder.prototype._consumeCdata = function (_startToken) {
            this._consumeText(this._advance());
            this._advanceIf(13 /* CDATA_END */);
        };
        _TreeBuilder.prototype._consumeComment = function (token) {
            var text = this._advanceIf(7 /* RAW_TEXT */);
            this._advanceIf(11 /* COMMENT_END */);
            var value = text != null ? text.parts[0].trim() : null;
            this._addToParent(new html.Comment(value, token.sourceSpan));
        };
        _TreeBuilder.prototype._consumeExpansion = function (token) {
            var switchValue = this._advance();
            var type = this._advance();
            var cases = [];
            // read =
            while (this._peek.type === 20 /* EXPANSION_CASE_VALUE */) {
                var expCase = this._parseExpansionCase();
                if (!expCase)
                    return; // error
                cases.push(expCase);
            }
            // read the final }
            if (this._peek.type !== 23 /* EXPANSION_FORM_END */) {
                this.errors.push(TreeError.create(null, this._peek.sourceSpan, "Invalid ICU message. Missing '}'."));
                return;
            }
            var sourceSpan = new parse_util_1.ParseSourceSpan(token.sourceSpan.start, this._peek.sourceSpan.end, token.sourceSpan.fullStart);
            this._addToParent(new html.Expansion(switchValue.parts[0], type.parts[0], cases, sourceSpan, switchValue.sourceSpan));
            this._advance();
        };
        _TreeBuilder.prototype._parseExpansionCase = function () {
            var value = this._advance();
            // read {
            if (this._peek.type !== 21 /* EXPANSION_CASE_EXP_START */) {
                this.errors.push(TreeError.create(null, this._peek.sourceSpan, "Invalid ICU message. Missing '{'."));
                return null;
            }
            // read until }
            var start = this._advance();
            var exp = this._collectExpansionExpTokens(start);
            if (!exp)
                return null;
            var end = this._advance();
            exp.push({ type: 24 /* EOF */, parts: [], sourceSpan: end.sourceSpan });
            // parse everything in between { and }
            var expansionCaseParser = new _TreeBuilder(exp, this.getTagDefinition);
            expansionCaseParser.build();
            if (expansionCaseParser.errors.length > 0) {
                this.errors = this.errors.concat(expansionCaseParser.errors);
                return null;
            }
            var sourceSpan = new parse_util_1.ParseSourceSpan(value.sourceSpan.start, end.sourceSpan.end, value.sourceSpan.fullStart);
            var expSourceSpan = new parse_util_1.ParseSourceSpan(start.sourceSpan.start, end.sourceSpan.end, start.sourceSpan.fullStart);
            return new html.ExpansionCase(value.parts[0], expansionCaseParser.rootNodes, sourceSpan, value.sourceSpan, expSourceSpan);
        };
        _TreeBuilder.prototype._collectExpansionExpTokens = function (start) {
            var exp = [];
            var expansionFormStack = [21 /* EXPANSION_CASE_EXP_START */];
            while (true) {
                if (this._peek.type === 19 /* EXPANSION_FORM_START */ ||
                    this._peek.type === 21 /* EXPANSION_CASE_EXP_START */) {
                    expansionFormStack.push(this._peek.type);
                }
                if (this._peek.type === 22 /* EXPANSION_CASE_EXP_END */) {
                    if (lastOnStack(expansionFormStack, 21 /* EXPANSION_CASE_EXP_START */)) {
                        expansionFormStack.pop();
                        if (expansionFormStack.length === 0)
                            return exp;
                    }
                    else {
                        this.errors.push(TreeError.create(null, start.sourceSpan, "Invalid ICU message. Missing '}'."));
                        return null;
                    }
                }
                if (this._peek.type === 23 /* EXPANSION_FORM_END */) {
                    if (lastOnStack(expansionFormStack, 19 /* EXPANSION_FORM_START */)) {
                        expansionFormStack.pop();
                    }
                    else {
                        this.errors.push(TreeError.create(null, start.sourceSpan, "Invalid ICU message. Missing '}'."));
                        return null;
                    }
                }
                if (this._peek.type === 24 /* EOF */) {
                    this.errors.push(TreeError.create(null, start.sourceSpan, "Invalid ICU message. Missing '}'."));
                    return null;
                }
                exp.push(this._advance());
            }
        };
        _TreeBuilder.prototype._consumeText = function (token) {
            var tokens = [token];
            var startSpan = token.sourceSpan;
            var text = token.parts[0];
            if (text.length > 0 && text[0] === '\n') {
                var parent_1 = this._getParentElement();
                if (parent_1 != null && parent_1.children.length === 0 &&
                    this.getTagDefinition(parent_1.name).ignoreFirstLf) {
                    text = text.substring(1);
                    tokens[0] = { type: token.type, sourceSpan: token.sourceSpan, parts: [text] };
                }
            }
            while (this._peek.type === 8 /* INTERPOLATION */ || this._peek.type === 5 /* TEXT */ ||
                this._peek.type === 9 /* ENCODED_ENTITY */) {
                token = this._advance();
                tokens.push(token);
                if (token.type === 8 /* INTERPOLATION */) {
                    // For backward compatibility we decode HTML entities that appear in interpolation
                    // expressions. This is arguably a bug, but it could be a considerable breaking change to
                    // fix it. It should be addressed in a larger project to refactor the entire parser/lexer
                    // chain after View Engine has been removed.
                    text += token.parts.join('').replace(/&([^;]+);/g, decodeEntity);
                }
                else if (token.type === 9 /* ENCODED_ENTITY */) {
                    text += token.parts[0];
                }
                else {
                    text += token.parts.join('');
                }
            }
            if (text.length > 0) {
                var endSpan = token.sourceSpan;
                this._addToParent(new html.Text(text, new parse_util_1.ParseSourceSpan(startSpan.start, endSpan.end, startSpan.fullStart, startSpan.details), tokens));
            }
        };
        _TreeBuilder.prototype._closeVoidElement = function () {
            var el = this._getParentElement();
            if (el && this.getTagDefinition(el.name).isVoid) {
                this._elementStack.pop();
            }
        };
        _TreeBuilder.prototype._consumeStartTag = function (startTagToken) {
            var _a = tslib_1.__read(startTagToken.parts, 2), prefix = _a[0], name = _a[1];
            var attrs = [];
            while (this._peek.type === 14 /* ATTR_NAME */) {
                attrs.push(this._consumeAttr(this._advance()));
            }
            var fullName = this._getElementFullName(prefix, name, this._getParentElement());
            var selfClosing = false;
            // Note: There could have been a tokenizer error
            // so that we don't get a token for the end tag...
            if (this._peek.type === 2 /* TAG_OPEN_END_VOID */) {
                this._advance();
                selfClosing = true;
                var tagDef = this.getTagDefinition(fullName);
                if (!(tagDef.canSelfClose || tags_1.getNsPrefix(fullName) !== null || tagDef.isVoid)) {
                    this.errors.push(TreeError.create(fullName, startTagToken.sourceSpan, "Only void and foreign elements can be self closed \"" + startTagToken.parts[1] + "\""));
                }
            }
            else if (this._peek.type === 1 /* TAG_OPEN_END */) {
                this._advance();
                selfClosing = false;
            }
            var end = this._peek.sourceSpan.fullStart;
            var span = new parse_util_1.ParseSourceSpan(startTagToken.sourceSpan.start, end, startTagToken.sourceSpan.fullStart);
            // Create a separate `startSpan` because `span` will be modified when there is an `end` span.
            var startSpan = new parse_util_1.ParseSourceSpan(startTagToken.sourceSpan.start, end, startTagToken.sourceSpan.fullStart);
            var el = new html.Element(fullName, attrs, [], span, startSpan, undefined);
            this._pushElement(el);
            if (selfClosing) {
                // Elements that are self-closed have their `endSourceSpan` set to the full span, as the
                // element start tag also represents the end tag.
                this._popElement(fullName, span);
            }
            else if (startTagToken.type === 4 /* INCOMPLETE_TAG_OPEN */) {
                // We already know the opening tag is not complete, so it is unlikely it has a corresponding
                // close tag. Let's optimistically parse it as a full element and emit an error.
                this._popElement(fullName, null);
                this.errors.push(TreeError.create(fullName, span, "Opening tag \"" + fullName + "\" not terminated."));
            }
        };
        _TreeBuilder.prototype._pushElement = function (el) {
            var parentEl = this._getParentElement();
            if (parentEl && this.getTagDefinition(parentEl.name).isClosedByChild(el.name)) {
                this._elementStack.pop();
            }
            this._addToParent(el);
            this._elementStack.push(el);
        };
        _TreeBuilder.prototype._consumeEndTag = function (endTagToken) {
            var fullName = this._getElementFullName(endTagToken.parts[0], endTagToken.parts[1], this._getParentElement());
            if (this.getTagDefinition(fullName).isVoid) {
                this.errors.push(TreeError.create(fullName, endTagToken.sourceSpan, "Void elements do not have end tags \"" + endTagToken.parts[1] + "\""));
            }
            else if (!this._popElement(fullName, endTagToken.sourceSpan)) {
                var errMsg = "Unexpected closing tag \"" + fullName + "\". It may happen when the tag has already been closed by another tag. For more info see https://www.w3.org/TR/html5/syntax.html#closing-elements-that-have-implied-end-tags";
                this.errors.push(TreeError.create(fullName, endTagToken.sourceSpan, errMsg));
            }
        };
        /**
         * Closes the nearest element with the tag name `fullName` in the parse tree.
         * `endSourceSpan` is the span of the closing tag, or null if the element does
         * not have a closing tag (for example, this happens when an incomplete
         * opening tag is recovered).
         */
        _TreeBuilder.prototype._popElement = function (fullName, endSourceSpan) {
            var unexpectedCloseTagDetected = false;
            for (var stackIndex = this._elementStack.length - 1; stackIndex >= 0; stackIndex--) {
                var el = this._elementStack[stackIndex];
                if (el.name === fullName) {
                    // Record the parse span with the element that is being closed. Any elements that are
                    // removed from the element stack at this point are closed implicitly, so they won't get
                    // an end source span (as there is no explicit closing element).
                    el.endSourceSpan = endSourceSpan;
                    el.sourceSpan.end = endSourceSpan !== null ? endSourceSpan.end : el.sourceSpan.end;
                    this._elementStack.splice(stackIndex, this._elementStack.length - stackIndex);
                    return !unexpectedCloseTagDetected;
                }
                if (!this.getTagDefinition(el.name).closedByParent) {
                    // Note that we encountered an unexpected close tag but continue processing the element
                    // stack so we can assign an `endSourceSpan` if there is a corresponding start tag for this
                    // end tag in the stack.
                    unexpectedCloseTagDetected = true;
                }
            }
            return false;
        };
        _TreeBuilder.prototype._consumeAttr = function (attrName) {
            var fullName = tags_1.mergeNsAndName(attrName.parts[0], attrName.parts[1]);
            var attrEnd = attrName.sourceSpan.end;
            // Consume any quote
            if (this._peek.type === 15 /* ATTR_QUOTE */) {
                this._advance();
            }
            // Consume the attribute value
            var value = '';
            var valueTokens = [];
            var valueStartSpan = undefined;
            var valueEnd = undefined;
            // NOTE: We need to use a new variable `nextTokenType` here to hide the actual type of
            // `_peek.type` from TS. Otherwise TS will narrow the type of `_peek.type` preventing it from
            // being able to consider `ATTR_VALUE_INTERPOLATION` as an option. This is because TS is not
            // able to see that `_advance()` will actually mutate `_peek`.
            var nextTokenType = this._peek.type;
            if (nextTokenType === 16 /* ATTR_VALUE_TEXT */) {
                valueStartSpan = this._peek.sourceSpan;
                valueEnd = this._peek.sourceSpan.end;
                while (this._peek.type === 16 /* ATTR_VALUE_TEXT */ ||
                    this._peek.type === 17 /* ATTR_VALUE_INTERPOLATION */ ||
                    this._peek.type === 9 /* ENCODED_ENTITY */) {
                    var valueToken = this._advance();
                    valueTokens.push(valueToken);
                    if (valueToken.type === 17 /* ATTR_VALUE_INTERPOLATION */) {
                        // For backward compatibility we decode HTML entities that appear in interpolation
                        // expressions. This is arguably a bug, but it could be a considerable breaking change to
                        // fix it. It should be addressed in a larger project to refactor the entire parser/lexer
                        // chain after View Engine has been removed.
                        value += valueToken.parts.join('').replace(/&([^;]+);/g, decodeEntity);
                    }
                    else if (valueToken.type === 9 /* ENCODED_ENTITY */) {
                        value += valueToken.parts[0];
                    }
                    else {
                        value += valueToken.parts.join('');
                    }
                    valueEnd = attrEnd = valueToken.sourceSpan.end;
                }
            }
            // Consume any quote
            if (this._peek.type === 15 /* ATTR_QUOTE */) {
                var quoteToken = this._advance();
                attrEnd = quoteToken.sourceSpan.end;
            }
            var valueSpan = valueStartSpan && valueEnd &&
                new parse_util_1.ParseSourceSpan(valueStartSpan.start, valueEnd, valueStartSpan.fullStart);
            return new html.Attribute(fullName, value, new parse_util_1.ParseSourceSpan(attrName.sourceSpan.start, attrEnd, attrName.sourceSpan.fullStart), attrName.sourceSpan, valueSpan, valueTokens.length > 0 ? valueTokens : undefined, undefined);
        };
        _TreeBuilder.prototype._getParentElement = function () {
            return this._elementStack.length > 0 ? this._elementStack[this._elementStack.length - 1] : null;
        };
        _TreeBuilder.prototype._addToParent = function (node) {
            var parent = this._getParentElement();
            if (parent != null) {
                parent.children.push(node);
            }
            else {
                this.rootNodes.push(node);
            }
        };
        _TreeBuilder.prototype._getElementFullName = function (prefix, localName, parentElement) {
            if (prefix === '') {
                prefix = this.getTagDefinition(localName).implicitNamespacePrefix || '';
                if (prefix === '' && parentElement != null) {
                    var parentTagName = tags_1.splitNsName(parentElement.name)[1];
                    var parentTagDefinition = this.getTagDefinition(parentTagName);
                    if (!parentTagDefinition.preventNamespaceInheritance) {
                        prefix = tags_1.getNsPrefix(parentElement.name);
                    }
                }
            }
            return tags_1.mergeNsAndName(prefix, localName);
        };
        return _TreeBuilder;
    }());
    function lastOnStack(stack, element) {
        return stack.length > 0 && stack[stack.length - 1] === element;
    }
    /**
     * Decode the `entity` string, which we believe is the contents of an HTML entity.
     *
     * If the string is not actually a valid/known entity then just return the original `match` string.
     */
    function decodeEntity(match, entity) {
        if (entities_1.NAMED_ENTITIES[entity] !== undefined) {
            return entities_1.NAMED_ENTITIES[entity] || match;
        }
        if (/^#x[a-f0-9]+$/i.test(entity)) {
            return String.fromCodePoint(parseInt(entity.slice(2), 16));
        }
        if (/^#\d+$/.test(entity)) {
            return String.fromCodePoint(parseInt(entity.slice(1), 10));
        }
        return match;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXIvc3JjL21sX3BhcnNlci9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtEQUF5RTtJQUV6RSwwREFBOEI7SUFDOUIscUVBQTBDO0lBQzFDLCtEQUFrRDtJQUNsRCw2REFBK0U7SUFHL0U7UUFBK0IscUNBQVU7UUFLdkMsbUJBQW1CLFdBQXdCLEVBQUUsSUFBcUIsRUFBRSxHQUFXO1lBQS9FLFlBQ0Usa0JBQU0sSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUNqQjtZQUZrQixpQkFBVyxHQUFYLFdBQVcsQ0FBYTs7UUFFM0MsQ0FBQztRQU5NLGdCQUFNLEdBQWIsVUFBYyxXQUF3QixFQUFFLElBQXFCLEVBQUUsR0FBVztZQUN4RSxPQUFPLElBQUksU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUtILGdCQUFDO0lBQUQsQ0FBQyxBQVJELENBQStCLHVCQUFVLEdBUXhDO0lBUlksOEJBQVM7SUFVdEI7UUFDRSx5QkFBbUIsU0FBc0IsRUFBUyxNQUFvQjtZQUFuRCxjQUFTLEdBQVQsU0FBUyxDQUFhO1lBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBYztRQUFHLENBQUM7UUFDNUUsc0JBQUM7SUFBRCxDQUFDLEFBRkQsSUFFQztJQUZZLDBDQUFlO0lBSTVCO1FBQ0UsZ0JBQW1CLGdCQUFvRDtZQUFwRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW9DO1FBQUcsQ0FBQztRQUUzRSxzQkFBSyxHQUFMLFVBQU0sTUFBYyxFQUFFLEdBQVcsRUFBRSxPQUF5QjtZQUMxRCxJQUFNLGNBQWMsR0FBRyxnQkFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lB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QUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1BhcnNlRXJyb3IsIFBhcnNlTG9jYXRpb24sIFBhcnNlU291cmNlU3Bhbn0gZnJvbSAnLi4vcGFyc2VfdXRpbCc7XG5cbmltcG9ydCAqIGFzIGh0bWwgZnJvbSAnLi9hc3QnO1xuaW1wb3J0IHtOQU1FRF9FTlRJVElFU30gZnJvbSAnLi9lbnRpdGllcyc7XG5pbXBvcnQge3Rva2VuaXplLCBUb2tlbml6ZU9wdGlvbnN9IGZyb20gJy4vbGV4ZXInO1xuaW1wb3J0IHtnZXROc1ByZWZpeCwgbWVyZ2VOc0FuZE5hbWUsIHNwbGl0TnNOYW1lLCBUYWdEZWZpbml0aW9ufSBmcm9tICcuL3RhZ3MnO1xuaW1wb3J0IHtBdHRyaWJ1dGVOYW1lVG9rZW4sIEF0dHJpYnV0ZVF1b3RlVG9rZW4sIENkYXRhU3RhcnRUb2tlbiwgQ29tbWVudFN0YXJ0VG9rZW4sIEV4cGFuc2lvbkNhc2VFeHByZXNzaW9uRW5kVG9rZW4sIEV4cGFuc2lvbkNhc2VFeHByZXNzaW9uU3RhcnRUb2tlbiwgRXhwYW5zaW9uQ2FzZVZhbHVlVG9rZW4sIEV4cGFuc2lvbkZvcm1TdGFydFRva2VuLCBJbmNvbXBsZXRlVGFnT3BlblRva2VuLCBJbnRlcnBvbGF0ZWRBdHRyaWJ1dGVUb2tlbiwgSW50ZXJwb2xhdGVkVGV4dFRva2VuLCBUYWdDbG9zZVRva2VuLCBUYWdPcGVuU3RhcnRUb2tlbiwgVGV4dFRva2VuLCBUb2tlbiwgVG9rZW5UeXBlfSBmcm9tICcuL3Rva2Vucyc7XG5cbmV4cG9ydCBjbGFzcyBUcmVlRXJyb3IgZXh0ZW5kcyBQYXJzZUVycm9yIHtcbiAgc3RhdGljIGNyZWF0ZShlbGVtZW50TmFtZTogc3RyaW5nfG51bGwsIHNwYW46IFBhcnNlU291cmNlU3BhbiwgbXNnOiBzdHJpbmcpOiBUcmVlRXJyb3Ige1xuICAgIHJldHVybiBuZXcgVHJlZUVycm9yKGVsZW1lbnROYW1lLCBzcGFuLCBtc2cpO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHVibGljIGVsZW1lbnROYW1lOiBzdHJpbmd8bnVsbCwgc3BhbjogUGFyc2VTb3VyY2VTcGFuLCBtc2c6IHN0cmluZykge1xuICAgIHN1cGVyKHNwYW4sIG1zZyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBhcnNlVHJlZVJlc3VsdCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb290Tm9kZXM6IGh0bWwuTm9kZVtdLCBwdWJsaWMgZXJyb3JzOiBQYXJzZUVycm9yW10pIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJzZXIge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgZ2V0VGFnRGVmaW5pdGlvbjogKHRhZ05hbWU6IHN0cmluZykgPT4gVGFnRGVmaW5pdGlvbikge31cblxuICBwYXJzZShzb3VyY2U6IHN0cmluZywgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBUb2tlbml6ZU9wdGlvbnMpOiBQYXJzZVRyZWVSZXN1bHQge1xuICAgIGNvbnN0IHRva2VuaXplUmVzdWx0ID0gdG9rZW5pemUoc291cmNlLCB1cmwsIHRoaXMuZ2V0VGFnRGVmaW5pdGlvbiwgb3B0aW9ucyk7XG4gICAgY29uc3QgcGFyc2VyID0gbmV3IF9UcmVlQnVpbGRlcih0b2tlbml6ZVJlc3VsdC50b2tlbnMsIHRoaXMuZ2V0VGFnRGVmaW5pdGlvbik7XG4gICAgcGFyc2VyLmJ1aWxkKCk7XG4gICAgcmV0dXJuIG5ldyBQYXJzZVRyZWVSZXN1bHQoXG4gICAgICAgIHBhcnNlci5yb290Tm9kZXMsXG4gICAgICAgICh0b2tlbml6ZVJlc3VsdC5lcnJvcnMgYXMgUGFyc2VFcnJvcltdKS5jb25jYXQocGFyc2VyLmVycm9ycyksXG4gICAgKTtcbiAgfVxufVxuXG5jbGFzcyBfVHJlZUJ1aWxkZXIge1xuICBwcml2YXRlIF9pbmRleDogbnVtYmVyID0gLTE7XG4gIC8vIGBfcGVla2Agd2lsbCBiZSBpbml0aWFsaXplZCBieSB0aGUgY2FsbCB0byBgX2FkdmFuY2UoKWAgaW4gdGhlIGNvbnN0cnVjdG9yLlxuICBwcml2YXRlIF9wZWVrITogVG9rZW47XG4gIHByaXZhdGUgX2VsZW1lbnRTdGFjazogaHRtbC5FbGVtZW50W10gPSBbXTtcblxuICByb290Tm9kZXM6IGh0bWwuTm9kZVtdID0gW107XG4gIGVycm9yczogVHJlZUVycm9yW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdG9rZW5zOiBUb2tlbltdLCBwcml2YXRlIGdldFRhZ0RlZmluaXRpb246ICh0YWdOYW1lOiBzdHJpbmcpID0+IFRhZ0RlZmluaXRpb24pIHtcbiAgICB0aGlzLl9hZHZhbmNlKCk7XG4gIH1cblxuICBidWlsZCgpOiB2b2lkIHtcbiAgICB3aGlsZSAodGhpcy5fcGVlay50eXBlICE9PSBUb2tlblR5cGUuRU9GKSB7XG4gICAgICBpZiAodGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuVEFHX09QRU5fU1RBUlQgfHxcbiAgICAgICAgICB0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5JTkNPTVBMRVRFX1RBR19PUEVOKSB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVTdGFydFRhZyh0aGlzLl9hZHZhbmNlPFRhZ09wZW5TdGFydFRva2VufEluY29tcGxldGVUYWdPcGVuVG9rZW4+KCkpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5UQUdfQ0xPU0UpIHtcbiAgICAgICAgdGhpcy5fY29uc3VtZUVuZFRhZyh0aGlzLl9hZHZhbmNlPFRhZ0Nsb3NlVG9rZW4+KCkpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5DREFUQV9TVEFSVCkge1xuICAgICAgICB0aGlzLl9jbG9zZVZvaWRFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVDZGF0YSh0aGlzLl9hZHZhbmNlPENkYXRhU3RhcnRUb2tlbj4oKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX3BlZWsudHlwZSA9PT0gVG9rZW5UeXBlLkNPTU1FTlRfU1RBUlQpIHtcbiAgICAgICAgdGhpcy5fY2xvc2VWb2lkRWxlbWVudCgpO1xuICAgICAgICB0aGlzLl9jb25zdW1lQ29tbWVudCh0aGlzLl9hZHZhbmNlPENvbW1lbnRTdGFydFRva2VuPigpKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgdGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuVEVYVCB8fCB0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5SQVdfVEVYVCB8fFxuICAgICAgICAgIHRoaXMuX3BlZWsudHlwZSA9PT0gVG9rZW5UeXBlLkVTQ0FQQUJMRV9SQVdfVEVYVCkge1xuICAgICAgICB0aGlzLl9jbG9zZVZvaWRFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVUZXh0KHRoaXMuX2FkdmFuY2U8VGV4dFRva2VuPigpKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuRVhQQU5TSU9OX0ZPUk1fU1RBUlQpIHtcbiAgICAgICAgdGhpcy5fY29uc3VtZUV4cGFuc2lvbih0aGlzLl9hZHZhbmNlPEV4cGFuc2lvbkZvcm1TdGFydFRva2VuPigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNraXAgYWxsIG90aGVyIHRva2Vucy4uLlxuICAgICAgICB0aGlzLl9hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfYWR2YW5jZTxUIGV4dGVuZHMgVG9rZW4+KCk6IFQge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9wZWVrO1xuICAgIGlmICh0aGlzLl9pbmRleCA8IHRoaXMudG9rZW5zLmxlbmd0aCAtIDEpIHtcbiAgICAgIC8vIE5vdGU6IHRoZXJlIGlzIGFsd2F5cyBhbiBFT0YgdG9rZW4gYXQgdGhlIGVuZFxuICAgICAgdGhpcy5faW5kZXgrKztcbiAgICB9XG4gICAgdGhpcy5fcGVlayA9IHRoaXMudG9rZW5zW3RoaXMuX2luZGV4XTtcbiAgICByZXR1cm4gcHJldiBhcyBUO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWR2YW5jZUlmPFQgZXh0ZW5kcyBUb2tlblR5cGU+KHR5cGU6IFQpOiAoVG9rZW4me3R5cGU6IFR9KXxudWxsIHtcbiAgICBpZiAodGhpcy5fcGVlay50eXBlID09PSB0eXBlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWR2YW5jZTxUb2tlbiZ7dHlwZTogVH0+KCk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZUNkYXRhKF9zdGFydFRva2VuOiBDZGF0YVN0YXJ0VG9rZW4pIHtcbiAgICB0aGlzLl9jb25zdW1lVGV4dCh0aGlzLl9hZHZhbmNlPFRleHRUb2tlbj4oKSk7XG4gICAgdGhpcy5fYWR2YW5jZUlmKFRva2VuVHlwZS5DREFUQV9FTkQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZUNvbW1lbnQodG9rZW46IENvbW1lbnRTdGFydFRva2VuKSB7XG4gICAgY29uc3QgdGV4dCA9IHRoaXMuX2FkdmFuY2VJZihUb2tlblR5cGUuUkFXX1RFWFQpO1xuICAgIHRoaXMuX2FkdmFuY2VJZihUb2tlblR5cGUuQ09NTUVOVF9FTkQpO1xuICAgIGNvbnN0IHZhbHVlID0gdGV4dCAhPSBudWxsID8gdGV4dC5wYXJ0c1swXS50cmltKCkgOiBudWxsO1xuICAgIHRoaXMuX2FkZFRvUGFyZW50KG5ldyBodG1sLkNvbW1lbnQodmFsdWUsIHRva2VuLnNvdXJjZVNwYW4pKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVFeHBhbnNpb24odG9rZW46IEV4cGFuc2lvbkZvcm1TdGFydFRva2VuKSB7XG4gICAgY29uc3Qgc3dpdGNoVmFsdWUgPSB0aGlzLl9hZHZhbmNlPFRleHRUb2tlbj4oKTtcblxuICAgIGNvbnN0IHR5cGUgPSB0aGlzLl9hZHZhbmNlPFRleHRUb2tlbj4oKTtcbiAgICBjb25zdCBjYXNlczogaHRtbC5FeHBhbnNpb25DYXNlW10gPSBbXTtcblxuICAgIC8vIHJlYWQgPVxuICAgIHdoaWxlICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5FWFBBTlNJT05fQ0FTRV9WQUxVRSkge1xuICAgICAgY29uc3QgZXhwQ2FzZSA9IHRoaXMuX3BhcnNlRXhwYW5zaW9uQ2FzZSgpO1xuICAgICAgaWYgKCFleHBDYXNlKSByZXR1cm47ICAvLyBlcnJvclxuICAgICAgY2FzZXMucHVzaChleHBDYXNlKTtcbiAgICB9XG5cbiAgICAvLyByZWFkIHRoZSBmaW5hbCB9XG4gICAgaWYgKHRoaXMuX3BlZWsudHlwZSAhPT0gVG9rZW5UeXBlLkVYUEFOU0lPTl9GT1JNX0VORCkge1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChcbiAgICAgICAgICBUcmVlRXJyb3IuY3JlYXRlKG51bGwsIHRoaXMuX3BlZWsuc291cmNlU3BhbiwgYEludmFsaWQgSUNVIG1lc3NhZ2UuIE1pc3NpbmcgJ30nLmApKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlU3BhbiA9IG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICAgIHRva2VuLnNvdXJjZVNwYW4uc3RhcnQsIHRoaXMuX3BlZWsuc291cmNlU3Bhbi5lbmQsIHRva2VuLnNvdXJjZVNwYW4uZnVsbFN0YXJ0KTtcbiAgICB0aGlzLl9hZGRUb1BhcmVudChuZXcgaHRtbC5FeHBhbnNpb24oXG4gICAgICAgIHN3aXRjaFZhbHVlLnBhcnRzWzBdLCB0eXBlLnBhcnRzWzBdLCBjYXNlcywgc291cmNlU3Bhbiwgc3dpdGNoVmFsdWUuc291cmNlU3BhbikpO1xuXG4gICAgdGhpcy5fYWR2YW5jZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcGFyc2VFeHBhbnNpb25DYXNlKCk6IGh0bWwuRXhwYW5zaW9uQ2FzZXxudWxsIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX2FkdmFuY2U8RXhwYW5zaW9uQ2FzZVZhbHVlVG9rZW4+KCk7XG5cbiAgICAvLyByZWFkIHtcbiAgICBpZiAodGhpcy5fcGVlay50eXBlICE9PSBUb2tlblR5cGUuRVhQQU5TSU9OX0NBU0VfRVhQX1NUQVJUKSB7XG4gICAgICB0aGlzLmVycm9ycy5wdXNoKFxuICAgICAgICAgIFRyZWVFcnJvci5jcmVhdGUobnVsbCwgdGhpcy5fcGVlay5zb3VyY2VTcGFuLCBgSW52YWxpZCBJQ1UgbWVzc2FnZS4gTWlzc2luZyAneycuYCkpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gcmVhZCB1bnRpbCB9XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLl9hZHZhbmNlPEV4cGFuc2lvbkNhc2VFeHByZXNzaW9uU3RhcnRUb2tlbj4oKTtcblxuICAgIGNvbnN0IGV4cCA9IHRoaXMuX2NvbGxlY3RFeHBhbnNpb25FeHBUb2tlbnMoc3RhcnQpO1xuICAgIGlmICghZXhwKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGVuZCA9IHRoaXMuX2FkdmFuY2U8RXhwYW5zaW9uQ2FzZUV4cHJlc3Npb25FbmRUb2tlbj4oKTtcbiAgICBleHAucHVzaCh7dHlwZTogVG9rZW5UeXBlLkVPRiwgcGFydHM6IFtdLCBzb3VyY2VTcGFuOiBlbmQuc291cmNlU3Bhbn0pO1xuXG4gICAgLy8gcGFyc2UgZXZlcnl0aGluZyBpbiBiZXR3ZWVuIHsgYW5kIH1cbiAgICBjb25zdCBleHBhbnNpb25DYXNlUGFyc2VyID0gbmV3IF9UcmVlQnVpbGRlcihleHAsIHRoaXMuZ2V0VGFnRGVmaW5pdGlvbik7XG4gICAgZXhwYW5zaW9uQ2FzZVBhcnNlci5idWlsZCgpO1xuICAgIGlmIChleHBhbnNpb25DYXNlUGFyc2VyLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmVycm9ycyA9IHRoaXMuZXJyb3JzLmNvbmNhdChleHBhbnNpb25DYXNlUGFyc2VyLmVycm9ycyk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2VTcGFuID1cbiAgICAgICAgbmV3IFBhcnNlU291cmNlU3Bhbih2YWx1ZS5zb3VyY2VTcGFuLnN0YXJ0LCBlbmQuc291cmNlU3Bhbi5lbmQsIHZhbHVlLnNvdXJjZVNwYW4uZnVsbFN0YXJ0KTtcbiAgICBjb25zdCBleHBTb3VyY2VTcGFuID1cbiAgICAgICAgbmV3IFBhcnNlU291cmNlU3BhbihzdGFydC5zb3VyY2VTcGFuLnN0YXJ0LCBlbmQuc291cmNlU3Bhbi5lbmQsIHN0YXJ0LnNvdXJjZVNwYW4uZnVsbFN0YXJ0KTtcbiAgICByZXR1cm4gbmV3IGh0bWwuRXhwYW5zaW9uQ2FzZShcbiAgICAgICAgdmFsdWUucGFydHNbMF0sIGV4cGFuc2lvbkNhc2VQYXJzZXIucm9vdE5vZGVzLCBzb3VyY2VTcGFuLCB2YWx1ZS5zb3VyY2VTcGFuLCBleHBTb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbGxlY3RFeHBhbnNpb25FeHBUb2tlbnMoc3RhcnQ6IFRva2VuKTogVG9rZW5bXXxudWxsIHtcbiAgICBjb25zdCBleHA6IFRva2VuW10gPSBbXTtcbiAgICBjb25zdCBleHBhbnNpb25Gb3JtU3RhY2sgPSBbVG9rZW5UeXBlLkVYUEFOU0lPTl9DQVNFX0VYUF9TVEFSVF07XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKHRoaXMuX3BlZWsudHlwZSA9PT0gVG9rZW5UeXBlLkVYUEFOU0lPTl9GT1JNX1NUQVJUIHx8XG4gICAgICAgICAgdGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuRVhQQU5TSU9OX0NBU0VfRVhQX1NUQVJUKSB7XG4gICAgICAgIGV4cGFuc2lvbkZvcm1TdGFjay5wdXNoKHRoaXMuX3BlZWsudHlwZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5FWFBBTlNJT05fQ0FTRV9FWFBfRU5EKSB7XG4gICAgICAgIGlmIChsYXN0T25TdGFjayhleHBhbnNpb25Gb3JtU3RhY2ssIFRva2VuVHlwZS5FWFBBTlNJT05fQ0FTRV9FWFBfU1RBUlQpKSB7XG4gICAgICAgICAgZXhwYW5zaW9uRm9ybVN0YWNrLnBvcCgpO1xuICAgICAgICAgIGlmIChleHBhbnNpb25Gb3JtU3RhY2subGVuZ3RoID09PSAwKSByZXR1cm4gZXhwO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lcnJvcnMucHVzaChcbiAgICAgICAgICAgICAgVHJlZUVycm9yLmNyZWF0ZShudWxsLCBzdGFydC5zb3VyY2VTcGFuLCBgSW52YWxpZCBJQ1UgbWVzc2FnZS4gTWlzc2luZyAnfScuYCkpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5FWFBBTlNJT05fRk9STV9FTkQpIHtcbiAgICAgICAgaWYgKGxhc3RPblN0YWNrKGV4cGFuc2lvbkZvcm1TdGFjaywgVG9rZW5UeXBlLkVYUEFOU0lPTl9GT1JNX1NUQVJUKSkge1xuICAgICAgICAgIGV4cGFuc2lvbkZvcm1TdGFjay5wb3AoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmVycm9ycy5wdXNoKFxuICAgICAgICAgICAgICBUcmVlRXJyb3IuY3JlYXRlKG51bGwsIHN0YXJ0LnNvdXJjZVNwYW4sIGBJbnZhbGlkIElDVSBtZXNzYWdlLiBNaXNzaW5nICd9Jy5gKSk7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3BlZWsudHlwZSA9PT0gVG9rZW5UeXBlLkVPRikge1xuICAgICAgICB0aGlzLmVycm9ycy5wdXNoKFxuICAgICAgICAgICAgVHJlZUVycm9yLmNyZWF0ZShudWxsLCBzdGFydC5zb3VyY2VTcGFuLCBgSW52YWxpZCBJQ1UgbWVzc2FnZS4gTWlzc2luZyAnfScuYCkpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgZXhwLnB1c2godGhpcy5fYWR2YW5jZSgpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jb25zdW1lVGV4dCh0b2tlbjogSW50ZXJwb2xhdGVkVGV4dFRva2VuKSB7XG4gICAgY29uc3QgdG9rZW5zID0gW3Rva2VuXTtcbiAgICBjb25zdCBzdGFydFNwYW4gPSB0b2tlbi5zb3VyY2VTcGFuO1xuICAgIGxldCB0ZXh0ID0gdG9rZW4ucGFydHNbMF07XG4gICAgaWYgKHRleHQubGVuZ3RoID4gMCAmJiB0ZXh0WzBdID09PSAnXFxuJykge1xuICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5fZ2V0UGFyZW50RWxlbWVudCgpO1xuICAgICAgaWYgKHBhcmVudCAhPSBudWxsICYmIHBhcmVudC5jaGlsZHJlbi5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgICB0aGlzLmdldFRhZ0RlZmluaXRpb24ocGFyZW50Lm5hbWUpLmlnbm9yZUZpcnN0TGYpIHtcbiAgICAgICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDEpO1xuICAgICAgICB0b2tlbnNbMF0gPSB7dHlwZTogdG9rZW4udHlwZSwgc291cmNlU3BhbjogdG9rZW4uc291cmNlU3BhbiwgcGFydHM6IFt0ZXh0XX0gYXMgdHlwZW9mIHRva2VuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHdoaWxlICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5JTlRFUlBPTEFUSU9OIHx8IHRoaXMuX3BlZWsudHlwZSA9PT0gVG9rZW5UeXBlLlRFWFQgfHxcbiAgICAgICAgICAgdGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuRU5DT0RFRF9FTlRJVFkpIHtcbiAgICAgIHRva2VuID0gdGhpcy5fYWR2YW5jZSgpO1xuICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuVHlwZS5JTlRFUlBPTEFUSU9OKSB7XG4gICAgICAgIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdlIGRlY29kZSBIVE1MIGVudGl0aWVzIHRoYXQgYXBwZWFyIGluIGludGVycG9sYXRpb25cbiAgICAgICAgLy8gZXhwcmVzc2lvbnMuIFRoaXMgaXMgYXJndWFibHkgYSBidWcsIGJ1dCBpdCBjb3VsZCBiZSBhIGNvbnNpZGVyYWJsZSBicmVha2luZyBjaGFuZ2UgdG9cbiAgICAgICAgLy8gZml4IGl0LiBJdCBzaG91bGQgYmUgYWRkcmVzc2VkIGluIGEgbGFyZ2VyIHByb2plY3QgdG8gcmVmYWN0b3IgdGhlIGVudGlyZSBwYXJzZXIvbGV4ZXJcbiAgICAgICAgLy8gY2hhaW4gYWZ0ZXIgVmlldyBFbmdpbmUgaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgICAgdGV4dCArPSB0b2tlbi5wYXJ0cy5qb2luKCcnKS5yZXBsYWNlKC8mKFteO10rKTsvZywgZGVjb2RlRW50aXR5KTtcbiAgICAgIH0gZWxzZSBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLkVOQ09ERURfRU5USVRZKSB7XG4gICAgICAgIHRleHQgKz0gdG9rZW4ucGFydHNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0ICs9IHRva2VuLnBhcnRzLmpvaW4oJycpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGVuZFNwYW4gPSB0b2tlbi5zb3VyY2VTcGFuO1xuICAgICAgdGhpcy5fYWRkVG9QYXJlbnQobmV3IGh0bWwuVGV4dChcbiAgICAgICAgICB0ZXh0LFxuICAgICAgICAgIG5ldyBQYXJzZVNvdXJjZVNwYW4oc3RhcnRTcGFuLnN0YXJ0LCBlbmRTcGFuLmVuZCwgc3RhcnRTcGFuLmZ1bGxTdGFydCwgc3RhcnRTcGFuLmRldGFpbHMpLFxuICAgICAgICAgIHRva2VucykpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2Nsb3NlVm9pZEVsZW1lbnQoKTogdm9pZCB7XG4gICAgY29uc3QgZWwgPSB0aGlzLl9nZXRQYXJlbnRFbGVtZW50KCk7XG4gICAgaWYgKGVsICYmIHRoaXMuZ2V0VGFnRGVmaW5pdGlvbihlbC5uYW1lKS5pc1ZvaWQpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnRTdGFjay5wb3AoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jb25zdW1lU3RhcnRUYWcoc3RhcnRUYWdUb2tlbjogVGFnT3BlblN0YXJ0VG9rZW58SW5jb21wbGV0ZVRhZ09wZW5Ub2tlbikge1xuICAgIGNvbnN0IFtwcmVmaXgsIG5hbWVdID0gc3RhcnRUYWdUb2tlbi5wYXJ0cztcbiAgICBjb25zdCBhdHRyczogaHRtbC5BdHRyaWJ1dGVbXSA9IFtdO1xuICAgIHdoaWxlICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5BVFRSX05BTUUpIHtcbiAgICAgIGF0dHJzLnB1c2godGhpcy5fY29uc3VtZUF0dHIodGhpcy5fYWR2YW5jZTxBdHRyaWJ1dGVOYW1lVG9rZW4+KCkpKTtcbiAgICB9XG4gICAgY29uc3QgZnVsbE5hbWUgPSB0aGlzLl9nZXRFbGVtZW50RnVsbE5hbWUocHJlZml4LCBuYW1lLCB0aGlzLl9nZXRQYXJlbnRFbGVtZW50KCkpO1xuICAgIGxldCBzZWxmQ2xvc2luZyA9IGZhbHNlO1xuICAgIC8vIE5vdGU6IFRoZXJlIGNvdWxkIGhhdmUgYmVlbiBhIHRva2VuaXplciBlcnJvclxuICAgIC8vIHNvIHRoYXQgd2UgZG9uJ3QgZ2V0IGEgdG9rZW4gZm9yIHRoZSBlbmQgdGFnLi4uXG4gICAgaWYgKHRoaXMuX3BlZWsudHlwZSA9PT0gVG9rZW5UeXBlLlRBR19PUEVOX0VORF9WT0lEKSB7XG4gICAgICB0aGlzLl9hZHZhbmNlKCk7XG4gICAgICBzZWxmQ2xvc2luZyA9IHRydWU7XG4gICAgICBjb25zdCB0YWdEZWYgPSB0aGlzLmdldFRhZ0RlZmluaXRpb24oZnVsbE5hbWUpO1xuICAgICAgaWYgKCEodGFnRGVmLmNhblNlbGZDbG9zZSB8fCBnZXROc1ByZWZpeChmdWxsTmFtZSkgIT09IG51bGwgfHwgdGFnRGVmLmlzVm9pZCkpIHtcbiAgICAgICAgdGhpcy5lcnJvcnMucHVzaChUcmVlRXJyb3IuY3JlYXRlKFxuICAgICAgICAgICAgZnVsbE5hbWUsIHN0YXJ0VGFnVG9rZW4uc291cmNlU3BhbixcbiAgICAgICAgICAgIGBPbmx5IHZvaWQgYW5kIGZvcmVpZ24gZWxlbWVudHMgY2FuIGJlIHNlbGYgY2xvc2VkIFwiJHtzdGFydFRhZ1Rva2VuLnBhcnRzWzFdfVwiYCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuVEFHX09QRU5fRU5EKSB7XG4gICAgICB0aGlzLl9hZHZhbmNlKCk7XG4gICAgICBzZWxmQ2xvc2luZyA9IGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBlbmQgPSB0aGlzLl9wZWVrLnNvdXJjZVNwYW4uZnVsbFN0YXJ0O1xuICAgIGNvbnN0IHNwYW4gPSBuZXcgUGFyc2VTb3VyY2VTcGFuKFxuICAgICAgICBzdGFydFRhZ1Rva2VuLnNvdXJjZVNwYW4uc3RhcnQsIGVuZCwgc3RhcnRUYWdUb2tlbi5zb3VyY2VTcGFuLmZ1bGxTdGFydCk7XG4gICAgLy8gQ3JlYXRlIGEgc2VwYXJhdGUgYHN0YXJ0U3BhbmAgYmVjYXVzZSBgc3BhbmAgd2lsbCBiZSBtb2RpZmllZCB3aGVuIHRoZXJlIGlzIGFuIGBlbmRgIHNwYW4uXG4gICAgY29uc3Qgc3RhcnRTcGFuID0gbmV3IFBhcnNlU291cmNlU3BhbihcbiAgICAgICAgc3RhcnRUYWdUb2tlbi5zb3VyY2VTcGFuLnN0YXJ0LCBlbmQsIHN0YXJ0VGFnVG9rZW4uc291cmNlU3Bhbi5mdWxsU3RhcnQpO1xuICAgIGNvbnN0IGVsID0gbmV3IGh0bWwuRWxlbWVudChmdWxsTmFtZSwgYXR0cnMsIFtdLCBzcGFuLCBzdGFydFNwYW4sIHVuZGVmaW5lZCk7XG4gICAgdGhpcy5fcHVzaEVsZW1lbnQoZWwpO1xuICAgIGlmIChzZWxmQ2xvc2luZykge1xuICAgICAgLy8gRWxlbWVudHMgdGhhdCBhcmUgc2VsZi1jbG9zZWQgaGF2ZSB0aGVpciBgZW5kU291cmNlU3BhbmAgc2V0IHRvIHRoZSBmdWxsIHNwYW4sIGFzIHRoZVxuICAgICAgLy8gZWxlbWVudCBzdGFydCB0YWcgYWxzbyByZXByZXNlbnRzIHRoZSBlbmQgdGFnLlxuICAgICAgdGhpcy5fcG9wRWxlbWVudChmdWxsTmFtZSwgc3Bhbik7XG4gICAgfSBlbHNlIGlmIChzdGFydFRhZ1Rva2VuLnR5cGUgPT09IFRva2VuVHlwZS5JTkNPTVBMRVRFX1RBR19PUEVOKSB7XG4gICAgICAvLyBXZSBhbHJlYWR5IGtub3cgdGhlIG9wZW5pbmcgdGFnIGlzIG5vdCBjb21wbGV0ZSwgc28gaXQgaXMgdW5saWtlbHkgaXQgaGFzIGEgY29ycmVzcG9uZGluZ1xuICAgICAgLy8gY2xvc2UgdGFnLiBMZXQncyBvcHRpbWlzdGljYWxseSBwYXJzZSBpdCBhcyBhIGZ1bGwgZWxlbWVudCBhbmQgZW1pdCBhbiBlcnJvci5cbiAgICAgIHRoaXMuX3BvcEVsZW1lbnQoZnVsbE5hbWUsIG51bGwpO1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChcbiAgICAgICAgICBUcmVlRXJyb3IuY3JlYXRlKGZ1bGxOYW1lLCBzcGFuLCBgT3BlbmluZyB0YWcgXCIke2Z1bGxOYW1lfVwiIG5vdCB0ZXJtaW5hdGVkLmApKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9wdXNoRWxlbWVudChlbDogaHRtbC5FbGVtZW50KSB7XG4gICAgY29uc3QgcGFyZW50RWwgPSB0aGlzLl9nZXRQYXJlbnRFbGVtZW50KCk7XG5cbiAgICBpZiAocGFyZW50RWwgJiYgdGhpcy5nZXRUYWdEZWZpbml0aW9uKHBhcmVudEVsLm5hbWUpLmlzQ2xvc2VkQnlDaGlsZChlbC5uYW1lKSkge1xuICAgICAgdGhpcy5fZWxlbWVudFN0YWNrLnBvcCgpO1xuICAgIH1cblxuICAgIHRoaXMuX2FkZFRvUGFyZW50KGVsKTtcbiAgICB0aGlzLl9lbGVtZW50U3RhY2sucHVzaChlbCk7XG4gIH1cblxuICBwcml2YXRlIF9jb25zdW1lRW5kVGFnKGVuZFRhZ1Rva2VuOiBUYWdDbG9zZVRva2VuKSB7XG4gICAgY29uc3QgZnVsbE5hbWUgPSB0aGlzLl9nZXRFbGVtZW50RnVsbE5hbWUoXG4gICAgICAgIGVuZFRhZ1Rva2VuLnBhcnRzWzBdLCBlbmRUYWdUb2tlbi5wYXJ0c1sxXSwgdGhpcy5fZ2V0UGFyZW50RWxlbWVudCgpKTtcblxuICAgIGlmICh0aGlzLmdldFRhZ0RlZmluaXRpb24oZnVsbE5hbWUpLmlzVm9pZCkge1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChUcmVlRXJyb3IuY3JlYXRlKFxuICAgICAgICAgIGZ1bGxOYW1lLCBlbmRUYWdUb2tlbi5zb3VyY2VTcGFuLFxuICAgICAgICAgIGBWb2lkIGVsZW1lbnRzIGRvIG5vdCBoYXZlIGVuZCB0YWdzIFwiJHtlbmRUYWdUb2tlbi5wYXJ0c1sxXX1cImApKTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9wb3BFbGVtZW50KGZ1bGxOYW1lLCBlbmRUYWdUb2tlbi5zb3VyY2VTcGFuKSkge1xuICAgICAgY29uc3QgZXJyTXNnID0gYFVuZXhwZWN0ZWQgY2xvc2luZyB0YWcgXCIke1xuICAgICAgICAgIGZ1bGxOYW1lfVwiLiBJdCBtYXkgaGFwcGVuIHdoZW4gdGhlIHRhZyBoYXMgYWxyZWFkeSBiZWVuIGNsb3NlZCBieSBhbm90aGVyIHRhZy4gRm9yIG1vcmUgaW5mbyBzZWUgaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2Nsb3NpbmctZWxlbWVudHMtdGhhdC1oYXZlLWltcGxpZWQtZW5kLXRhZ3NgO1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChUcmVlRXJyb3IuY3JlYXRlKGZ1bGxOYW1lLCBlbmRUYWdUb2tlbi5zb3VyY2VTcGFuLCBlcnJNc2cpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBuZWFyZXN0IGVsZW1lbnQgd2l0aCB0aGUgdGFnIG5hbWUgYGZ1bGxOYW1lYCBpbiB0aGUgcGFyc2UgdHJlZS5cbiAgICogYGVuZFNvdXJjZVNwYW5gIGlzIHRoZSBzcGFuIG9mIHRoZSBjbG9zaW5nIHRhZywgb3IgbnVsbCBpZiB0aGUgZWxlbWVudCBkb2VzXG4gICAqIG5vdCBoYXZlIGEgY2xvc2luZyB0YWcgKGZvciBleGFtcGxlLCB0aGlzIGhhcHBlbnMgd2hlbiBhbiBpbmNvbXBsZXRlXG4gICAqIG9wZW5pbmcgdGFnIGlzIHJlY292ZXJlZCkuXG4gICAqL1xuICBwcml2YXRlIF9wb3BFbGVtZW50KGZ1bGxOYW1lOiBzdHJpbmcsIGVuZFNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbnxudWxsKTogYm9vbGVhbiB7XG4gICAgbGV0IHVuZXhwZWN0ZWRDbG9zZVRhZ0RldGVjdGVkID0gZmFsc2U7XG4gICAgZm9yIChsZXQgc3RhY2tJbmRleCA9IHRoaXMuX2VsZW1lbnRTdGFjay5sZW5ndGggLSAxOyBzdGFja0luZGV4ID49IDA7IHN0YWNrSW5kZXgtLSkge1xuICAgICAgY29uc3QgZWwgPSB0aGlzLl9lbGVtZW50U3RhY2tbc3RhY2tJbmRleF07XG4gICAgICBpZiAoZWwubmFtZSA9PT0gZnVsbE5hbWUpIHtcbiAgICAgICAgLy8gUmVjb3JkIHRoZSBwYXJzZSBzcGFuIHdpdGggdGhlIGVsZW1lbnQgdGhhdCBpcyBiZWluZyBjbG9zZWQuIEFueSBlbGVtZW50cyB0aGF0IGFyZVxuICAgICAgICAvLyByZW1vdmVkIGZyb20gdGhlIGVsZW1lbnQgc3RhY2sgYXQgdGhpcyBwb2ludCBhcmUgY2xvc2VkIGltcGxpY2l0bHksIHNvIHRoZXkgd29uJ3QgZ2V0XG4gICAgICAgIC8vIGFuIGVuZCBzb3VyY2Ugc3BhbiAoYXMgdGhlcmUgaXMgbm8gZXhwbGljaXQgY2xvc2luZyBlbGVtZW50KS5cbiAgICAgICAgZWwuZW5kU291cmNlU3BhbiA9IGVuZFNvdXJjZVNwYW47XG4gICAgICAgIGVsLnNvdXJjZVNwYW4uZW5kID0gZW5kU291cmNlU3BhbiAhPT0gbnVsbCA/IGVuZFNvdXJjZVNwYW4uZW5kIDogZWwuc291cmNlU3Bhbi5lbmQ7XG5cbiAgICAgICAgdGhpcy5fZWxlbWVudFN0YWNrLnNwbGljZShzdGFja0luZGV4LCB0aGlzLl9lbGVtZW50U3RhY2subGVuZ3RoIC0gc3RhY2tJbmRleCk7XG4gICAgICAgIHJldHVybiAhdW5leHBlY3RlZENsb3NlVGFnRGV0ZWN0ZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5nZXRUYWdEZWZpbml0aW9uKGVsLm5hbWUpLmNsb3NlZEJ5UGFyZW50KSB7XG4gICAgICAgIC8vIE5vdGUgdGhhdCB3ZSBlbmNvdW50ZXJlZCBhbiB1bmV4cGVjdGVkIGNsb3NlIHRhZyBidXQgY29udGludWUgcHJvY2Vzc2luZyB0aGUgZWxlbWVudFxuICAgICAgICAvLyBzdGFjayBzbyB3ZSBjYW4gYXNzaWduIGFuIGBlbmRTb3VyY2VTcGFuYCBpZiB0aGVyZSBpcyBhIGNvcnJlc3BvbmRpbmcgc3RhcnQgdGFnIGZvciB0aGlzXG4gICAgICAgIC8vIGVuZCB0YWcgaW4gdGhlIHN0YWNrLlxuICAgICAgICB1bmV4cGVjdGVkQ2xvc2VUYWdEZXRlY3RlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVBdHRyKGF0dHJOYW1lOiBBdHRyaWJ1dGVOYW1lVG9rZW4pOiBodG1sLkF0dHJpYnV0ZSB7XG4gICAgY29uc3QgZnVsbE5hbWUgPSBtZXJnZU5zQW5kTmFtZShhdHRyTmFtZS5wYXJ0c1swXSwgYXR0ck5hbWUucGFydHNbMV0pO1xuICAgIGxldCBhdHRyRW5kID0gYXR0ck5hbWUuc291cmNlU3Bhbi5lbmQ7XG5cbiAgICAvLyBDb25zdW1lIGFueSBxdW90ZVxuICAgIGlmICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5BVFRSX1FVT1RFKSB7XG4gICAgICB0aGlzLl9hZHZhbmNlKCk7XG4gICAgfVxuXG4gICAgLy8gQ29uc3VtZSB0aGUgYXR0cmlidXRlIHZhbHVlXG4gICAgbGV0IHZhbHVlID0gJyc7XG4gICAgY29uc3QgdmFsdWVUb2tlbnM6IEludGVycG9sYXRlZEF0dHJpYnV0ZVRva2VuW10gPSBbXTtcbiAgICBsZXQgdmFsdWVTdGFydFNwYW46IFBhcnNlU291cmNlU3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IHZhbHVlRW5kOiBQYXJzZUxvY2F0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAvLyBOT1RFOiBXZSBuZWVkIHRvIHVzZSBhIG5ldyB2YXJpYWJsZSBgbmV4dFRva2VuVHlwZWAgaGVyZSB0byBoaWRlIHRoZSBhY3R1YWwgdHlwZSBvZlxuICAgIC8vIGBfcGVlay50eXBlYCBmcm9tIFRTLiBPdGhlcndpc2UgVFMgd2lsbCBuYXJyb3cgdGhlIHR5cGUgb2YgYF9wZWVrLnR5cGVgIHByZXZlbnRpbmcgaXQgZnJvbVxuICAgIC8vIGJlaW5nIGFibGUgdG8gY29uc2lkZXIgYEFUVFJfVkFMVUVfSU5URVJQT0xBVElPTmAgYXMgYW4gb3B0aW9uLiBUaGlzIGlzIGJlY2F1c2UgVFMgaXMgbm90XG4gICAgLy8gYWJsZSB0byBzZWUgdGhhdCBgX2FkdmFuY2UoKWAgd2lsbCBhY3R1YWxseSBtdXRhdGUgYF9wZWVrYC5cbiAgICBjb25zdCBuZXh0VG9rZW5UeXBlID0gdGhpcy5fcGVlay50eXBlO1xuICAgIGlmIChuZXh0VG9rZW5UeXBlID09PSBUb2tlblR5cGUuQVRUUl9WQUxVRV9URVhUKSB7XG4gICAgICB2YWx1ZVN0YXJ0U3BhbiA9IHRoaXMuX3BlZWsuc291cmNlU3BhbjtcbiAgICAgIHZhbHVlRW5kID0gdGhpcy5fcGVlay5zb3VyY2VTcGFuLmVuZDtcbiAgICAgIHdoaWxlICh0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5BVFRSX1ZBTFVFX1RFWFQgfHxcbiAgICAgICAgICAgICB0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5BVFRSX1ZBTFVFX0lOVEVSUE9MQVRJT04gfHxcbiAgICAgICAgICAgICB0aGlzLl9wZWVrLnR5cGUgPT09IFRva2VuVHlwZS5FTkNPREVEX0VOVElUWSkge1xuICAgICAgICBjb25zdCB2YWx1ZVRva2VuID0gdGhpcy5fYWR2YW5jZTxJbnRlcnBvbGF0ZWRBdHRyaWJ1dGVUb2tlbj4oKTtcbiAgICAgICAgdmFsdWVUb2tlbnMucHVzaCh2YWx1ZVRva2VuKTtcbiAgICAgICAgaWYgKHZhbHVlVG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLkFUVFJfVkFMVUVfSU5URVJQT0xBVElPTikge1xuICAgICAgICAgIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdlIGRlY29kZSBIVE1MIGVudGl0aWVzIHRoYXQgYXBwZWFyIGluIGludGVycG9sYXRpb25cbiAgICAgICAgICAvLyBleHByZXNzaW9ucy4gVGhpcyBpcyBhcmd1YWJseSBhIGJ1ZywgYnV0IGl0IGNvdWxkIGJlIGEgY29uc2lkZXJhYmxlIGJyZWFraW5nIGNoYW5nZSB0b1xuICAgICAgICAgIC8vIGZpeCBpdC4gSXQgc2hvdWxkIGJlIGFkZHJlc3NlZCBpbiBhIGxhcmdlciBwcm9qZWN0IHRvIHJlZmFjdG9yIHRoZSBlbnRpcmUgcGFyc2VyL2xleGVyXG4gICAgICAgICAgLy8gY2hhaW4gYWZ0ZXIgVmlldyBFbmdpbmUgaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgICAgICB2YWx1ZSArPSB2YWx1ZVRva2VuLnBhcnRzLmpvaW4oJycpLnJlcGxhY2UoLyYoW147XSspOy9nLCBkZWNvZGVFbnRpdHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlVG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLkVOQ09ERURfRU5USVRZKSB7XG4gICAgICAgICAgdmFsdWUgKz0gdmFsdWVUb2tlbi5wYXJ0c1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSArPSB2YWx1ZVRva2VuLnBhcnRzLmpvaW4oJycpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlRW5kID0gYXR0ckVuZCA9IHZhbHVlVG9rZW4uc291cmNlU3Bhbi5lbmQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29uc3VtZSBhbnkgcXVvdGVcbiAgICBpZiAodGhpcy5fcGVlay50eXBlID09PSBUb2tlblR5cGUuQVRUUl9RVU9URSkge1xuICAgICAgY29uc3QgcXVvdGVUb2tlbiA9IHRoaXMuX2FkdmFuY2U8QXR0cmlidXRlUXVvdGVUb2tlbj4oKTtcbiAgICAgIGF0dHJFbmQgPSBxdW90ZVRva2VuLnNvdXJjZVNwYW4uZW5kO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlU3BhbiA9IHZhbHVlU3RhcnRTcGFuICYmIHZhbHVlRW5kICYmXG4gICAgICAgIG5ldyBQYXJzZVNvdXJjZVNwYW4odmFsdWVTdGFydFNwYW4uc3RhcnQsIHZhbHVlRW5kLCB2YWx1ZVN0YXJ0U3Bhbi5mdWxsU3RhcnQpO1xuICAgIHJldHVybiBuZXcgaHRtbC5BdHRyaWJ1dGUoXG4gICAgICAgIGZ1bGxOYW1lLCB2YWx1ZSxcbiAgICAgICAgbmV3IFBhcnNlU291cmNlU3BhbihhdHRyTmFtZS5zb3VyY2VTcGFuLnN0YXJ0LCBhdHRyRW5kLCBhdHRyTmFtZS5zb3VyY2VTcGFuLmZ1bGxTdGFydCksXG4gICAgICAgIGF0dHJOYW1lLnNvdXJjZVNwYW4sIHZhbHVlU3BhbiwgdmFsdWVUb2tlbnMubGVuZ3RoID4gMCA/IHZhbHVlVG9rZW5zIDogdW5kZWZpbmVkLFxuICAgICAgICB1bmRlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0UGFyZW50RWxlbWVudCgpOiBodG1sLkVsZW1lbnR8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRTdGFjay5sZW5ndGggPiAwID8gdGhpcy5fZWxlbWVudFN0YWNrW3RoaXMuX2VsZW1lbnRTdGFjay5sZW5ndGggLSAxXSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIF9hZGRUb1BhcmVudChub2RlOiBodG1sLk5vZGUpIHtcbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl9nZXRQYXJlbnRFbGVtZW50KCk7XG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yb290Tm9kZXMucHVzaChub2RlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRFbGVtZW50RnVsbE5hbWUocHJlZml4OiBzdHJpbmcsIGxvY2FsTmFtZTogc3RyaW5nLCBwYXJlbnRFbGVtZW50OiBodG1sLkVsZW1lbnR8bnVsbCk6XG4gICAgICBzdHJpbmcge1xuICAgIGlmIChwcmVmaXggPT09ICcnKSB7XG4gICAgICBwcmVmaXggPSB0aGlzLmdldFRhZ0RlZmluaXRpb24obG9jYWxOYW1lKS5pbXBsaWNpdE5hbWVzcGFjZVByZWZpeCB8fCAnJztcbiAgICAgIGlmIChwcmVmaXggPT09ICcnICYmIHBhcmVudEVsZW1lbnQgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBwYXJlbnRUYWdOYW1lID0gc3BsaXROc05hbWUocGFyZW50RWxlbWVudC5uYW1lKVsxXTtcbiAgICAgICAgY29uc3QgcGFyZW50VGFnRGVmaW5pdGlvbiA9IHRoaXMuZ2V0VGFnRGVmaW5pdGlvbihwYXJlbnRUYWdOYW1lKTtcbiAgICAgICAgaWYgKCFwYXJlbnRUYWdEZWZpbml0aW9uLnByZXZlbnROYW1lc3BhY2VJbmhlcml0YW5jZSkge1xuICAgICAgICAgIHByZWZpeCA9IGdldE5zUHJlZml4KHBhcmVudEVsZW1lbnQubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWVyZ2VOc0FuZE5hbWUocHJlZml4LCBsb2NhbE5hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGxhc3RPblN0YWNrKHN0YWNrOiBhbnlbXSwgZWxlbWVudDogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiBzdGFjay5sZW5ndGggPiAwICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBlbGVtZW50O1xufVxuXG4vKipcbiAqIERlY29kZSB0aGUgYGVudGl0eWAgc3RyaW5nLCB3aGljaCB3ZSBiZWxpZXZlIGlzIHRoZSBjb250ZW50cyBvZiBhbiBIVE1MIGVudGl0eS5cbiAqXG4gKiBJZiB0aGUgc3RyaW5nIGlzIG5vdCBhY3R1YWxseSBhIHZhbGlkL2tub3duIGVudGl0eSB0aGVuIGp1c3QgcmV0dXJuIHRoZSBvcmlnaW5hbCBgbWF0Y2hgIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZGVjb2RlRW50aXR5KG1hdGNoOiBzdHJpbmcsIGVudGl0eTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKE5BTUVEX0VOVElUSUVTW2VudGl0eV0gIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBOQU1FRF9FTlRJVElFU1tlbnRpdHldIHx8IG1hdGNoO1xuICB9XG4gIGlmICgvXiN4W2EtZjAtOV0rJC9pLnRlc3QoZW50aXR5KSkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludChwYXJzZUludChlbnRpdHkuc2xpY2UoMiksIDE2KSk7XG4gIH1cbiAgaWYgKC9eI1xcZCskLy50ZXN0KGVudGl0eSkpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQocGFyc2VJbnQoZW50aXR5LnNsaWNlKDEpLCAxMCkpO1xuICB9XG4gIHJldHVybiBtYXRjaDtcbn1cbiJdfQ==