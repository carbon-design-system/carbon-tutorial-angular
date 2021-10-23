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
        define("@angular/compiler/src/ml_parser/lexer", ["require", "exports", "tslib", "@angular/compiler/src/chars", "@angular/compiler/src/parse_util", "@angular/compiler/src/ml_parser/entities", "@angular/compiler/src/ml_parser/interpolation_config", "@angular/compiler/src/ml_parser/tags"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CursorError = exports.tokenize = exports.TokenizeResult = exports.TokenError = void 0;
    var tslib_1 = require("tslib");
    var chars = require("@angular/compiler/src/chars");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var entities_1 = require("@angular/compiler/src/ml_parser/entities");
    var interpolation_config_1 = require("@angular/compiler/src/ml_parser/interpolation_config");
    var tags_1 = require("@angular/compiler/src/ml_parser/tags");
    var TokenError = /** @class */ (function (_super) {
        tslib_1.__extends(TokenError, _super);
        function TokenError(errorMsg, tokenType, span) {
            var _this = _super.call(this, span, errorMsg) || this;
            _this.tokenType = tokenType;
            return _this;
        }
        return TokenError;
    }(parse_util_1.ParseError));
    exports.TokenError = TokenError;
    var TokenizeResult = /** @class */ (function () {
        function TokenizeResult(tokens, errors, nonNormalizedIcuExpressions) {
            this.tokens = tokens;
            this.errors = errors;
            this.nonNormalizedIcuExpressions = nonNormalizedIcuExpressions;
        }
        return TokenizeResult;
    }());
    exports.TokenizeResult = TokenizeResult;
    function tokenize(source, url, getTagDefinition, options) {
        if (options === void 0) { options = {}; }
        var tokenizer = new _Tokenizer(new parse_util_1.ParseSourceFile(source, url), getTagDefinition, options);
        tokenizer.tokenize();
        return new TokenizeResult(mergeTextTokens(tokenizer.tokens), tokenizer.errors, tokenizer.nonNormalizedIcuExpressions);
    }
    exports.tokenize = tokenize;
    var _CR_OR_CRLF_REGEXP = /\r\n?/g;
    function _unexpectedCharacterErrorMsg(charCode) {
        var char = charCode === chars.$EOF ? 'EOF' : String.fromCharCode(charCode);
        return "Unexpected character \"" + char + "\"";
    }
    function _unknownEntityErrorMsg(entitySrc) {
        return "Unknown entity \"" + entitySrc + "\" - use the \"&#<decimal>;\" or  \"&#x<hex>;\" syntax";
    }
    function _unparsableEntityErrorMsg(type, entityStr) {
        return "Unable to parse entity \"" + entityStr + "\" - " + type + " character reference entities must end with \";\"";
    }
    var CharacterReferenceType;
    (function (CharacterReferenceType) {
        CharacterReferenceType["HEX"] = "hexadecimal";
        CharacterReferenceType["DEC"] = "decimal";
    })(CharacterReferenceType || (CharacterReferenceType = {}));
    var _ControlFlowError = /** @class */ (function () {
        function _ControlFlowError(error) {
            this.error = error;
        }
        return _ControlFlowError;
    }());
    // See https://www.w3.org/TR/html51/syntax.html#writing-html-documents
    var _Tokenizer = /** @class */ (function () {
        /**
         * @param _file The html source file being tokenized.
         * @param _getTagDefinition A function that will retrieve a tag definition for a given tag name.
         * @param options Configuration of the tokenization.
         */
        function _Tokenizer(_file, _getTagDefinition, options) {
            this._getTagDefinition = _getTagDefinition;
            this._currentTokenStart = null;
            this._currentTokenType = null;
            this._expansionCaseStack = [];
            this._inInterpolation = false;
            this.tokens = [];
            this.errors = [];
            this.nonNormalizedIcuExpressions = [];
            this._tokenizeIcu = options.tokenizeExpansionForms || false;
            this._interpolationConfig = options.interpolationConfig || interpolation_config_1.DEFAULT_INTERPOLATION_CONFIG;
            this._leadingTriviaCodePoints =
                options.leadingTriviaChars && options.leadingTriviaChars.map(function (c) { return c.codePointAt(0) || 0; });
            var range = options.range || { endPos: _file.content.length, startPos: 0, startLine: 0, startCol: 0 };
            this._cursor = options.escapedString ? new EscapedCharacterCursor(_file, range) :
                new PlainCharacterCursor(_file, range);
            this._preserveLineEndings = options.preserveLineEndings || false;
            this._escapedString = options.escapedString || false;
            this._i18nNormalizeLineEndingsInICUs = options.i18nNormalizeLineEndingsInICUs || false;
            try {
                this._cursor.init();
            }
            catch (e) {
                this.handleError(e);
            }
        }
        _Tokenizer.prototype._processCarriageReturns = function (content) {
            if (this._preserveLineEndings) {
                return content;
            }
            // https://www.w3.org/TR/html51/syntax.html#preprocessing-the-input-stream
            // In order to keep the original position in the source, we can not
            // pre-process it.
            // Instead CRs are processed right before instantiating the tokens.
            return content.replace(_CR_OR_CRLF_REGEXP, '\n');
        };
        _Tokenizer.prototype.tokenize = function () {
            var _this = this;
            while (this._cursor.peek() !== chars.$EOF) {
                var start = this._cursor.clone();
                try {
                    if (this._attemptCharCode(chars.$LT)) {
                        if (this._attemptCharCode(chars.$BANG)) {
                            if (this._attemptCharCode(chars.$LBRACKET)) {
                                this._consumeCdata(start);
                            }
                            else if (this._attemptCharCode(chars.$MINUS)) {
                                this._consumeComment(start);
                            }
                            else {
                                this._consumeDocType(start);
                            }
                        }
                        else if (this._attemptCharCode(chars.$SLASH)) {
                            this._consumeTagClose(start);
                        }
                        else {
                            this._consumeTagOpen(start);
                        }
                    }
                    else if (!(this._tokenizeIcu && this._tokenizeExpansionForm())) {
                        // In (possibly interpolated) text the end of the text is given by `isTextEnd()`, while
                        // the premature end of an interpolation is given by the start of a new HTML element.
                        this._consumeWithInterpolation(5 /* TEXT */, 8 /* INTERPOLATION */, function () { return _this._isTextEnd(); }, function () { return _this._isTagStart(); });
                    }
                }
                catch (e) {
                    this.handleError(e);
                }
            }
            this._beginToken(24 /* EOF */);
            this._endToken([]);
        };
        /**
         * @returns whether an ICU token has been created
         * @internal
         */
        _Tokenizer.prototype._tokenizeExpansionForm = function () {
            if (this.isExpansionFormStart()) {
                this._consumeExpansionFormStart();
                return true;
            }
            if (isExpansionCaseStart(this._cursor.peek()) && this._isInExpansionForm()) {
                this._consumeExpansionCaseStart();
                return true;
            }
            if (this._cursor.peek() === chars.$RBRACE) {
                if (this._isInExpansionCase()) {
                    this._consumeExpansionCaseEnd();
                    return true;
                }
                if (this._isInExpansionForm()) {
                    this._consumeExpansionFormEnd();
                    return true;
                }
            }
            return false;
        };
        _Tokenizer.prototype._beginToken = function (type, start) {
            if (start === void 0) { start = this._cursor.clone(); }
            this._currentTokenStart = start;
            this._currentTokenType = type;
        };
        _Tokenizer.prototype._endToken = function (parts, end) {
            if (this._currentTokenStart === null) {
                throw new TokenError('Programming error - attempted to end a token when there was no start to the token', this._currentTokenType, this._cursor.getSpan(end));
            }
            if (this._currentTokenType === null) {
                throw new TokenError('Programming error - attempted to end a token which has no token type', null, this._cursor.getSpan(this._currentTokenStart));
            }
            var token = {
                type: this._currentTokenType,
                parts: parts,
                sourceSpan: (end !== null && end !== void 0 ? end : this._cursor).getSpan(this._currentTokenStart, this._leadingTriviaCodePoints),
            };
            this.tokens.push(token);
            this._currentTokenStart = null;
            this._currentTokenType = null;
            return token;
        };
        _Tokenizer.prototype._createError = function (msg, span) {
            if (this._isInExpansionForm()) {
                msg += " (Do you have an unescaped \"{\" in your template? Use \"{{ '{' }}\") to escape it.)";
            }
            var error = new TokenError(msg, this._currentTokenType, span);
            this._currentTokenStart = null;
            this._currentTokenType = null;
            return new _ControlFlowError(error);
        };
        _Tokenizer.prototype.handleError = function (e) {
            if (e instanceof CursorError) {
                e = this._createError(e.msg, this._cursor.getSpan(e.cursor));
            }
            if (e instanceof _ControlFlowError) {
                this.errors.push(e.error);
            }
            else {
                throw e;
            }
        };
        _Tokenizer.prototype._attemptCharCode = function (charCode) {
            if (this._cursor.peek() === charCode) {
                this._cursor.advance();
                return true;
            }
            return false;
        };
        _Tokenizer.prototype._attemptCharCodeCaseInsensitive = function (charCode) {
            if (compareCharCodeCaseInsensitive(this._cursor.peek(), charCode)) {
                this._cursor.advance();
                return true;
            }
            return false;
        };
        _Tokenizer.prototype._requireCharCode = function (charCode) {
            var location = this._cursor.clone();
            if (!this._attemptCharCode(charCode)) {
                throw this._createError(_unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(location));
            }
        };
        _Tokenizer.prototype._attemptStr = function (chars) {
            var len = chars.length;
            if (this._cursor.charsLeft() < len) {
                return false;
            }
            var initialPosition = this._cursor.clone();
            for (var i = 0; i < len; i++) {
                if (!this._attemptCharCode(chars.charCodeAt(i))) {
                    // If attempting to parse the string fails, we want to reset the parser
                    // to where it was before the attempt
                    this._cursor = initialPosition;
                    return false;
                }
            }
            return true;
        };
        _Tokenizer.prototype._attemptStrCaseInsensitive = function (chars) {
            for (var i = 0; i < chars.length; i++) {
                if (!this._attemptCharCodeCaseInsensitive(chars.charCodeAt(i))) {
                    return false;
                }
            }
            return true;
        };
        _Tokenizer.prototype._requireStr = function (chars) {
            var location = this._cursor.clone();
            if (!this._attemptStr(chars)) {
                throw this._createError(_unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(location));
            }
        };
        _Tokenizer.prototype._attemptCharCodeUntilFn = function (predicate) {
            while (!predicate(this._cursor.peek())) {
                this._cursor.advance();
            }
        };
        _Tokenizer.prototype._requireCharCodeUntilFn = function (predicate, len) {
            var start = this._cursor.clone();
            this._attemptCharCodeUntilFn(predicate);
            if (this._cursor.diff(start) < len) {
                throw this._createError(_unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(start));
            }
        };
        _Tokenizer.prototype._attemptUntilChar = function (char) {
            while (this._cursor.peek() !== char) {
                this._cursor.advance();
            }
        };
        _Tokenizer.prototype._readChar = function () {
            // Don't rely upon reading directly from `_input` as the actual char value
            // may have been generated from an escape sequence.
            var char = String.fromCodePoint(this._cursor.peek());
            this._cursor.advance();
            return char;
        };
        _Tokenizer.prototype._consumeEntity = function (textTokenType) {
            this._beginToken(9 /* ENCODED_ENTITY */);
            var start = this._cursor.clone();
            this._cursor.advance();
            if (this._attemptCharCode(chars.$HASH)) {
                var isHex = this._attemptCharCode(chars.$x) || this._attemptCharCode(chars.$X);
                var codeStart = this._cursor.clone();
                this._attemptCharCodeUntilFn(isDigitEntityEnd);
                if (this._cursor.peek() != chars.$SEMICOLON) {
                    // Advance cursor to include the peeked character in the string provided to the error
                    // message.
                    this._cursor.advance();
                    var entityType = isHex ? CharacterReferenceType.HEX : CharacterReferenceType.DEC;
                    throw this._createError(_unparsableEntityErrorMsg(entityType, this._cursor.getChars(start)), this._cursor.getSpan());
                }
                var strNum = this._cursor.getChars(codeStart);
                this._cursor.advance();
                try {
                    var charCode = parseInt(strNum, isHex ? 16 : 10);
                    this._endToken([String.fromCharCode(charCode), this._cursor.getChars(start)]);
                }
                catch (_a) {
                    throw this._createError(_unknownEntityErrorMsg(this._cursor.getChars(start)), this._cursor.getSpan());
                }
            }
            else {
                var nameStart = this._cursor.clone();
                this._attemptCharCodeUntilFn(isNamedEntityEnd);
                if (this._cursor.peek() != chars.$SEMICOLON) {
                    // No semicolon was found so abort the encoded entity token that was in progress, and treat
                    // this as a text token
                    this._beginToken(textTokenType, start);
                    this._cursor = nameStart;
                    this._endToken(['&']);
                }
                else {
                    var name_1 = this._cursor.getChars(nameStart);
                    this._cursor.advance();
                    var char = entities_1.NAMED_ENTITIES[name_1];
                    if (!char) {
                        throw this._createError(_unknownEntityErrorMsg(name_1), this._cursor.getSpan(start));
                    }
                    this._endToken([char, "&" + name_1 + ";"]);
                }
            }
        };
        _Tokenizer.prototype._consumeRawText = function (consumeEntities, endMarkerPredicate) {
            this._beginToken(consumeEntities ? 6 /* ESCAPABLE_RAW_TEXT */ : 7 /* RAW_TEXT */);
            var parts = [];
            while (true) {
                var tagCloseStart = this._cursor.clone();
                var foundEndMarker = endMarkerPredicate();
                this._cursor = tagCloseStart;
                if (foundEndMarker) {
                    break;
                }
                if (consumeEntities && this._cursor.peek() === chars.$AMPERSAND) {
                    this._endToken([this._processCarriageReturns(parts.join(''))]);
                    parts.length = 0;
                    this._consumeEntity(6 /* ESCAPABLE_RAW_TEXT */);
                    this._beginToken(6 /* ESCAPABLE_RAW_TEXT */);
                }
                else {
                    parts.push(this._readChar());
                }
            }
            this._endToken([this._processCarriageReturns(parts.join(''))]);
        };
        _Tokenizer.prototype._consumeComment = function (start) {
            var _this = this;
            this._beginToken(10 /* COMMENT_START */, start);
            this._requireCharCode(chars.$MINUS);
            this._endToken([]);
            this._consumeRawText(false, function () { return _this._attemptStr('-->'); });
            this._beginToken(11 /* COMMENT_END */);
            this._requireStr('-->');
            this._endToken([]);
        };
        _Tokenizer.prototype._consumeCdata = function (start) {
            var _this = this;
            this._beginToken(12 /* CDATA_START */, start);
            this._requireStr('CDATA[');
            this._endToken([]);
            this._consumeRawText(false, function () { return _this._attemptStr(']]>'); });
            this._beginToken(13 /* CDATA_END */);
            this._requireStr(']]>');
            this._endToken([]);
        };
        _Tokenizer.prototype._consumeDocType = function (start) {
            this._beginToken(18 /* DOC_TYPE */, start);
            var contentStart = this._cursor.clone();
            this._attemptUntilChar(chars.$GT);
            var content = this._cursor.getChars(contentStart);
            this._cursor.advance();
            this._endToken([content]);
        };
        _Tokenizer.prototype._consumePrefixAndName = function () {
            var nameOrPrefixStart = this._cursor.clone();
            var prefix = '';
            while (this._cursor.peek() !== chars.$COLON && !isPrefixEnd(this._cursor.peek())) {
                this._cursor.advance();
            }
            var nameStart;
            if (this._cursor.peek() === chars.$COLON) {
                prefix = this._cursor.getChars(nameOrPrefixStart);
                this._cursor.advance();
                nameStart = this._cursor.clone();
            }
            else {
                nameStart = nameOrPrefixStart;
            }
            this._requireCharCodeUntilFn(isNameEnd, prefix === '' ? 0 : 1);
            var name = this._cursor.getChars(nameStart);
            return [prefix, name];
        };
        _Tokenizer.prototype._consumeTagOpen = function (start) {
            var tagName;
            var prefix;
            var openTagToken;
            try {
                if (!chars.isAsciiLetter(this._cursor.peek())) {
                    throw this._createError(_unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(start));
                }
                openTagToken = this._consumeTagOpenStart(start);
                prefix = openTagToken.parts[0];
                tagName = openTagToken.parts[1];
                this._attemptCharCodeUntilFn(isNotWhitespace);
                while (this._cursor.peek() !== chars.$SLASH && this._cursor.peek() !== chars.$GT &&
                    this._cursor.peek() !== chars.$LT && this._cursor.peek() !== chars.$EOF) {
                    this._consumeAttributeName();
                    this._attemptCharCodeUntilFn(isNotWhitespace);
                    if (this._attemptCharCode(chars.$EQ)) {
                        this._attemptCharCodeUntilFn(isNotWhitespace);
                        this._consumeAttributeValue();
                    }
                    this._attemptCharCodeUntilFn(isNotWhitespace);
                }
                this._consumeTagOpenEnd();
            }
            catch (e) {
                if (e instanceof _ControlFlowError) {
                    if (openTagToken) {
                        // We errored before we could close the opening tag, so it is incomplete.
                        openTagToken.type = 4 /* INCOMPLETE_TAG_OPEN */;
                    }
                    else {
                        // When the start tag is invalid, assume we want a "<" as text.
                        // Back to back text tokens are merged at the end.
                        this._beginToken(5 /* TEXT */, start);
                        this._endToken(['<']);
                    }
                    return;
                }
                throw e;
            }
            var contentTokenType = this._getTagDefinition(tagName).getContentType(prefix);
            if (contentTokenType === tags_1.TagContentType.RAW_TEXT) {
                this._consumeRawTextWithTagClose(prefix, tagName, false);
            }
            else if (contentTokenType === tags_1.TagContentType.ESCAPABLE_RAW_TEXT) {
                this._consumeRawTextWithTagClose(prefix, tagName, true);
            }
        };
        _Tokenizer.prototype._consumeRawTextWithTagClose = function (prefix, tagName, consumeEntities) {
            var _this = this;
            this._consumeRawText(consumeEntities, function () {
                if (!_this._attemptCharCode(chars.$LT))
                    return false;
                if (!_this._attemptCharCode(chars.$SLASH))
                    return false;
                _this._attemptCharCodeUntilFn(isNotWhitespace);
                if (!_this._attemptStrCaseInsensitive(tagName))
                    return false;
                _this._attemptCharCodeUntilFn(isNotWhitespace);
                return _this._attemptCharCode(chars.$GT);
            });
            this._beginToken(3 /* TAG_CLOSE */);
            this._requireCharCodeUntilFn(function (code) { return code === chars.$GT; }, 3);
            this._cursor.advance(); // Consume the `>`
            this._endToken([prefix, tagName]);
        };
        _Tokenizer.prototype._consumeTagOpenStart = function (start) {
            this._beginToken(0 /* TAG_OPEN_START */, start);
            var parts = this._consumePrefixAndName();
            return this._endToken(parts);
        };
        _Tokenizer.prototype._consumeAttributeName = function () {
            var attrNameStart = this._cursor.peek();
            if (attrNameStart === chars.$SQ || attrNameStart === chars.$DQ) {
                throw this._createError(_unexpectedCharacterErrorMsg(attrNameStart), this._cursor.getSpan());
            }
            this._beginToken(14 /* ATTR_NAME */);
            var prefixAndName = this._consumePrefixAndName();
            this._endToken(prefixAndName);
        };
        _Tokenizer.prototype._consumeAttributeValue = function () {
            var _this = this;
            var value;
            if (this._cursor.peek() === chars.$SQ || this._cursor.peek() === chars.$DQ) {
                var quoteChar_1 = this._cursor.peek();
                this._consumeQuote(quoteChar_1);
                // In an attribute then end of the attribute value and the premature end to an interpolation
                // are both triggered by the `quoteChar`.
                var endPredicate = function () { return _this._cursor.peek() === quoteChar_1; };
                this._consumeWithInterpolation(16 /* ATTR_VALUE_TEXT */, 17 /* ATTR_VALUE_INTERPOLATION */, endPredicate, endPredicate);
                this._consumeQuote(quoteChar_1);
            }
            else {
                var endPredicate = function () { return isNameEnd(_this._cursor.peek()); };
                this._consumeWithInterpolation(16 /* ATTR_VALUE_TEXT */, 17 /* ATTR_VALUE_INTERPOLATION */, endPredicate, endPredicate);
            }
        };
        _Tokenizer.prototype._consumeQuote = function (quoteChar) {
            this._beginToken(15 /* ATTR_QUOTE */);
            this._requireCharCode(quoteChar);
            this._endToken([String.fromCodePoint(quoteChar)]);
        };
        _Tokenizer.prototype._consumeTagOpenEnd = function () {
            var tokenType = this._attemptCharCode(chars.$SLASH) ? 2 /* TAG_OPEN_END_VOID */ : 1 /* TAG_OPEN_END */;
            this._beginToken(tokenType);
            this._requireCharCode(chars.$GT);
            this._endToken([]);
        };
        _Tokenizer.prototype._consumeTagClose = function (start) {
            this._beginToken(3 /* TAG_CLOSE */, start);
            this._attemptCharCodeUntilFn(isNotWhitespace);
            var prefixAndName = this._consumePrefixAndName();
            this._attemptCharCodeUntilFn(isNotWhitespace);
            this._requireCharCode(chars.$GT);
            this._endToken(prefixAndName);
        };
        _Tokenizer.prototype._consumeExpansionFormStart = function () {
            this._beginToken(19 /* EXPANSION_FORM_START */);
            this._requireCharCode(chars.$LBRACE);
            this._endToken([]);
            this._expansionCaseStack.push(19 /* EXPANSION_FORM_START */);
            this._beginToken(7 /* RAW_TEXT */);
            var condition = this._readUntil(chars.$COMMA);
            var normalizedCondition = this._processCarriageReturns(condition);
            if (this._i18nNormalizeLineEndingsInICUs) {
                // We explicitly want to normalize line endings for this text.
                this._endToken([normalizedCondition]);
            }
            else {
                // We are not normalizing line endings.
                var conditionToken = this._endToken([condition]);
                if (normalizedCondition !== condition) {
                    this.nonNormalizedIcuExpressions.push(conditionToken);
                }
            }
            this._requireCharCode(chars.$COMMA);
            this._attemptCharCodeUntilFn(isNotWhitespace);
            this._beginToken(7 /* RAW_TEXT */);
            var type = this._readUntil(chars.$COMMA);
            this._endToken([type]);
            this._requireCharCode(chars.$COMMA);
            this._attemptCharCodeUntilFn(isNotWhitespace);
        };
        _Tokenizer.prototype._consumeExpansionCaseStart = function () {
            this._beginToken(20 /* EXPANSION_CASE_VALUE */);
            var value = this._readUntil(chars.$LBRACE).trim();
            this._endToken([value]);
            this._attemptCharCodeUntilFn(isNotWhitespace);
            this._beginToken(21 /* EXPANSION_CASE_EXP_START */);
            this._requireCharCode(chars.$LBRACE);
            this._endToken([]);
            this._attemptCharCodeUntilFn(isNotWhitespace);
            this._expansionCaseStack.push(21 /* EXPANSION_CASE_EXP_START */);
        };
        _Tokenizer.prototype._consumeExpansionCaseEnd = function () {
            this._beginToken(22 /* EXPANSION_CASE_EXP_END */);
            this._requireCharCode(chars.$RBRACE);
            this._endToken([]);
            this._attemptCharCodeUntilFn(isNotWhitespace);
            this._expansionCaseStack.pop();
        };
        _Tokenizer.prototype._consumeExpansionFormEnd = function () {
            this._beginToken(23 /* EXPANSION_FORM_END */);
            this._requireCharCode(chars.$RBRACE);
            this._endToken([]);
            this._expansionCaseStack.pop();
        };
        /**
         * Consume a string that may contain interpolation expressions.
         *
         * The first token consumed will be of `tokenType` and then there will be alternating
         * `interpolationTokenType` and `tokenType` tokens until the `endPredicate()` returns true.
         *
         * If an interpolation token ends prematurely it will have no end marker in its `parts` array.
         *
         * @param textTokenType the kind of tokens to interleave around interpolation tokens.
         * @param interpolationTokenType the kind of tokens that contain interpolation.
         * @param endPredicate a function that should return true when we should stop consuming.
         * @param endInterpolation a function that should return true if there is a premature end to an
         *     interpolation expression - i.e. before we get to the normal interpolation closing marker.
         */
        _Tokenizer.prototype._consumeWithInterpolation = function (textTokenType, interpolationTokenType, endPredicate, endInterpolation) {
            this._beginToken(textTokenType);
            var parts = [];
            while (!endPredicate()) {
                var current = this._cursor.clone();
                if (this._interpolationConfig && this._attemptStr(this._interpolationConfig.start)) {
                    this._endToken([this._processCarriageReturns(parts.join(''))], current);
                    parts.length = 0;
                    this._consumeInterpolation(interpolationTokenType, current, endInterpolation);
                    this._beginToken(textTokenType);
                }
                else if (this._cursor.peek() === chars.$AMPERSAND) {
                    this._endToken([this._processCarriageReturns(parts.join(''))]);
                    parts.length = 0;
                    this._consumeEntity(textTokenType);
                    this._beginToken(textTokenType);
                }
                else {
                    parts.push(this._readChar());
                }
            }
            // It is possible that an interpolation was started but not ended inside this text token.
            // Make sure that we reset the state of the lexer correctly.
            this._inInterpolation = false;
            this._endToken([this._processCarriageReturns(parts.join(''))]);
        };
        /**
         * Consume a block of text that has been interpreted as an Angular interpolation.
         *
         * @param interpolationTokenType the type of the interpolation token to generate.
         * @param interpolationStart a cursor that points to the start of this interpolation.
         * @param prematureEndPredicate a function that should return true if the next characters indicate
         *     an end to the interpolation before its normal closing marker.
         */
        _Tokenizer.prototype._consumeInterpolation = function (interpolationTokenType, interpolationStart, prematureEndPredicate) {
            var parts = [];
            this._beginToken(interpolationTokenType, interpolationStart);
            parts.push(this._interpolationConfig.start);
            // Find the end of the interpolation, ignoring content inside quotes.
            var expressionStart = this._cursor.clone();
            var inQuote = null;
            var inComment = false;
            while (this._cursor.peek() !== chars.$EOF &&
                (prematureEndPredicate === null || !prematureEndPredicate())) {
                var current = this._cursor.clone();
                if (this._isTagStart()) {
                    // We are starting what looks like an HTML element in the middle of this interpolation.
                    // Reset the cursor to before the `<` character and end the interpolation token.
                    // (This is actually wrong but here for backward compatibility).
                    this._cursor = current;
                    parts.push(this._getProcessedChars(expressionStart, current));
                    this._endToken(parts);
                    return;
                }
                if (inQuote === null) {
                    if (this._attemptStr(this._interpolationConfig.end)) {
                        // We are not in a string, and we hit the end interpolation marker
                        parts.push(this._getProcessedChars(expressionStart, current));
                        parts.push(this._interpolationConfig.end);
                        this._endToken(parts);
                        return;
                    }
                    else if (this._attemptStr('//')) {
                        // Once we are in a comment we ignore any quotes
                        inComment = true;
                    }
                }
                var char = this._cursor.peek();
                this._cursor.advance();
                if (char === chars.$BACKSLASH) {
                    // Skip the next character because it was escaped.
                    this._cursor.advance();
                }
                else if (char === inQuote) {
                    // Exiting the current quoted string
                    inQuote = null;
                }
                else if (!inComment && inQuote === null && chars.isQuote(char)) {
                    // Entering a new quoted string
                    inQuote = char;
                }
            }
            // We hit EOF without finding a closing interpolation marker
            parts.push(this._getProcessedChars(expressionStart, this._cursor));
            this._endToken(parts);
        };
        _Tokenizer.prototype._getProcessedChars = function (start, end) {
            return this._processCarriageReturns(end.getChars(start));
        };
        _Tokenizer.prototype._isTextEnd = function () {
            if (this._isTagStart() || this._cursor.peek() === chars.$EOF) {
                return true;
            }
            if (this._tokenizeIcu && !this._inInterpolation) {
                if (this.isExpansionFormStart()) {
                    // start of an expansion form
                    return true;
                }
                if (this._cursor.peek() === chars.$RBRACE && this._isInExpansionCase()) {
                    // end of and expansion case
                    return true;
                }
            }
            return false;
        };
        /**
         * Returns true if the current cursor is pointing to the start of a tag
         * (opening/closing/comments/cdata/etc).
         */
        _Tokenizer.prototype._isTagStart = function () {
            if (this._cursor.peek() === chars.$LT) {
                // We assume that `<` followed by whitespace is not the start of an HTML element.
                var tmp = this._cursor.clone();
                tmp.advance();
                // If the next character is alphabetic, ! nor / then it is a tag start
                var code = tmp.peek();
                if ((chars.$a <= code && code <= chars.$z) || (chars.$A <= code && code <= chars.$Z) ||
                    code === chars.$SLASH || code === chars.$BANG) {
                    return true;
                }
            }
            return false;
        };
        _Tokenizer.prototype._readUntil = function (char) {
            var start = this._cursor.clone();
            this._attemptUntilChar(char);
            return this._cursor.getChars(start);
        };
        _Tokenizer.prototype._isInExpansionCase = function () {
            return this._expansionCaseStack.length > 0 &&
                this._expansionCaseStack[this._expansionCaseStack.length - 1] ===
                    21 /* EXPANSION_CASE_EXP_START */;
        };
        _Tokenizer.prototype._isInExpansionForm = function () {
            return this._expansionCaseStack.length > 0 &&
                this._expansionCaseStack[this._expansionCaseStack.length - 1] ===
                    19 /* EXPANSION_FORM_START */;
        };
        _Tokenizer.prototype.isExpansionFormStart = function () {
            if (this._cursor.peek() !== chars.$LBRACE) {
                return false;
            }
            if (this._interpolationConfig) {
                var start = this._cursor.clone();
                var isInterpolation = this._attemptStr(this._interpolationConfig.start);
                this._cursor = start;
                return !isInterpolation;
            }
            return true;
        };
        return _Tokenizer;
    }());
    function isNotWhitespace(code) {
        return !chars.isWhitespace(code) || code === chars.$EOF;
    }
    function isNameEnd(code) {
        return chars.isWhitespace(code) || code === chars.$GT || code === chars.$LT ||
            code === chars.$SLASH || code === chars.$SQ || code === chars.$DQ || code === chars.$EQ ||
            code === chars.$EOF;
    }
    function isPrefixEnd(code) {
        return (code < chars.$a || chars.$z < code) && (code < chars.$A || chars.$Z < code) &&
            (code < chars.$0 || code > chars.$9);
    }
    function isDigitEntityEnd(code) {
        return code === chars.$SEMICOLON || code === chars.$EOF || !chars.isAsciiHexDigit(code);
    }
    function isNamedEntityEnd(code) {
        return code === chars.$SEMICOLON || code === chars.$EOF || !chars.isAsciiLetter(code);
    }
    function isExpansionCaseStart(peek) {
        return peek !== chars.$RBRACE;
    }
    function compareCharCodeCaseInsensitive(code1, code2) {
        return toUpperCaseCharCode(code1) === toUpperCaseCharCode(code2);
    }
    function toUpperCaseCharCode(code) {
        return code >= chars.$a && code <= chars.$z ? code - chars.$a + chars.$A : code;
    }
    function mergeTextTokens(srcTokens) {
        var dstTokens = [];
        var lastDstToken = undefined;
        for (var i = 0; i < srcTokens.length; i++) {
            var token = srcTokens[i];
            if ((lastDstToken && lastDstToken.type === 5 /* TEXT */ && token.type === 5 /* TEXT */) ||
                (lastDstToken && lastDstToken.type === 16 /* ATTR_VALUE_TEXT */ &&
                    token.type === 16 /* ATTR_VALUE_TEXT */)) {
                lastDstToken.parts[0] += token.parts[0];
                lastDstToken.sourceSpan.end = token.sourceSpan.end;
            }
            else {
                lastDstToken = token;
                dstTokens.push(lastDstToken);
            }
        }
        return dstTokens;
    }
    var PlainCharacterCursor = /** @class */ (function () {
        function PlainCharacterCursor(fileOrCursor, range) {
            if (fileOrCursor instanceof PlainCharacterCursor) {
                this.file = fileOrCursor.file;
                this.input = fileOrCursor.input;
                this.end = fileOrCursor.end;
                var state = fileOrCursor.state;
                // Note: avoid using `{...fileOrCursor.state}` here as that has a severe performance penalty.
                // In ES5 bundles the object spread operator is translated into the `__assign` helper, which
                // is not optimized by VMs as efficiently as a raw object literal. Since this constructor is
                // called in tight loops, this difference matters.
                this.state = {
                    peek: state.peek,
                    offset: state.offset,
                    line: state.line,
                    column: state.column,
                };
            }
            else {
                if (!range) {
                    throw new Error('Programming error: the range argument must be provided with a file argument.');
                }
                this.file = fileOrCursor;
                this.input = fileOrCursor.content;
                this.end = range.endPos;
                this.state = {
                    peek: -1,
                    offset: range.startPos,
                    line: range.startLine,
                    column: range.startCol,
                };
            }
        }
        PlainCharacterCursor.prototype.clone = function () {
            return new PlainCharacterCursor(this);
        };
        PlainCharacterCursor.prototype.peek = function () {
            return this.state.peek;
        };
        PlainCharacterCursor.prototype.charsLeft = function () {
            return this.end - this.state.offset;
        };
        PlainCharacterCursor.prototype.diff = function (other) {
            return this.state.offset - other.state.offset;
        };
        PlainCharacterCursor.prototype.advance = function () {
            this.advanceState(this.state);
        };
        PlainCharacterCursor.prototype.init = function () {
            this.updatePeek(this.state);
        };
        PlainCharacterCursor.prototype.getSpan = function (start, leadingTriviaCodePoints) {
            start = start || this;
            var fullStart = start;
            if (leadingTriviaCodePoints) {
                while (this.diff(start) > 0 && leadingTriviaCodePoints.indexOf(start.peek()) !== -1) {
                    if (fullStart === start) {
                        start = start.clone();
                    }
                    start.advance();
                }
            }
            var startLocation = this.locationFromCursor(start);
            var endLocation = this.locationFromCursor(this);
            var fullStartLocation = fullStart !== start ? this.locationFromCursor(fullStart) : startLocation;
            return new parse_util_1.ParseSourceSpan(startLocation, endLocation, fullStartLocation);
        };
        PlainCharacterCursor.prototype.getChars = function (start) {
            return this.input.substring(start.state.offset, this.state.offset);
        };
        PlainCharacterCursor.prototype.charAt = function (pos) {
            return this.input.charCodeAt(pos);
        };
        PlainCharacterCursor.prototype.advanceState = function (state) {
            if (state.offset >= this.end) {
                this.state = state;
                throw new CursorError('Unexpected character "EOF"', this);
            }
            var currentChar = this.charAt(state.offset);
            if (currentChar === chars.$LF) {
                state.line++;
                state.column = 0;
            }
            else if (!chars.isNewLine(currentChar)) {
                state.column++;
            }
            state.offset++;
            this.updatePeek(state);
        };
        PlainCharacterCursor.prototype.updatePeek = function (state) {
            state.peek = state.offset >= this.end ? chars.$EOF : this.charAt(state.offset);
        };
        PlainCharacterCursor.prototype.locationFromCursor = function (cursor) {
            return new parse_util_1.ParseLocation(cursor.file, cursor.state.offset, cursor.state.line, cursor.state.column);
        };
        return PlainCharacterCursor;
    }());
    var EscapedCharacterCursor = /** @class */ (function (_super) {
        tslib_1.__extends(EscapedCharacterCursor, _super);
        function EscapedCharacterCursor(fileOrCursor, range) {
            var _this = this;
            if (fileOrCursor instanceof EscapedCharacterCursor) {
                _this = _super.call(this, fileOrCursor) || this;
                _this.internalState = tslib_1.__assign({}, fileOrCursor.internalState);
            }
            else {
                _this = _super.call(this, fileOrCursor, range) || this;
                _this.internalState = _this.state;
            }
            return _this;
        }
        EscapedCharacterCursor.prototype.advance = function () {
            this.state = this.internalState;
            _super.prototype.advance.call(this);
            this.processEscapeSequence();
        };
        EscapedCharacterCursor.prototype.init = function () {
            _super.prototype.init.call(this);
            this.processEscapeSequence();
        };
        EscapedCharacterCursor.prototype.clone = function () {
            return new EscapedCharacterCursor(this);
        };
        EscapedCharacterCursor.prototype.getChars = function (start) {
            var cursor = start.clone();
            var chars = '';
            while (cursor.internalState.offset < this.internalState.offset) {
                chars += String.fromCodePoint(cursor.peek());
                cursor.advance();
            }
            return chars;
        };
        /**
         * Process the escape sequence that starts at the current position in the text.
         *
         * This method is called to ensure that `peek` has the unescaped value of escape sequences.
         */
        EscapedCharacterCursor.prototype.processEscapeSequence = function () {
            var _this = this;
            var peek = function () { return _this.internalState.peek; };
            if (peek() === chars.$BACKSLASH) {
                // We have hit an escape sequence so we need the internal state to become independent
                // of the external state.
                this.internalState = tslib_1.__assign({}, this.state);
                // Move past the backslash
                this.advanceState(this.internalState);
                // First check for standard control char sequences
                if (peek() === chars.$n) {
                    this.state.peek = chars.$LF;
                }
                else if (peek() === chars.$r) {
                    this.state.peek = chars.$CR;
                }
                else if (peek() === chars.$v) {
                    this.state.peek = chars.$VTAB;
                }
                else if (peek() === chars.$t) {
                    this.state.peek = chars.$TAB;
                }
                else if (peek() === chars.$b) {
                    this.state.peek = chars.$BSPACE;
                }
                else if (peek() === chars.$f) {
                    this.state.peek = chars.$FF;
                }
                // Now consider more complex sequences
                else if (peek() === chars.$u) {
                    // Unicode code-point sequence
                    this.advanceState(this.internalState); // advance past the `u` char
                    if (peek() === chars.$LBRACE) {
                        // Variable length Unicode, e.g. `\x{123}`
                        this.advanceState(this.internalState); // advance past the `{` char
                        // Advance past the variable number of hex digits until we hit a `}` char
                        var digitStart = this.clone();
                        var length_1 = 0;
                        while (peek() !== chars.$RBRACE) {
                            this.advanceState(this.internalState);
                            length_1++;
                        }
                        this.state.peek = this.decodeHexDigits(digitStart, length_1);
                    }
                    else {
                        // Fixed length Unicode, e.g. `\u1234`
                        var digitStart = this.clone();
                        this.advanceState(this.internalState);
                        this.advanceState(this.internalState);
                        this.advanceState(this.internalState);
                        this.state.peek = this.decodeHexDigits(digitStart, 4);
                    }
                }
                else if (peek() === chars.$x) {
                    // Hex char code, e.g. `\x2F`
                    this.advanceState(this.internalState); // advance past the `x` char
                    var digitStart = this.clone();
                    this.advanceState(this.internalState);
                    this.state.peek = this.decodeHexDigits(digitStart, 2);
                }
                else if (chars.isOctalDigit(peek())) {
                    // Octal char code, e.g. `\012`,
                    var octal = '';
                    var length_2 = 0;
                    var previous = this.clone();
                    while (chars.isOctalDigit(peek()) && length_2 < 3) {
                        previous = this.clone();
                        octal += String.fromCodePoint(peek());
                        this.advanceState(this.internalState);
                        length_2++;
                    }
                    this.state.peek = parseInt(octal, 8);
                    // Backup one char
                    this.internalState = previous.internalState;
                }
                else if (chars.isNewLine(this.internalState.peek)) {
                    // Line continuation `\` followed by a new line
                    this.advanceState(this.internalState); // advance over the newline
                    this.state = this.internalState;
                }
                else {
                    // If none of the `if` blocks were executed then we just have an escaped normal character.
                    // In that case we just, effectively, skip the backslash from the character.
                    this.state.peek = this.internalState.peek;
                }
            }
        };
        EscapedCharacterCursor.prototype.decodeHexDigits = function (start, length) {
            var hex = this.input.substr(start.internalState.offset, length);
            var charCode = parseInt(hex, 16);
            if (!isNaN(charCode)) {
                return charCode;
            }
            else {
                start.state = start.internalState;
                throw new CursorError('Invalid hexadecimal escape sequence', start);
            }
        };
        return EscapedCharacterCursor;
    }(PlainCharacterCursor));
    var CursorError = /** @class */ (function () {
        function CursorError(msg, cursor) {
            this.msg = msg;
            this.cursor = cursor;
        }
        return CursorError;
    }());
    exports.CursorError = CursorError;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGV4ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvbWxfcGFyc2VyL2xleGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCxtREFBa0M7SUFDbEMsK0RBQTBGO0lBQzFGLHFFQUEwQztJQUUxQyw2RkFBeUY7SUFDekYsNkRBQXFEO0lBR3JEO1FBQWdDLHNDQUFVO1FBQ3hDLG9CQUFZLFFBQWdCLEVBQVMsU0FBeUIsRUFBRSxJQUFxQjtZQUFyRixZQUNFLGtCQUFNLElBQUksRUFBRSxRQUFRLENBQUMsU0FDdEI7WUFGb0MsZUFBUyxHQUFULFNBQVMsQ0FBZ0I7O1FBRTlELENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFKRCxDQUFnQyx1QkFBVSxHQUl6QztJQUpZLGdDQUFVO0lBTXZCO1FBQ0Usd0JBQ1csTUFBZSxFQUFTLE1BQW9CLEVBQzVDLDJCQUFvQztZQURwQyxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBYztZQUM1QyxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQVM7UUFBRyxDQUFDO1FBQ3JELHFCQUFDO0lBQUQsQ0FBQyxBQUpELElBSUM7SUFKWSx3Q0FBYztJQXVFM0IsU0FBZ0IsUUFBUSxDQUNwQixNQUFjLEVBQUUsR0FBVyxFQUFFLGdCQUFvRCxFQUNqRixPQUE2QjtRQUE3Qix3QkFBQSxFQUFBLFlBQTZCO1FBQy9CLElBQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksNEJBQWUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUYsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sSUFBSSxjQUFjLENBQ3JCLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FB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QUFDO1lBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3BCLE9BQU8sUUFBUSxDQUFDO2FBQ2pCO2lCQUFNO2dCQUNMLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQztnQkFDbEMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNyRTtRQUNILENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUFoSkQsQ0FBcUMsb0JBQW9CLEdBZ0p4RDtJQUVEO1FBQ0UscUJBQW1CLEdBQVcsRUFBUyxNQUF1QjtZQUEzQyxRQUFHLEdBQUgsR0FBRyxDQUFRO1lBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBaUI7UUFBRyxDQUFDO1FBQ3BFLGtCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBjaGFycyBmcm9tICcuLi9jaGFycyc7XG5pbXBvcnQge1BhcnNlRXJyb3IsIFBhcnNlTG9jYXRpb24sIFBhcnNlU291cmNlRmlsZSwgUGFyc2VTb3VyY2VTcGFufSBmcm9tICcuLi9wYXJzZV91dGlsJztcbmltcG9ydCB7TkFNRURfRU5USVRJRVN9IGZyb20gJy4vZW50aXRpZXMnO1xuXG5pbXBvcnQge0RFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcsIEludGVycG9sYXRpb25Db25maWd9IGZyb20gJy4vaW50ZXJwb2xhdGlvbl9jb25maWcnO1xuaW1wb3J0IHtUYWdDb250ZW50VHlwZSwgVGFnRGVmaW5pdGlvbn0gZnJvbSAnLi90YWdzJztcbmltcG9ydCB7SW5jb21wbGV0ZVRhZ09wZW5Ub2tlbiwgVGFnT3BlblN0YXJ0VG9rZW4sIFRva2VuLCBUb2tlblR5cGV9IGZyb20gJy4vdG9rZW5zJztcblxuZXhwb3J0IGNsYXNzIFRva2VuRXJyb3IgZXh0ZW5kcyBQYXJzZUVycm9yIHtcbiAgY29uc3RydWN0b3IoZXJyb3JNc2c6IHN0cmluZywgcHVibGljIHRva2VuVHlwZTogVG9rZW5UeXBlfG51bGwsIHNwYW46IFBhcnNlU291cmNlU3Bhbikge1xuICAgIHN1cGVyKHNwYW4sIGVycm9yTXNnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5pemVSZXN1bHQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyB0b2tlbnM6IFRva2VuW10sIHB1YmxpYyBlcnJvcnM6IFRva2VuRXJyb3JbXSxcbiAgICAgIHB1YmxpYyBub25Ob3JtYWxpemVkSWN1RXhwcmVzc2lvbnM6IFRva2VuW10pIHt9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGV4ZXJSYW5nZSB7XG4gIHN0YXJ0UG9zOiBudW1iZXI7XG4gIHN0YXJ0TGluZTogbnVtYmVyO1xuICBzdGFydENvbDogbnVtYmVyO1xuICBlbmRQb3M6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IGhvdyB0aGUgdGV4dCBpcyB0b2tlbml6ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5pemVPcHRpb25zIHtcbiAgLyoqIFdoZXRoZXIgdG8gdG9rZW5pemUgSUNVIG1lc3NhZ2VzIChjb25zaWRlcmVkIGFzIHRleHQgbm9kZXMgd2hlbiBmYWxzZSkuICovXG4gIHRva2VuaXplRXhwYW5zaW9uRm9ybXM/OiBib29sZWFuO1xuICAvKiogSG93IHRvIHRva2VuaXplIGludGVycG9sYXRpb24gbWFya2Vycy4gKi9cbiAgaW50ZXJwb2xhdGlvbkNvbmZpZz86IEludGVycG9sYXRpb25Db25maWc7XG4gIC8qKlxuICAgKiBUaGUgc3RhcnQgYW5kIGVuZCBwb2ludCBvZiB0aGUgdGV4dCB0byBwYXJzZSB3aXRoaW4gdGhlIGBzb3VyY2VgIHN0cmluZy5cbiAgICogVGhlIGVudGlyZSBgc291cmNlYCBzdHJpbmcgaXMgcGFyc2VkIGlmIHRoaXMgaXMgbm90IHByb3ZpZGVkLlxuICAgKiAqL1xuICByYW5nZT86IExleGVyUmFuZ2U7XG4gIC8qKlxuICAgKiBJZiB0aGlzIHRleHQgaXMgc3RvcmVkIGluIGEgSmF2YVNjcmlwdCBzdHJpbmcsIHRoZW4gd2UgaGF2ZSB0byBkZWFsIHdpdGggZXNjYXBlIHNlcXVlbmNlcy5cbiAgICpcbiAgICogKipFeGFtcGxlIDE6KipcbiAgICpcbiAgICogYGBgXG4gICAqIFwiYWJjXFxcImRlZlxcbmdoaVwiXG4gICAqIGBgYFxuICAgKlxuICAgKiAtIFRoZSBgXFxcImAgbXVzdCBiZSBjb252ZXJ0ZWQgdG8gYFwiYC5cbiAgICogLSBUaGUgYFxcbmAgbXVzdCBiZSBjb252ZXJ0ZWQgdG8gYSBuZXcgbGluZSBjaGFyYWN0ZXIgaW4gYSB0b2tlbixcbiAgICogICBidXQgaXQgc2hvdWxkIG5vdCBpbmNyZW1lbnQgdGhlIGN1cnJlbnQgbGluZSBmb3Igc291cmNlIG1hcHBpbmcuXG4gICAqXG4gICAqICoqRXhhbXBsZSAyOioqXG4gICAqXG4gICAqIGBgYFxuICAgKiBcImFiY1xcXG4gICAqICBkZWZcIlxuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGxpbmUgY29udGludWF0aW9uIChgXFxgIGZvbGxvd2VkIGJ5IGEgbmV3bGluZSkgc2hvdWxkIGJlIHJlbW92ZWQgZnJvbSBhIHRva2VuXG4gICAqIGJ1dCB0aGUgbmV3IGxpbmUgc2hvdWxkIGluY3JlbWVudCB0aGUgY3VycmVudCBsaW5lIGZvciBzb3VyY2UgbWFwcGluZy5cbiAgICovXG4gIGVzY2FwZWRTdHJpbmc/OiBib29sZWFuO1xuICAvKipcbiAgICogSWYgdGhpcyB0ZXh0IGlzIHN0b3JlZCBpbiBhbiBleHRlcm5hbCB0ZW1wbGF0ZSAoZS5nLiB2aWEgYHRlbXBsYXRlVXJsYCkgdGhlbiB3ZSBuZWVkIHRvIGRlY2lkZVxuICAgKiB3aGV0aGVyIG9yIG5vdCB0byBub3JtYWxpemUgdGhlIGxpbmUtZW5kaW5ncyAoZnJvbSBgXFxyXFxuYCB0byBgXFxuYCkgd2hlbiBwcm9jZXNzaW5nIElDVVxuICAgKiBleHByZXNzaW9ucy5cbiAgICpcbiAgICogSWYgYHRydWVgIHRoZW4gd2Ugd2lsbCBub3JtYWxpemUgSUNVIGV4cHJlc3Npb24gbGluZSBlbmRpbmdzLlxuICAgKiBUaGUgZGVmYXVsdCBpcyBgZmFsc2VgLCBidXQgdGhpcyB3aWxsIGJlIHN3aXRjaGVkIGluIGEgZnV0dXJlIG1ham9yIHJlbGVhc2UuXG4gICAqL1xuICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM/OiBib29sZWFuO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgY2hhcmFjdGVycyB0aGF0IHNob3VsZCBiZSBjb25zaWRlcmVkIGFzIGxlYWRpbmcgdHJpdmlhLlxuICAgKiBMZWFkaW5nIHRyaXZpYSBhcmUgY2hhcmFjdGVycyB0aGF0IGFyZSBub3QgaW1wb3J0YW50IHRvIHRoZSBkZXZlbG9wZXIsIGFuZCBzbyBzaG91bGQgbm90IGJlXG4gICAqIGluY2x1ZGVkIGluIHNvdXJjZS1tYXAgc2VnbWVudHMuICBBIGNvbW1vbiBleGFtcGxlIGlzIHdoaXRlc3BhY2UuXG4gICAqL1xuICBsZWFkaW5nVHJpdmlhQ2hhcnM/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIElmIHRydWUsIGRvIG5vdCBjb252ZXJ0IENSTEYgdG8gTEYuXG4gICAqL1xuICBwcmVzZXJ2ZUxpbmVFbmRpbmdzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRva2VuaXplKFxuICAgIHNvdXJjZTogc3RyaW5nLCB1cmw6IHN0cmluZywgZ2V0VGFnRGVmaW5pdGlvbjogKHRhZ05hbWU6IHN0cmluZykgPT4gVGFnRGVmaW5pdGlvbixcbiAgICBvcHRpb25zOiBUb2tlbml6ZU9wdGlvbnMgPSB7fSk6IFRva2VuaXplUmVzdWx0IHtcbiAgY29uc3QgdG9rZW5pemVyID0gbmV3IF9Ub2tlbml6ZXIobmV3IFBhcnNlU291cmNlRmlsZShzb3VyY2UsIHVybCksIGdldFRhZ0RlZmluaXRpb24sIG9wdGlvbnMpO1xuICB0b2tlbml6ZXIudG9rZW5pemUoKTtcbiAgcmV0dXJuIG5ldyBUb2tlbml6ZVJlc3VsdChcbiAgICAgIG1lcmdlVGV4dFRva2Vucyh0b2tlbml6ZXIudG9rZW5zKSwgdG9rZW5pemVyLmVycm9ycywgdG9rZW5pemVyLm5vbk5vcm1hbGl6ZWRJY3VFeHByZXNzaW9ucyk7XG59XG5cbmNvbnN0IF9DUl9PUl9DUkxGX1JFR0VYUCA9IC9cXHJcXG4/L2c7XG5cbmZ1bmN0aW9uIF91bmV4cGVjdGVkQ2hhcmFjdGVyRXJyb3JNc2coY2hhckNvZGU6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGNoYXIgPSBjaGFyQ29kZSA9PT0gY2hhcnMuJEVPRiA/ICdFT0YnIDogU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZSk7XG4gIHJldHVybiBgVW5leHBlY3RlZCBjaGFyYWN0ZXIgXCIke2NoYXJ9XCJgO1xufVxuXG5mdW5jdGlvbiBfdW5rbm93bkVudGl0eUVycm9yTXNnKGVudGl0eVNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBVbmtub3duIGVudGl0eSBcIiR7ZW50aXR5U3JjfVwiIC0gdXNlIHRoZSBcIiYjPGRlY2ltYWw+O1wiIG9yICBcIiYjeDxoZXg+O1wiIHN5bnRheGA7XG59XG5cbmZ1bmN0aW9uIF91bnBhcnNhYmxlRW50aXR5RXJyb3JNc2codHlwZTogQ2hhcmFjdGVyUmVmZXJlbmNlVHlwZSwgZW50aXR5U3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYFVuYWJsZSB0byBwYXJzZSBlbnRpdHkgXCIke2VudGl0eVN0cn1cIiAtICR7XG4gICAgICB0eXBlfSBjaGFyYWN0ZXIgcmVmZXJlbmNlIGVudGl0aWVzIG11c3QgZW5kIHdpdGggXCI7XCJgO1xufVxuXG5lbnVtIENoYXJhY3RlclJlZmVyZW5jZVR5cGUge1xuICBIRVggPSAnaGV4YWRlY2ltYWwnLFxuICBERUMgPSAnZGVjaW1hbCcsXG59XG5cbmNsYXNzIF9Db250cm9sRmxvd0Vycm9yIHtcbiAgY29uc3RydWN0b3IocHVibGljIGVycm9yOiBUb2tlbkVycm9yKSB7fVxufVxuXG4vLyBTZWUgaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1MS9zeW50YXguaHRtbCN3cml0aW5nLWh0bWwtZG9jdW1lbnRzXG5jbGFzcyBfVG9rZW5pemVyIHtcbiAgcHJpdmF0ZSBfY3Vyc29yOiBDaGFyYWN0ZXJDdXJzb3I7XG4gIHByaXZhdGUgX3Rva2VuaXplSWN1OiBib29sZWFuO1xuICBwcml2YXRlIF9pbnRlcnBvbGF0aW9uQ29uZmlnOiBJbnRlcnBvbGF0aW9uQ29uZmlnO1xuICBwcml2YXRlIF9sZWFkaW5nVHJpdmlhQ29kZVBvaW50czogbnVtYmVyW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9jdXJyZW50VG9rZW5TdGFydDogQ2hhcmFjdGVyQ3Vyc29yfG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9jdXJyZW50VG9rZW5UeXBlOiBUb2tlblR5cGV8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2V4cGFuc2lvbkNhc2VTdGFjazogVG9rZW5UeXBlW10gPSBbXTtcbiAgcHJpdmF0ZSBfaW5JbnRlcnBvbGF0aW9uOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3ByZXNlcnZlTGluZUVuZGluZ3M6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVhZG9ubHkgX2VzY2FwZWRTdHJpbmc6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVhZG9ubHkgX2kxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVczogYm9vbGVhbjtcbiAgdG9rZW5zOiBUb2tlbltdID0gW107XG4gIGVycm9yczogVG9rZW5FcnJvcltdID0gW107XG4gIG5vbk5vcm1hbGl6ZWRJY3VFeHByZXNzaW9uczogVG9rZW5bXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gX2ZpbGUgVGhlIGh0bWwgc291cmNlIGZpbGUgYmVpbmcgdG9rZW5pemVkLlxuICAgKiBAcGFyYW0gX2dldFRhZ0RlZmluaXRpb24gQSBmdW5jdGlvbiB0aGF0IHdpbGwgcmV0cmlldmUgYSB0YWcgZGVmaW5pdGlvbiBmb3IgYSBnaXZlbiB0YWcgbmFtZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgQ29uZmlndXJhdGlvbiBvZiB0aGUgdG9rZW5pemF0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICBfZmlsZTogUGFyc2VTb3VyY2VGaWxlLCBwcml2YXRlIF9nZXRUYWdEZWZpbml0aW9uOiAodGFnTmFtZTogc3RyaW5nKSA9PiBUYWdEZWZpbml0aW9uLFxuICAgICAgb3B0aW9uczogVG9rZW5pemVPcHRpb25zKSB7XG4gICAgdGhpcy5fdG9rZW5pemVJY3UgPSBvcHRpb25zLnRva2VuaXplRXhwYW5zaW9uRm9ybXMgfHwgZmFsc2U7XG4gICAgdGhpcy5faW50ZXJwb2xhdGlvbkNvbmZpZyA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbkNvbmZpZyB8fCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHO1xuICAgIHRoaXMuX2xlYWRpbmdUcml2aWFDb2RlUG9pbnRzID1cbiAgICAgICAgb3B0aW9ucy5sZWFkaW5nVHJpdmlhQ2hhcnMgJiYgb3B0aW9ucy5sZWFkaW5nVHJpdmlhQ2hhcnMubWFwKGMgPT4gYy5jb2RlUG9pbnRBdCgwKSB8fCAwKTtcbiAgICBjb25zdCByYW5nZSA9XG4gICAgICAgIG9wdGlvbnMucmFuZ2UgfHwge2VuZFBvczogX2ZpbGUuY29udGVudC5sZW5ndGgsIHN0YXJ0UG9zOiAwLCBzdGFydExpbmU6IDAsIHN0YXJ0Q29sOiAwfTtcbiAgICB0aGlzLl9jdXJzb3IgPSBvcHRpb25zLmVzY2FwZWRTdHJpbmcgPyBuZXcgRXNjYXBlZENoYXJhY3RlckN1cnNvcihfZmlsZSwgcmFuZ2UpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUGxhaW5DaGFyYWN0ZXJDdXJzb3IoX2ZpbGUsIHJhbmdlKTtcbiAgICB0aGlzLl9wcmVzZXJ2ZUxpbmVFbmRpbmdzID0gb3B0aW9ucy5wcmVzZXJ2ZUxpbmVFbmRpbmdzIHx8IGZhbHNlO1xuICAgIHRoaXMuX2VzY2FwZWRTdHJpbmcgPSBvcHRpb25zLmVzY2FwZWRTdHJpbmcgfHwgZmFsc2U7XG4gICAgdGhpcy5faTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzID0gb3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgfHwgZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2N1cnNvci5pbml0KCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9wcm9jZXNzQ2FycmlhZ2VSZXR1cm5zKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMuX3ByZXNlcnZlTGluZUVuZGluZ3MpIHtcbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH1cbiAgICAvLyBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUxL3N5bnRheC5odG1sI3ByZXByb2Nlc3NpbmctdGhlLWlucHV0LXN0cmVhbVxuICAgIC8vIEluIG9yZGVyIHRvIGtlZXAgdGhlIG9yaWdpbmFsIHBvc2l0aW9uIGluIHRoZSBzb3VyY2UsIHdlIGNhbiBub3RcbiAgICAvLyBwcmUtcHJvY2VzcyBpdC5cbiAgICAvLyBJbnN0ZWFkIENScyBhcmUgcHJvY2Vzc2VkIHJpZ2h0IGJlZm9yZSBpbnN0YW50aWF0aW5nIHRoZSB0b2tlbnMuXG4gICAgcmV0dXJuIGNvbnRlbnQucmVwbGFjZShfQ1JfT1JfQ1JMRl9SRUdFWFAsICdcXG4nKTtcbiAgfVxuXG4gIHRva2VuaXplKCk6IHZvaWQge1xuICAgIHdoaWxlICh0aGlzLl9jdXJzb3IucGVlaygpICE9PSBjaGFycy4kRU9GKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHRoaXMuX2F0dGVtcHRDaGFyQ29kZShjaGFycy4kTFQpKSB7XG4gICAgICAgICAgaWYgKHRoaXMuX2F0dGVtcHRDaGFyQ29kZShjaGFycy4kQkFORykpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9hdHRlbXB0Q2hhckNvZGUoY2hhcnMuJExCUkFDS0VUKSkge1xuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lQ2RhdGEoc3RhcnQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9hdHRlbXB0Q2hhckNvZGUoY2hhcnMuJE1JTlVTKSkge1xuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lQ29tbWVudChzdGFydCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lRG9jVHlwZShzdGFydCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9hdHRlbXB0Q2hhckNvZGUoY2hhcnMuJFNMQVNIKSkge1xuICAgICAgICAgICAgdGhpcy5fY29uc3VtZVRhZ0Nsb3NlKHN0YXJ0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY29uc3VtZVRhZ09wZW4oc3RhcnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghKHRoaXMuX3Rva2VuaXplSWN1ICYmIHRoaXMuX3Rva2VuaXplRXhwYW5zaW9uRm9ybSgpKSkge1xuICAgICAgICAgIC8vIEluIChwb3NzaWJseSBpbnRlcnBvbGF0ZWQpIHRleHQgdGhlIGVuZCBvZiB0aGUgdGV4dCBpcyBnaXZlbiBieSBgaXNUZXh0RW5kKClgLCB3aGlsZVxuICAgICAgICAgIC8vIHRoZSBwcmVtYXR1cmUgZW5kIG9mIGFuIGludGVycG9sYXRpb24gaXMgZ2l2ZW4gYnkgdGhlIHN0YXJ0IG9mIGEgbmV3IEhUTUwgZWxlbWVudC5cbiAgICAgICAgICB0aGlzLl9jb25zdW1lV2l0aEludGVycG9sYXRpb24oXG4gICAgICAgICAgICAgIFRva2VuVHlwZS5URVhULCBUb2tlblR5cGUuSU5URVJQT0xBVElPTiwgKCkgPT4gdGhpcy5faXNUZXh0RW5kKCksXG4gICAgICAgICAgICAgICgpID0+IHRoaXMuX2lzVGFnU3RhcnQoKSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuRU9GKTtcbiAgICB0aGlzLl9lbmRUb2tlbihbXSk7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgd2hldGhlciBhbiBJQ1UgdG9rZW4gaGFzIGJlZW4gY3JlYXRlZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHByaXZhdGUgX3Rva2VuaXplRXhwYW5zaW9uRm9ybSgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5pc0V4cGFuc2lvbkZvcm1TdGFydCgpKSB7XG4gICAgICB0aGlzLl9jb25zdW1lRXhwYW5zaW9uRm9ybVN0YXJ0KCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoaXNFeHBhbnNpb25DYXNlU3RhcnQodGhpcy5fY3Vyc29yLnBlZWsoKSkgJiYgdGhpcy5faXNJbkV4cGFuc2lvbkZvcm0oKSkge1xuICAgICAgdGhpcy5fY29uc3VtZUV4cGFuc2lvbkNhc2VTdGFydCgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2N1cnNvci5wZWVrKCkgPT09IGNoYXJzLiRSQlJBQ0UpIHtcbiAgICAgIGlmICh0aGlzLl9pc0luRXhwYW5zaW9uQ2FzZSgpKSB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVFeHBhbnNpb25DYXNlRW5kKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5faXNJbkV4cGFuc2lvbkZvcm0oKSkge1xuICAgICAgICB0aGlzLl9jb25zdW1lRXhwYW5zaW9uRm9ybUVuZCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIF9iZWdpblRva2VuKHR5cGU6IFRva2VuVHlwZSwgc3RhcnQgPSB0aGlzLl9jdXJzb3IuY2xvbmUoKSkge1xuICAgIHRoaXMuX2N1cnJlbnRUb2tlblN0YXJ0ID0gc3RhcnQ7XG4gICAgdGhpcy5fY3VycmVudFRva2VuVHlwZSA9IHR5cGU7XG4gIH1cblxuICBwcml2YXRlIF9lbmRUb2tlbihwYXJ0czogc3RyaW5nW10sIGVuZD86IENoYXJhY3RlckN1cnNvcik6IFRva2VuIHtcbiAgICBpZiAodGhpcy5fY3VycmVudFRva2VuU3RhcnQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUb2tlbkVycm9yKFxuICAgICAgICAgICdQcm9ncmFtbWluZyBlcnJvciAtIGF0dGVtcHRlZCB0byBlbmQgYSB0b2tlbiB3aGVuIHRoZXJlIHdhcyBubyBzdGFydCB0byB0aGUgdG9rZW4nLFxuICAgICAgICAgIHRoaXMuX2N1cnJlbnRUb2tlblR5cGUsIHRoaXMuX2N1cnNvci5nZXRTcGFuKGVuZCkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fY3VycmVudFRva2VuVHlwZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFRva2VuRXJyb3IoXG4gICAgICAgICAgJ1Byb2dyYW1taW5nIGVycm9yIC0gYXR0ZW1wdGVkIHRvIGVuZCBhIHRva2VuIHdoaWNoIGhhcyBubyB0b2tlbiB0eXBlJywgbnVsbCxcbiAgICAgICAgICB0aGlzLl9jdXJzb3IuZ2V0U3Bhbih0aGlzLl9jdXJyZW50VG9rZW5TdGFydCkpO1xuICAgIH1cbiAgICBjb25zdCB0b2tlbiA9IHtcbiAgICAgIHR5cGU6IHRoaXMuX2N1cnJlbnRUb2tlblR5cGUsXG4gICAgICBwYXJ0cyxcbiAgICAgIHNvdXJjZVNwYW46XG4gICAgICAgICAgKGVuZCA/PyB0aGlzLl9jdXJzb3IpLmdldFNwYW4odGhpcy5fY3VycmVudFRva2VuU3RhcnQsIHRoaXMuX2xlYWRpbmdUcml2aWFDb2RlUG9pbnRzKSxcbiAgICB9IGFzIFRva2VuO1xuICAgIHRoaXMudG9rZW5zLnB1c2godG9rZW4pO1xuICAgIHRoaXMuX2N1cnJlbnRUb2tlblN0YXJ0ID0gbnVsbDtcbiAgICB0aGlzLl9jdXJyZW50VG9rZW5UeXBlID0gbnVsbDtcbiAgICByZXR1cm4gdG9rZW47XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVFcnJvcihtc2c6IHN0cmluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogX0NvbnRyb2xGbG93RXJyb3Ige1xuICAgIGlmICh0aGlzLl9pc0luRXhwYW5zaW9uRm9ybSgpKSB7XG4gICAgICBtc2cgKz0gYCAoRG8geW91IGhhdmUgYW4gdW5lc2NhcGVkIFwie1wiIGluIHlvdXIgdGVtcGxhdGU/IFVzZSBcInt7ICd7JyB9fVwiKSB0byBlc2NhcGUgaXQuKWA7XG4gICAgfVxuICAgIGNvbnN0IGVycm9yID0gbmV3IFRva2VuRXJyb3IobXNnLCB0aGlzLl9jdXJyZW50VG9rZW5UeXBlLCBzcGFuKTtcbiAgICB0aGlzLl9jdXJyZW50VG9rZW5TdGFydCA9IG51bGw7XG4gICAgdGhpcy5fY3VycmVudFRva2VuVHlwZSA9IG51bGw7XG4gICAgcmV0dXJuIG5ldyBfQ29udHJvbEZsb3dFcnJvcihlcnJvcik7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUVycm9yKGU6IGFueSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgQ3Vyc29yRXJyb3IpIHtcbiAgICAgIGUgPSB0aGlzLl9jcmVhdGVFcnJvcihlLm1zZywgdGhpcy5fY3Vyc29yLmdldFNwYW4oZS5jdXJzb3IpKTtcbiAgICB9XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBfQ29udHJvbEZsb3dFcnJvcikge1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChlLmVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hdHRlbXB0Q2hhckNvZGUoY2hhckNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9jdXJzb3IucGVlaygpID09PSBjaGFyQ29kZSkge1xuICAgICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIF9hdHRlbXB0Q2hhckNvZGVDYXNlSW5zZW5zaXRpdmUoY2hhckNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmIChjb21wYXJlQ2hhckNvZGVDYXNlSW5zZW5zaXRpdmUodGhpcy5fY3Vyc29yLnBlZWsoKSwgY2hhckNvZGUpKSB7XG4gICAgICB0aGlzLl9jdXJzb3IuYWR2YW5jZSgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlcXVpcmVDaGFyQ29kZShjaGFyQ29kZTogbnVtYmVyKSB7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICBpZiAoIXRoaXMuX2F0dGVtcHRDaGFyQ29kZShjaGFyQ29kZSkpIHtcbiAgICAgIHRocm93IHRoaXMuX2NyZWF0ZUVycm9yKFxuICAgICAgICAgIF91bmV4cGVjdGVkQ2hhcmFjdGVyRXJyb3JNc2codGhpcy5fY3Vyc29yLnBlZWsoKSksIHRoaXMuX2N1cnNvci5nZXRTcGFuKGxvY2F0aW9uKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfYXR0ZW1wdFN0cihjaGFyczogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVuID0gY2hhcnMubGVuZ3RoO1xuICAgIGlmICh0aGlzLl9jdXJzb3IuY2hhcnNMZWZ0KCkgPCBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgaW5pdGlhbFBvc2l0aW9uID0gdGhpcy5fY3Vyc29yLmNsb25lKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLl9hdHRlbXB0Q2hhckNvZGUoY2hhcnMuY2hhckNvZGVBdChpKSkpIHtcbiAgICAgICAgLy8gSWYgYXR0ZW1wdGluZyB0byBwYXJzZSB0aGUgc3RyaW5nIGZhaWxzLCB3ZSB3YW50IHRvIHJlc2V0IHRoZSBwYXJzZXJcbiAgICAgICAgLy8gdG8gd2hlcmUgaXQgd2FzIGJlZm9yZSB0aGUgYXR0ZW1wdFxuICAgICAgICB0aGlzLl9jdXJzb3IgPSBpbml0aWFsUG9zaXRpb247XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIF9hdHRlbXB0U3RyQ2FzZUluc2Vuc2l0aXZlKGNoYXJzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMuX2F0dGVtcHRDaGFyQ29kZUNhc2VJbnNlbnNpdGl2ZShjaGFycy5jaGFyQ29kZUF0KGkpKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVxdWlyZVN0cihjaGFyczogc3RyaW5nKSB7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICBpZiAoIXRoaXMuX2F0dGVtcHRTdHIoY2hhcnMpKSB7XG4gICAgICB0aHJvdyB0aGlzLl9jcmVhdGVFcnJvcihcbiAgICAgICAgICBfdW5leHBlY3RlZENoYXJhY3RlckVycm9yTXNnKHRoaXMuX2N1cnNvci5wZWVrKCkpLCB0aGlzLl9jdXJzb3IuZ2V0U3Bhbihsb2NhdGlvbikpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2F0dGVtcHRDaGFyQ29kZVVudGlsRm4ocHJlZGljYXRlOiAoY29kZTogbnVtYmVyKSA9PiBib29sZWFuKSB7XG4gICAgd2hpbGUgKCFwcmVkaWNhdGUodGhpcy5fY3Vyc29yLnBlZWsoKSkpIHtcbiAgICAgIHRoaXMuX2N1cnNvci5hZHZhbmNlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfcmVxdWlyZUNoYXJDb2RlVW50aWxGbihwcmVkaWNhdGU6IChjb2RlOiBudW1iZXIpID0+IGJvb2xlYW4sIGxlbjogbnVtYmVyKSB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKHByZWRpY2F0ZSk7XG4gICAgaWYgKHRoaXMuX2N1cnNvci5kaWZmKHN0YXJ0KSA8IGxlbikge1xuICAgICAgdGhyb3cgdGhpcy5fY3JlYXRlRXJyb3IoXG4gICAgICAgICAgX3VuZXhwZWN0ZWRDaGFyYWN0ZXJFcnJvck1zZyh0aGlzLl9jdXJzb3IucGVlaygpKSwgdGhpcy5fY3Vyc29yLmdldFNwYW4oc3RhcnQpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hdHRlbXB0VW50aWxDaGFyKGNoYXI6IG51bWJlcikge1xuICAgIHdoaWxlICh0aGlzLl9jdXJzb3IucGVlaygpICE9PSBjaGFyKSB7XG4gICAgICB0aGlzLl9jdXJzb3IuYWR2YW5jZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3JlYWRDaGFyKCk6IHN0cmluZyB7XG4gICAgLy8gRG9uJ3QgcmVseSB1cG9uIHJlYWRpbmcgZGlyZWN0bHkgZnJvbSBgX2lucHV0YCBhcyB0aGUgYWN0dWFsIGNoYXIgdmFsdWVcbiAgICAvLyBtYXkgaGF2ZSBiZWVuIGdlbmVyYXRlZCBmcm9tIGFuIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICBjb25zdCBjaGFyID0gU3RyaW5nLmZyb21Db2RlUG9pbnQodGhpcy5fY3Vyc29yLnBlZWsoKSk7XG4gICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gY2hhcjtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVFbnRpdHkodGV4dFRva2VuVHlwZTogVG9rZW5UeXBlKTogdm9pZCB7XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuRU5DT0RFRF9FTlRJVFkpO1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5fY3Vyc29yLmNsb25lKCk7XG4gICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICBpZiAodGhpcy5fYXR0ZW1wdENoYXJDb2RlKGNoYXJzLiRIQVNIKSkge1xuICAgICAgY29uc3QgaXNIZXggPSB0aGlzLl9hdHRlbXB0Q2hhckNvZGUoY2hhcnMuJHgpIHx8IHRoaXMuX2F0dGVtcHRDaGFyQ29kZShjaGFycy4kWCk7XG4gICAgICBjb25zdCBjb2RlU3RhcnQgPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICAgIHRoaXMuX2F0dGVtcHRDaGFyQ29kZVVudGlsRm4oaXNEaWdpdEVudGl0eUVuZCk7XG4gICAgICBpZiAodGhpcy5fY3Vyc29yLnBlZWsoKSAhPSBjaGFycy4kU0VNSUNPTE9OKSB7XG4gICAgICAgIC8vIEFkdmFuY2UgY3Vyc29yIHRvIGluY2x1ZGUgdGhlIHBlZWtlZCBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZyBwcm92aWRlZCB0byB0aGUgZXJyb3JcbiAgICAgICAgLy8gbWVzc2FnZS5cbiAgICAgICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICAgICAgY29uc3QgZW50aXR5VHlwZSA9IGlzSGV4ID8gQ2hhcmFjdGVyUmVmZXJlbmNlVHlwZS5IRVggOiBDaGFyYWN0ZXJSZWZlcmVuY2VUeXBlLkRFQztcbiAgICAgICAgdGhyb3cgdGhpcy5fY3JlYXRlRXJyb3IoXG4gICAgICAgICAgICBfdW5wYXJzYWJsZUVudGl0eUVycm9yTXNnKGVudGl0eVR5cGUsIHRoaXMuX2N1cnNvci5nZXRDaGFycyhzdGFydCkpLFxuICAgICAgICAgICAgdGhpcy5fY3Vyc29yLmdldFNwYW4oKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBzdHJOdW0gPSB0aGlzLl9jdXJzb3IuZ2V0Q2hhcnMoY29kZVN0YXJ0KTtcbiAgICAgIHRoaXMuX2N1cnNvci5hZHZhbmNlKCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjaGFyQ29kZSA9IHBhcnNlSW50KHN0ck51bSwgaXNIZXggPyAxNiA6IDEwKTtcbiAgICAgICAgdGhpcy5fZW5kVG9rZW4oW1N0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUpLCB0aGlzLl9jdXJzb3IuZ2V0Q2hhcnMoc3RhcnQpXSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdGhyb3cgdGhpcy5fY3JlYXRlRXJyb3IoXG4gICAgICAgICAgICBfdW5rbm93bkVudGl0eUVycm9yTXNnKHRoaXMuX2N1cnNvci5nZXRDaGFycyhzdGFydCkpLCB0aGlzLl9jdXJzb3IuZ2V0U3BhbigpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbmFtZVN0YXJ0ID0gdGhpcy5fY3Vyc29yLmNsb25lKCk7XG4gICAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKGlzTmFtZWRFbnRpdHlFbmQpO1xuICAgICAgaWYgKHRoaXMuX2N1cnNvci5wZWVrKCkgIT0gY2hhcnMuJFNFTUlDT0xPTikge1xuICAgICAgICAvLyBObyBzZW1pY29sb24gd2FzIGZvdW5kIHNvIGFib3J0IHRoZSBlbmNvZGVkIGVudGl0eSB0b2tlbiB0aGF0IHdhcyBpbiBwcm9ncmVzcywgYW5kIHRyZWF0XG4gICAgICAgIC8vIHRoaXMgYXMgYSB0ZXh0IHRva2VuXG4gICAgICAgIHRoaXMuX2JlZ2luVG9rZW4odGV4dFRva2VuVHlwZSwgc3RhcnQpO1xuICAgICAgICB0aGlzLl9jdXJzb3IgPSBuYW1lU3RhcnQ7XG4gICAgICAgIHRoaXMuX2VuZFRva2VuKFsnJiddKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLl9jdXJzb3IuZ2V0Q2hhcnMobmFtZVN0YXJ0KTtcbiAgICAgICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICAgICAgY29uc3QgY2hhciA9IE5BTUVEX0VOVElUSUVTW25hbWVdO1xuICAgICAgICBpZiAoIWNoYXIpIHtcbiAgICAgICAgICB0aHJvdyB0aGlzLl9jcmVhdGVFcnJvcihfdW5rbm93bkVudGl0eUVycm9yTXNnKG5hbWUpLCB0aGlzLl9jdXJzb3IuZ2V0U3BhbihzdGFydCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2VuZFRva2VuKFtjaGFyLCBgJiR7bmFtZX07YF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVSYXdUZXh0KGNvbnN1bWVFbnRpdGllczogYm9vbGVhbiwgZW5kTWFya2VyUHJlZGljYXRlOiAoKSA9PiBib29sZWFuKTogdm9pZCB7XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihjb25zdW1lRW50aXRpZXMgPyBUb2tlblR5cGUuRVNDQVBBQkxFX1JBV19URVhUIDogVG9rZW5UeXBlLlJBV19URVhUKTtcbiAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgdGFnQ2xvc2VTdGFydCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuICAgICAgY29uc3QgZm91bmRFbmRNYXJrZXIgPSBlbmRNYXJrZXJQcmVkaWNhdGUoKTtcbiAgICAgIHRoaXMuX2N1cnNvciA9IHRhZ0Nsb3NlU3RhcnQ7XG4gICAgICBpZiAoZm91bmRFbmRNYXJrZXIpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoY29uc3VtZUVudGl0aWVzICYmIHRoaXMuX2N1cnNvci5wZWVrKCkgPT09IGNoYXJzLiRBTVBFUlNBTkQpIHtcbiAgICAgICAgdGhpcy5fZW5kVG9rZW4oW3RoaXMuX3Byb2Nlc3NDYXJyaWFnZVJldHVybnMocGFydHMuam9pbignJykpXSk7XG4gICAgICAgIHBhcnRzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVFbnRpdHkoVG9rZW5UeXBlLkVTQ0FQQUJMRV9SQVdfVEVYVCk7XG4gICAgICAgIHRoaXMuX2JlZ2luVG9rZW4oVG9rZW5UeXBlLkVTQ0FQQUJMRV9SQVdfVEVYVCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJ0cy5wdXNoKHRoaXMuX3JlYWRDaGFyKCkpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9lbmRUb2tlbihbdGhpcy5fcHJvY2Vzc0NhcnJpYWdlUmV0dXJucyhwYXJ0cy5qb2luKCcnKSldKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVDb21tZW50KHN0YXJ0OiBDaGFyYWN0ZXJDdXJzb3IpIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5DT01NRU5UX1NUQVJULCBzdGFydCk7XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlKGNoYXJzLiRNSU5VUyk7XG4gICAgdGhpcy5fZW5kVG9rZW4oW10pO1xuICAgIHRoaXMuX2NvbnN1bWVSYXdUZXh0KGZhbHNlLCAoKSA9PiB0aGlzLl9hdHRlbXB0U3RyKCctLT4nKSk7XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuQ09NTUVOVF9FTkQpO1xuICAgIHRoaXMuX3JlcXVpcmVTdHIoJy0tPicpO1xuICAgIHRoaXMuX2VuZFRva2VuKFtdKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVDZGF0YShzdGFydDogQ2hhcmFjdGVyQ3Vyc29yKSB7XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuQ0RBVEFfU1RBUlQsIHN0YXJ0KTtcbiAgICB0aGlzLl9yZXF1aXJlU3RyKCdDREFUQVsnKTtcbiAgICB0aGlzLl9lbmRUb2tlbihbXSk7XG4gICAgdGhpcy5fY29uc3VtZVJhd1RleHQoZmFsc2UsICgpID0+IHRoaXMuX2F0dGVtcHRTdHIoJ11dPicpKTtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5DREFUQV9FTkQpO1xuICAgIHRoaXMuX3JlcXVpcmVTdHIoJ11dPicpO1xuICAgIHRoaXMuX2VuZFRva2VuKFtdKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVEb2NUeXBlKHN0YXJ0OiBDaGFyYWN0ZXJDdXJzb3IpIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5ET0NfVFlQRSwgc3RhcnQpO1xuICAgIGNvbnN0IGNvbnRlbnRTdGFydCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuICAgIHRoaXMuX2F0dGVtcHRVbnRpbENoYXIoY2hhcnMuJEdUKTtcbiAgICBjb25zdCBjb250ZW50ID0gdGhpcy5fY3Vyc29yLmdldENoYXJzKGNvbnRlbnRTdGFydCk7XG4gICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICB0aGlzLl9lbmRUb2tlbihbY29udGVudF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZVByZWZpeEFuZE5hbWUoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IG5hbWVPclByZWZpeFN0YXJ0ID0gdGhpcy5fY3Vyc29yLmNsb25lKCk7XG4gICAgbGV0IHByZWZpeDogc3RyaW5nID0gJyc7XG4gICAgd2hpbGUgKHRoaXMuX2N1cnNvci5wZWVrKCkgIT09IGNoYXJzLiRDT0xPTiAmJiAhaXNQcmVmaXhFbmQodGhpcy5fY3Vyc29yLnBlZWsoKSkpIHtcbiAgICAgIHRoaXMuX2N1cnNvci5hZHZhbmNlKCk7XG4gICAgfVxuICAgIGxldCBuYW1lU3RhcnQ6IENoYXJhY3RlckN1cnNvcjtcbiAgICBpZiAodGhpcy5fY3Vyc29yLnBlZWsoKSA9PT0gY2hhcnMuJENPTE9OKSB7XG4gICAgICBwcmVmaXggPSB0aGlzLl9jdXJzb3IuZ2V0Q2hhcnMobmFtZU9yUHJlZml4U3RhcnQpO1xuICAgICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICAgIG5hbWVTdGFydCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lU3RhcnQgPSBuYW1lT3JQcmVmaXhTdGFydDtcbiAgICB9XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlVW50aWxGbihpc05hbWVFbmQsIHByZWZpeCA9PT0gJycgPyAwIDogMSk7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMuX2N1cnNvci5nZXRDaGFycyhuYW1lU3RhcnQpO1xuICAgIHJldHVybiBbcHJlZml4LCBuYW1lXTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVUYWdPcGVuKHN0YXJ0OiBDaGFyYWN0ZXJDdXJzb3IpIHtcbiAgICBsZXQgdGFnTmFtZTogc3RyaW5nO1xuICAgIGxldCBwcmVmaXg6IHN0cmluZztcbiAgICBsZXQgb3BlblRhZ1Rva2VuOiBUYWdPcGVuU3RhcnRUb2tlbnxJbmNvbXBsZXRlVGFnT3BlblRva2VufHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgaWYgKCFjaGFycy5pc0FzY2lpTGV0dGVyKHRoaXMuX2N1cnNvci5wZWVrKCkpKSB7XG4gICAgICAgIHRocm93IHRoaXMuX2NyZWF0ZUVycm9yKFxuICAgICAgICAgICAgX3VuZXhwZWN0ZWRDaGFyYWN0ZXJFcnJvck1zZyh0aGlzLl9jdXJzb3IucGVlaygpKSwgdGhpcy5fY3Vyc29yLmdldFNwYW4oc3RhcnQpKTtcbiAgICAgIH1cblxuICAgICAgb3BlblRhZ1Rva2VuID0gdGhpcy5fY29uc3VtZVRhZ09wZW5TdGFydChzdGFydCk7XG4gICAgICBwcmVmaXggPSBvcGVuVGFnVG9rZW4ucGFydHNbMF07XG4gICAgICB0YWdOYW1lID0gb3BlblRhZ1Rva2VuLnBhcnRzWzFdO1xuICAgICAgdGhpcy5fYXR0ZW1wdENoYXJDb2RlVW50aWxGbihpc05vdFdoaXRlc3BhY2UpO1xuICAgICAgd2hpbGUgKHRoaXMuX2N1cnNvci5wZWVrKCkgIT09IGNoYXJzLiRTTEFTSCAmJiB0aGlzLl9jdXJzb3IucGVlaygpICE9PSBjaGFycy4kR1QgJiZcbiAgICAgICAgICAgICB0aGlzLl9jdXJzb3IucGVlaygpICE9PSBjaGFycy4kTFQgJiYgdGhpcy5fY3Vyc29yLnBlZWsoKSAhPT0gY2hhcnMuJEVPRikge1xuICAgICAgICB0aGlzLl9jb25zdW1lQXR0cmlidXRlTmFtZSgpO1xuICAgICAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKGlzTm90V2hpdGVzcGFjZSk7XG4gICAgICAgIGlmICh0aGlzLl9hdHRlbXB0Q2hhckNvZGUoY2hhcnMuJEVRKSkge1xuICAgICAgICAgIHRoaXMuX2F0dGVtcHRDaGFyQ29kZVVudGlsRm4oaXNOb3RXaGl0ZXNwYWNlKTtcbiAgICAgICAgICB0aGlzLl9jb25zdW1lQXR0cmlidXRlVmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKGlzTm90V2hpdGVzcGFjZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9jb25zdW1lVGFnT3BlbkVuZCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgX0NvbnRyb2xGbG93RXJyb3IpIHtcbiAgICAgICAgaWYgKG9wZW5UYWdUb2tlbikge1xuICAgICAgICAgIC8vIFdlIGVycm9yZWQgYmVmb3JlIHdlIGNvdWxkIGNsb3NlIHRoZSBvcGVuaW5nIHRhZywgc28gaXQgaXMgaW5jb21wbGV0ZS5cbiAgICAgICAgICBvcGVuVGFnVG9rZW4udHlwZSA9IFRva2VuVHlwZS5JTkNPTVBMRVRFX1RBR19PUEVOO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFdoZW4gdGhlIHN0YXJ0IHRhZyBpcyBpbnZhbGlkLCBhc3N1bWUgd2Ugd2FudCBhIFwiPFwiIGFzIHRleHQuXG4gICAgICAgICAgLy8gQmFjayB0byBiYWNrIHRleHQgdG9rZW5zIGFyZSBtZXJnZWQgYXQgdGhlIGVuZC5cbiAgICAgICAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5URVhULCBzdGFydCk7XG4gICAgICAgICAgdGhpcy5fZW5kVG9rZW4oWyc8J10pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZW50VG9rZW5UeXBlID0gdGhpcy5fZ2V0VGFnRGVmaW5pdGlvbih0YWdOYW1lKS5nZXRDb250ZW50VHlwZShwcmVmaXgpO1xuXG4gICAgaWYgKGNvbnRlbnRUb2tlblR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLlJBV19URVhUKSB7XG4gICAgICB0aGlzLl9jb25zdW1lUmF3VGV4dFdpdGhUYWdDbG9zZShwcmVmaXgsIHRhZ05hbWUsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRlbnRUb2tlblR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLkVTQ0FQQUJMRV9SQVdfVEVYVCkge1xuICAgICAgdGhpcy5fY29uc3VtZVJhd1RleHRXaXRoVGFnQ2xvc2UocHJlZml4LCB0YWdOYW1lLCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jb25zdW1lUmF3VGV4dFdpdGhUYWdDbG9zZShwcmVmaXg6IHN0cmluZywgdGFnTmFtZTogc3RyaW5nLCBjb25zdW1lRW50aXRpZXM6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9jb25zdW1lUmF3VGV4dChjb25zdW1lRW50aXRpZXMsICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5fYXR0ZW1wdENoYXJDb2RlKGNoYXJzLiRMVCkpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICghdGhpcy5fYXR0ZW1wdENoYXJDb2RlKGNoYXJzLiRTTEFTSCkpIHJldHVybiBmYWxzZTtcbiAgICAgIHRoaXMuX2F0dGVtcHRDaGFyQ29kZVVudGlsRm4oaXNOb3RXaGl0ZXNwYWNlKTtcbiAgICAgIGlmICghdGhpcy5fYXR0ZW1wdFN0ckNhc2VJbnNlbnNpdGl2ZSh0YWdOYW1lKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgdGhpcy5fYXR0ZW1wdENoYXJDb2RlVW50aWxGbihpc05vdFdoaXRlc3BhY2UpO1xuICAgICAgcmV0dXJuIHRoaXMuX2F0dGVtcHRDaGFyQ29kZShjaGFycy4kR1QpO1xuICAgIH0pO1xuICAgIHRoaXMuX2JlZ2luVG9rZW4oVG9rZW5UeXBlLlRBR19DTE9TRSk7XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlVW50aWxGbihjb2RlID0+IGNvZGUgPT09IGNoYXJzLiRHVCwgMyk7XG4gICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTsgIC8vIENvbnN1bWUgdGhlIGA+YFxuICAgIHRoaXMuX2VuZFRva2VuKFtwcmVmaXgsIHRhZ05hbWVdKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVUYWdPcGVuU3RhcnQoc3RhcnQ6IENoYXJhY3RlckN1cnNvcik6IFRhZ09wZW5TdGFydFRva2VuIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5UQUdfT1BFTl9TVEFSVCwgc3RhcnQpO1xuICAgIGNvbnN0IHBhcnRzID0gdGhpcy5fY29uc3VtZVByZWZpeEFuZE5hbWUoKTtcbiAgICByZXR1cm4gdGhpcy5fZW5kVG9rZW4ocGFydHMpIGFzIFRhZ09wZW5TdGFydFRva2VuO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZUF0dHJpYnV0ZU5hbWUoKSB7XG4gICAgY29uc3QgYXR0ck5hbWVTdGFydCA9IHRoaXMuX2N1cnNvci5wZWVrKCk7XG4gICAgaWYgKGF0dHJOYW1lU3RhcnQgPT09IGNoYXJzLiRTUSB8fCBhdHRyTmFtZVN0YXJ0ID09PSBjaGFycy4kRFEpIHtcbiAgICAgIHRocm93IHRoaXMuX2NyZWF0ZUVycm9yKF91bmV4cGVjdGVkQ2hhcmFjdGVyRXJyb3JNc2coYXR0ck5hbWVTdGFydCksIHRoaXMuX2N1cnNvci5nZXRTcGFuKCkpO1xuICAgIH1cbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5BVFRSX05BTUUpO1xuICAgIGNvbnN0IHByZWZpeEFuZE5hbWUgPSB0aGlzLl9jb25zdW1lUHJlZml4QW5kTmFtZSgpO1xuICAgIHRoaXMuX2VuZFRva2VuKHByZWZpeEFuZE5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZUF0dHJpYnV0ZVZhbHVlKCkge1xuICAgIGxldCB2YWx1ZTogc3RyaW5nO1xuICAgIGlmICh0aGlzLl9jdXJzb3IucGVlaygpID09PSBjaGFycy4kU1EgfHwgdGhpcy5fY3Vyc29yLnBlZWsoKSA9PT0gY2hhcnMuJERRKSB7XG4gICAgICBjb25zdCBxdW90ZUNoYXIgPSB0aGlzLl9jdXJzb3IucGVlaygpO1xuICAgICAgdGhpcy5fY29uc3VtZVF1b3RlKHF1b3RlQ2hhcik7XG4gICAgICAvLyBJbiBhbiBhdHRyaWJ1dGUgdGhlbiBlbmQgb2YgdGhlIGF0dHJpYnV0ZSB2YWx1ZSBhbmQgdGhlIHByZW1hdHVyZSBlbmQgdG8gYW4gaW50ZXJwb2xhdGlvblxuICAgICAgLy8gYXJlIGJvdGggdHJpZ2dlcmVkIGJ5IHRoZSBgcXVvdGVDaGFyYC5cbiAgICAgIGNvbnN0IGVuZFByZWRpY2F0ZSA9ICgpID0+IHRoaXMuX2N1cnNvci5wZWVrKCkgPT09IHF1b3RlQ2hhcjtcbiAgICAgIHRoaXMuX2NvbnN1bWVXaXRoSW50ZXJwb2xhdGlvbihcbiAgICAgICAgICBUb2tlblR5cGUuQVRUUl9WQUxVRV9URVhULCBUb2tlblR5cGUuQVRUUl9WQUxVRV9JTlRFUlBPTEFUSU9OLCBlbmRQcmVkaWNhdGUsXG4gICAgICAgICAgZW5kUHJlZGljYXRlKTtcbiAgICAgIHRoaXMuX2NvbnN1bWVRdW90ZShxdW90ZUNoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBlbmRQcmVkaWNhdGUgPSAoKSA9PiBpc05hbWVFbmQodGhpcy5fY3Vyc29yLnBlZWsoKSk7XG4gICAgICB0aGlzLl9jb25zdW1lV2l0aEludGVycG9sYXRpb24oXG4gICAgICAgICAgVG9rZW5UeXBlLkFUVFJfVkFMVUVfVEVYVCwgVG9rZW5UeXBlLkFUVFJfVkFMVUVfSU5URVJQT0xBVElPTiwgZW5kUHJlZGljYXRlLFxuICAgICAgICAgIGVuZFByZWRpY2F0ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZVF1b3RlKHF1b3RlQ2hhcjogbnVtYmVyKSB7XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuQVRUUl9RVU9URSk7XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlKHF1b3RlQ2hhcik7XG4gICAgdGhpcy5fZW5kVG9rZW4oW1N0cmluZy5mcm9tQ29kZVBvaW50KHF1b3RlQ2hhcildKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnN1bWVUYWdPcGVuRW5kKCkge1xuICAgIGNvbnN0IHRva2VuVHlwZSA9XG4gICAgICAgIHRoaXMuX2F0dGVtcHRDaGFyQ29kZShjaGFycy4kU0xBU0gpID8gVG9rZW5UeXBlLlRBR19PUEVOX0VORF9WT0lEIDogVG9rZW5UeXBlLlRBR19PUEVOX0VORDtcbiAgICB0aGlzLl9iZWdpblRva2VuKHRva2VuVHlwZSk7XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlKGNoYXJzLiRHVCk7XG4gICAgdGhpcy5fZW5kVG9rZW4oW10pO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZVRhZ0Nsb3NlKHN0YXJ0OiBDaGFyYWN0ZXJDdXJzb3IpIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5UQUdfQ0xPU0UsIHN0YXJ0KTtcbiAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKGlzTm90V2hpdGVzcGFjZSk7XG4gICAgY29uc3QgcHJlZml4QW5kTmFtZSA9IHRoaXMuX2NvbnN1bWVQcmVmaXhBbmROYW1lKCk7XG4gICAgdGhpcy5fYXR0ZW1wdENoYXJDb2RlVW50aWxGbihpc05vdFdoaXRlc3BhY2UpO1xuICAgIHRoaXMuX3JlcXVpcmVDaGFyQ29kZShjaGFycy4kR1QpO1xuICAgIHRoaXMuX2VuZFRva2VuKHByZWZpeEFuZE5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZUV4cGFuc2lvbkZvcm1TdGFydCgpIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5FWFBBTlNJT05fRk9STV9TVEFSVCk7XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlKGNoYXJzLiRMQlJBQ0UpO1xuICAgIHRoaXMuX2VuZFRva2VuKFtdKTtcblxuICAgIHRoaXMuX2V4cGFuc2lvbkNhc2VTdGFjay5wdXNoKFRva2VuVHlwZS5FWFBBTlNJT05fRk9STV9TVEFSVCk7XG5cbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5SQVdfVEVYVCk7XG4gICAgY29uc3QgY29uZGl0aW9uID0gdGhpcy5fcmVhZFVudGlsKGNoYXJzLiRDT01NQSk7XG4gICAgY29uc3Qgbm9ybWFsaXplZENvbmRpdGlvbiA9IHRoaXMuX3Byb2Nlc3NDYXJyaWFnZVJldHVybnMoY29uZGl0aW9uKTtcbiAgICBpZiAodGhpcy5faTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzKSB7XG4gICAgICAvLyBXZSBleHBsaWNpdGx5IHdhbnQgdG8gbm9ybWFsaXplIGxpbmUgZW5kaW5ncyBmb3IgdGhpcyB0ZXh0LlxuICAgICAgdGhpcy5fZW5kVG9rZW4oW25vcm1hbGl6ZWRDb25kaXRpb25dKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2UgYXJlIG5vdCBub3JtYWxpemluZyBsaW5lIGVuZGluZ3MuXG4gICAgICBjb25zdCBjb25kaXRpb25Ub2tlbiA9IHRoaXMuX2VuZFRva2VuKFtjb25kaXRpb25dKTtcbiAgICAgIGlmIChub3JtYWxpemVkQ29uZGl0aW9uICE9PSBjb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5ub25Ob3JtYWxpemVkSWN1RXhwcmVzc2lvbnMucHVzaChjb25kaXRpb25Ub2tlbik7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3JlcXVpcmVDaGFyQ29kZShjaGFycy4kQ09NTUEpO1xuICAgIHRoaXMuX2F0dGVtcHRDaGFyQ29kZVVudGlsRm4oaXNOb3RXaGl0ZXNwYWNlKTtcblxuICAgIHRoaXMuX2JlZ2luVG9rZW4oVG9rZW5UeXBlLlJBV19URVhUKTtcbiAgICBjb25zdCB0eXBlID0gdGhpcy5fcmVhZFVudGlsKGNoYXJzLiRDT01NQSk7XG4gICAgdGhpcy5fZW5kVG9rZW4oW3R5cGVdKTtcbiAgICB0aGlzLl9yZXF1aXJlQ2hhckNvZGUoY2hhcnMuJENPTU1BKTtcbiAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKGlzTm90V2hpdGVzcGFjZSk7XG4gIH1cblxuICBwcml2YXRlIF9jb25zdW1lRXhwYW5zaW9uQ2FzZVN0YXJ0KCkge1xuICAgIHRoaXMuX2JlZ2luVG9rZW4oVG9rZW5UeXBlLkVYUEFOU0lPTl9DQVNFX1ZBTFVFKTtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX3JlYWRVbnRpbChjaGFycy4kTEJSQUNFKS50cmltKCk7XG4gICAgdGhpcy5fZW5kVG9rZW4oW3ZhbHVlXSk7XG4gICAgdGhpcy5fYXR0ZW1wdENoYXJDb2RlVW50aWxGbihpc05vdFdoaXRlc3BhY2UpO1xuXG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuRVhQQU5TSU9OX0NBU0VfRVhQX1NUQVJUKTtcbiAgICB0aGlzLl9yZXF1aXJlQ2hhckNvZGUoY2hhcnMuJExCUkFDRSk7XG4gICAgdGhpcy5fZW5kVG9rZW4oW10pO1xuICAgIHRoaXMuX2F0dGVtcHRDaGFyQ29kZVVudGlsRm4oaXNOb3RXaGl0ZXNwYWNlKTtcblxuICAgIHRoaXMuX2V4cGFuc2lvbkNhc2VTdGFjay5wdXNoKFRva2VuVHlwZS5FWFBBTlNJT05fQ0FTRV9FWFBfU1RBUlQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29uc3VtZUV4cGFuc2lvbkNhc2VFbmQoKSB7XG4gICAgdGhpcy5fYmVnaW5Ub2tlbihUb2tlblR5cGUuRVhQQU5TSU9OX0NBU0VfRVhQX0VORCk7XG4gICAgdGhpcy5fcmVxdWlyZUNoYXJDb2RlKGNoYXJzLiRSQlJBQ0UpO1xuICAgIHRoaXMuX2VuZFRva2VuKFtdKTtcbiAgICB0aGlzLl9hdHRlbXB0Q2hhckNvZGVVbnRpbEZuKGlzTm90V2hpdGVzcGFjZSk7XG5cbiAgICB0aGlzLl9leHBhbnNpb25DYXNlU3RhY2sucG9wKCk7XG4gIH1cblxuICBwcml2YXRlIF9jb25zdW1lRXhwYW5zaW9uRm9ybUVuZCgpIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKFRva2VuVHlwZS5FWFBBTlNJT05fRk9STV9FTkQpO1xuICAgIHRoaXMuX3JlcXVpcmVDaGFyQ29kZShjaGFycy4kUkJSQUNFKTtcbiAgICB0aGlzLl9lbmRUb2tlbihbXSk7XG5cbiAgICB0aGlzLl9leHBhbnNpb25DYXNlU3RhY2sucG9wKCk7XG4gIH1cblxuICAvKipcbiAgICogQ29uc3VtZSBhIHN0cmluZyB0aGF0IG1heSBjb250YWluIGludGVycG9sYXRpb24gZXhwcmVzc2lvbnMuXG4gICAqXG4gICAqIFRoZSBmaXJzdCB0b2tlbiBjb25zdW1lZCB3aWxsIGJlIG9mIGB0b2tlblR5cGVgIGFuZCB0aGVuIHRoZXJlIHdpbGwgYmUgYWx0ZXJuYXRpbmdcbiAgICogYGludGVycG9sYXRpb25Ub2tlblR5cGVgIGFuZCBgdG9rZW5UeXBlYCB0b2tlbnMgdW50aWwgdGhlIGBlbmRQcmVkaWNhdGUoKWAgcmV0dXJucyB0cnVlLlxuICAgKlxuICAgKiBJZiBhbiBpbnRlcnBvbGF0aW9uIHRva2VuIGVuZHMgcHJlbWF0dXJlbHkgaXQgd2lsbCBoYXZlIG5vIGVuZCBtYXJrZXIgaW4gaXRzIGBwYXJ0c2AgYXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSB0ZXh0VG9rZW5UeXBlIHRoZSBraW5kIG9mIHRva2VucyB0byBpbnRlcmxlYXZlIGFyb3VuZCBpbnRlcnBvbGF0aW9uIHRva2Vucy5cbiAgICogQHBhcmFtIGludGVycG9sYXRpb25Ub2tlblR5cGUgdGhlIGtpbmQgb2YgdG9rZW5zIHRoYXQgY29udGFpbiBpbnRlcnBvbGF0aW9uLlxuICAgKiBAcGFyYW0gZW5kUHJlZGljYXRlIGEgZnVuY3Rpb24gdGhhdCBzaG91bGQgcmV0dXJuIHRydWUgd2hlbiB3ZSBzaG91bGQgc3RvcCBjb25zdW1pbmcuXG4gICAqIEBwYXJhbSBlbmRJbnRlcnBvbGF0aW9uIGEgZnVuY3Rpb24gdGhhdCBzaG91bGQgcmV0dXJuIHRydWUgaWYgdGhlcmUgaXMgYSBwcmVtYXR1cmUgZW5kIHRvIGFuXG4gICAqICAgICBpbnRlcnBvbGF0aW9uIGV4cHJlc3Npb24gLSBpLmUuIGJlZm9yZSB3ZSBnZXQgdG8gdGhlIG5vcm1hbCBpbnRlcnBvbGF0aW9uIGNsb3NpbmcgbWFya2VyLlxuICAgKi9cbiAgcHJpdmF0ZSBfY29uc3VtZVdpdGhJbnRlcnBvbGF0aW9uKFxuICAgICAgdGV4dFRva2VuVHlwZTogVG9rZW5UeXBlLCBpbnRlcnBvbGF0aW9uVG9rZW5UeXBlOiBUb2tlblR5cGUsIGVuZFByZWRpY2F0ZTogKCkgPT4gYm9vbGVhbixcbiAgICAgIGVuZEludGVycG9sYXRpb246ICgpID0+IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9iZWdpblRva2VuKHRleHRUb2tlblR5cGUpO1xuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgd2hpbGUgKCFlbmRQcmVkaWNhdGUoKSkge1xuICAgICAgY29uc3QgY3VycmVudCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuICAgICAgaWYgKHRoaXMuX2ludGVycG9sYXRpb25Db25maWcgJiYgdGhpcy5fYXR0ZW1wdFN0cih0aGlzLl9pbnRlcnBvbGF0aW9uQ29uZmlnLnN0YXJ0KSkge1xuICAgICAgICB0aGlzLl9lbmRUb2tlbihbdGhpcy5fcHJvY2Vzc0NhcnJpYWdlUmV0dXJucyhwYXJ0cy5qb2luKCcnKSldLCBjdXJyZW50KTtcbiAgICAgICAgcGFydHMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fY29uc3VtZUludGVycG9sYXRpb24oaW50ZXJwb2xhdGlvblRva2VuVHlwZSwgY3VycmVudCwgZW5kSW50ZXJwb2xhdGlvbik7XG4gICAgICAgIHRoaXMuX2JlZ2luVG9rZW4odGV4dFRva2VuVHlwZSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1cnNvci5wZWVrKCkgPT09IGNoYXJzLiRBTVBFUlNBTkQpIHtcbiAgICAgICAgdGhpcy5fZW5kVG9rZW4oW3RoaXMuX3Byb2Nlc3NDYXJyaWFnZVJldHVybnMocGFydHMuam9pbignJykpXSk7XG4gICAgICAgIHBhcnRzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVFbnRpdHkodGV4dFRva2VuVHlwZSk7XG4gICAgICAgIHRoaXMuX2JlZ2luVG9rZW4odGV4dFRva2VuVHlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJ0cy5wdXNoKHRoaXMuX3JlYWRDaGFyKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEl0IGlzIHBvc3NpYmxlIHRoYXQgYW4gaW50ZXJwb2xhdGlvbiB3YXMgc3RhcnRlZCBidXQgbm90IGVuZGVkIGluc2lkZSB0aGlzIHRleHQgdG9rZW4uXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgd2UgcmVzZXQgdGhlIHN0YXRlIG9mIHRoZSBsZXhlciBjb3JyZWN0bHkuXG4gICAgdGhpcy5faW5JbnRlcnBvbGF0aW9uID0gZmFsc2U7XG5cbiAgICB0aGlzLl9lbmRUb2tlbihbdGhpcy5fcHJvY2Vzc0NhcnJpYWdlUmV0dXJucyhwYXJ0cy5qb2luKCcnKSldKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25zdW1lIGEgYmxvY2sgb2YgdGV4dCB0aGF0IGhhcyBiZWVuIGludGVycHJldGVkIGFzIGFuIEFuZ3VsYXIgaW50ZXJwb2xhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGludGVycG9sYXRpb25Ub2tlblR5cGUgdGhlIHR5cGUgb2YgdGhlIGludGVycG9sYXRpb24gdG9rZW4gdG8gZ2VuZXJhdGUuXG4gICAqIEBwYXJhbSBpbnRlcnBvbGF0aW9uU3RhcnQgYSBjdXJzb3IgdGhhdCBwb2ludHMgdG8gdGhlIHN0YXJ0IG9mIHRoaXMgaW50ZXJwb2xhdGlvbi5cbiAgICogQHBhcmFtIHByZW1hdHVyZUVuZFByZWRpY2F0ZSBhIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIHJldHVybiB0cnVlIGlmIHRoZSBuZXh0IGNoYXJhY3RlcnMgaW5kaWNhdGVcbiAgICogICAgIGFuIGVuZCB0byB0aGUgaW50ZXJwb2xhdGlvbiBiZWZvcmUgaXRzIG5vcm1hbCBjbG9zaW5nIG1hcmtlci5cbiAgICovXG4gIHByaXZhdGUgX2NvbnN1bWVJbnRlcnBvbGF0aW9uKFxuICAgICAgaW50ZXJwb2xhdGlvblRva2VuVHlwZTogVG9rZW5UeXBlLCBpbnRlcnBvbGF0aW9uU3RhcnQ6IENoYXJhY3RlckN1cnNvcixcbiAgICAgIHByZW1hdHVyZUVuZFByZWRpY2F0ZTogKCgpID0+IGJvb2xlYW4pfG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICB0aGlzLl9iZWdpblRva2VuKGludGVycG9sYXRpb25Ub2tlblR5cGUsIGludGVycG9sYXRpb25TdGFydCk7XG4gICAgcGFydHMucHVzaCh0aGlzLl9pbnRlcnBvbGF0aW9uQ29uZmlnLnN0YXJ0KTtcblxuICAgIC8vIEZpbmQgdGhlIGVuZCBvZiB0aGUgaW50ZXJwb2xhdGlvbiwgaWdub3JpbmcgY29udGVudCBpbnNpZGUgcXVvdGVzLlxuICAgIGNvbnN0IGV4cHJlc3Npb25TdGFydCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuICAgIGxldCBpblF1b3RlOiBudW1iZXJ8bnVsbCA9IG51bGw7XG4gICAgbGV0IGluQ29tbWVudCA9IGZhbHNlO1xuICAgIHdoaWxlICh0aGlzLl9jdXJzb3IucGVlaygpICE9PSBjaGFycy4kRU9GICYmXG4gICAgICAgICAgIChwcmVtYXR1cmVFbmRQcmVkaWNhdGUgPT09IG51bGwgfHwgIXByZW1hdHVyZUVuZFByZWRpY2F0ZSgpKSkge1xuICAgICAgY29uc3QgY3VycmVudCA9IHRoaXMuX2N1cnNvci5jbG9uZSgpO1xuXG4gICAgICBpZiAodGhpcy5faXNUYWdTdGFydCgpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBzdGFydGluZyB3aGF0IGxvb2tzIGxpa2UgYW4gSFRNTCBlbGVtZW50IGluIHRoZSBtaWRkbGUgb2YgdGhpcyBpbnRlcnBvbGF0aW9uLlxuICAgICAgICAvLyBSZXNldCB0aGUgY3Vyc29yIHRvIGJlZm9yZSB0aGUgYDxgIGNoYXJhY3RlciBhbmQgZW5kIHRoZSBpbnRlcnBvbGF0aW9uIHRva2VuLlxuICAgICAgICAvLyAoVGhpcyBpcyBhY3R1YWxseSB3cm9uZyBidXQgaGVyZSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSkuXG4gICAgICAgIHRoaXMuX2N1cnNvciA9IGN1cnJlbnQ7XG4gICAgICAgIHBhcnRzLnB1c2godGhpcy5fZ2V0UHJvY2Vzc2VkQ2hhcnMoZXhwcmVzc2lvblN0YXJ0LCBjdXJyZW50KSk7XG4gICAgICAgIHRoaXMuX2VuZFRva2VuKHBhcnRzKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaW5RdW90ZSA9PT0gbnVsbCkge1xuICAgICAgICBpZiAodGhpcy5fYXR0ZW1wdFN0cih0aGlzLl9pbnRlcnBvbGF0aW9uQ29uZmlnLmVuZCkpIHtcbiAgICAgICAgICAvLyBXZSBhcmUgbm90IGluIGEgc3RyaW5nLCBhbmQgd2UgaGl0IHRoZSBlbmQgaW50ZXJwb2xhdGlvbiBtYXJrZXJcbiAgICAgICAgICBwYXJ0cy5wdXNoKHRoaXMuX2dldFByb2Nlc3NlZENoYXJzKGV4cHJlc3Npb25TdGFydCwgY3VycmVudCkpO1xuICAgICAgICAgIHBhcnRzLnB1c2godGhpcy5faW50ZXJwb2xhdGlvbkNvbmZpZy5lbmQpO1xuICAgICAgICAgIHRoaXMuX2VuZFRva2VuKHBhcnRzKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYXR0ZW1wdFN0cignLy8nKSkge1xuICAgICAgICAgIC8vIE9uY2Ugd2UgYXJlIGluIGEgY29tbWVudCB3ZSBpZ25vcmUgYW55IHF1b3Rlc1xuICAgICAgICAgIGluQ29tbWVudCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hhciA9IHRoaXMuX2N1cnNvci5wZWVrKCk7XG4gICAgICB0aGlzLl9jdXJzb3IuYWR2YW5jZSgpO1xuICAgICAgaWYgKGNoYXIgPT09IGNoYXJzLiRCQUNLU0xBU0gpIHtcbiAgICAgICAgLy8gU2tpcCB0aGUgbmV4dCBjaGFyYWN0ZXIgYmVjYXVzZSBpdCB3YXMgZXNjYXBlZC5cbiAgICAgICAgdGhpcy5fY3Vyc29yLmFkdmFuY2UoKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gaW5RdW90ZSkge1xuICAgICAgICAvLyBFeGl0aW5nIHRoZSBjdXJyZW50IHF1b3RlZCBzdHJpbmdcbiAgICAgICAgaW5RdW90ZSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCFpbkNvbW1lbnQgJiYgaW5RdW90ZSA9PT0gbnVsbCAmJiBjaGFycy5pc1F1b3RlKGNoYXIpKSB7XG4gICAgICAgIC8vIEVudGVyaW5nIGEgbmV3IHF1b3RlZCBzdHJpbmdcbiAgICAgICAgaW5RdW90ZSA9IGNoYXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2UgaGl0IEVPRiB3aXRob3V0IGZpbmRpbmcgYSBjbG9zaW5nIGludGVycG9sYXRpb24gbWFya2VyXG4gICAgcGFydHMucHVzaCh0aGlzLl9nZXRQcm9jZXNzZWRDaGFycyhleHByZXNzaW9uU3RhcnQsIHRoaXMuX2N1cnNvcikpO1xuICAgIHRoaXMuX2VuZFRva2VuKHBhcnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2dldFByb2Nlc3NlZENoYXJzKHN0YXJ0OiBDaGFyYWN0ZXJDdXJzb3IsIGVuZDogQ2hhcmFjdGVyQ3Vyc29yKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvY2Vzc0NhcnJpYWdlUmV0dXJucyhlbmQuZ2V0Q2hhcnMoc3RhcnQpKTtcbiAgfVxuXG4gIHByaXZhdGUgX2lzVGV4dEVuZCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5faXNUYWdTdGFydCgpIHx8IHRoaXMuX2N1cnNvci5wZWVrKCkgPT09IGNoYXJzLiRFT0YpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl90b2tlbml6ZUljdSAmJiAhdGhpcy5faW5JbnRlcnBvbGF0aW9uKSB7XG4gICAgICBpZiAodGhpcy5pc0V4cGFuc2lvbkZvcm1TdGFydCgpKSB7XG4gICAgICAgIC8vIHN0YXJ0IG9mIGFuIGV4cGFuc2lvbiBmb3JtXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fY3Vyc29yLnBlZWsoKSA9PT0gY2hhcnMuJFJCUkFDRSAmJiB0aGlzLl9pc0luRXhwYW5zaW9uQ2FzZSgpKSB7XG4gICAgICAgIC8vIGVuZCBvZiBhbmQgZXhwYW5zaW9uIGNhc2VcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgY3VycmVudCBjdXJzb3IgaXMgcG9pbnRpbmcgdG8gdGhlIHN0YXJ0IG9mIGEgdGFnXG4gICAqIChvcGVuaW5nL2Nsb3NpbmcvY29tbWVudHMvY2RhdGEvZXRjKS5cbiAgICovXG4gIHByaXZhdGUgX2lzVGFnU3RhcnQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2N1cnNvci5wZWVrKCkgPT09IGNoYXJzLiRMVCkge1xuICAgICAgLy8gV2UgYXNzdW1lIHRoYXQgYDxgIGZvbGxvd2VkIGJ5IHdoaXRlc3BhY2UgaXMgbm90IHRoZSBzdGFydCBvZiBhbiBIVE1MIGVsZW1lbnQuXG4gICAgICBjb25zdCB0bXAgPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICAgIHRtcC5hZHZhbmNlKCk7XG4gICAgICAvLyBJZiB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgYWxwaGFiZXRpYywgISBub3IgLyB0aGVuIGl0IGlzIGEgdGFnIHN0YXJ0XG4gICAgICBjb25zdCBjb2RlID0gdG1wLnBlZWsoKTtcbiAgICAgIGlmICgoY2hhcnMuJGEgPD0gY29kZSAmJiBjb2RlIDw9IGNoYXJzLiR6KSB8fCAoY2hhcnMuJEEgPD0gY29kZSAmJiBjb2RlIDw9IGNoYXJzLiRaKSB8fFxuICAgICAgICAgIGNvZGUgPT09IGNoYXJzLiRTTEFTSCB8fCBjb2RlID09PSBjaGFycy4kQkFORykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVhZFVudGlsKGNoYXI6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICB0aGlzLl9hdHRlbXB0VW50aWxDaGFyKGNoYXIpO1xuICAgIHJldHVybiB0aGlzLl9jdXJzb3IuZ2V0Q2hhcnMoc3RhcnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaXNJbkV4cGFuc2lvbkNhc2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2V4cGFuc2lvbkNhc2VTdGFjay5sZW5ndGggPiAwICYmXG4gICAgICAgIHRoaXMuX2V4cGFuc2lvbkNhc2VTdGFja1t0aGlzLl9leHBhbnNpb25DYXNlU3RhY2subGVuZ3RoIC0gMV0gPT09XG4gICAgICAgIFRva2VuVHlwZS5FWFBBTlNJT05fQ0FTRV9FWFBfU1RBUlQ7XG4gIH1cblxuICBwcml2YXRlIF9pc0luRXhwYW5zaW9uRm9ybSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZXhwYW5zaW9uQ2FzZVN0YWNrLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgdGhpcy5fZXhwYW5zaW9uQ2FzZVN0YWNrW3RoaXMuX2V4cGFuc2lvbkNhc2VTdGFjay5sZW5ndGggLSAxXSA9PT1cbiAgICAgICAgVG9rZW5UeXBlLkVYUEFOU0lPTl9GT1JNX1NUQVJUO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0V4cGFuc2lvbkZvcm1TdGFydCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5fY3Vyc29yLnBlZWsoKSAhPT0gY2hhcnMuJExCUkFDRSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5faW50ZXJwb2xhdGlvbkNvbmZpZykge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLl9jdXJzb3IuY2xvbmUoKTtcbiAgICAgIGNvbnN0IGlzSW50ZXJwb2xhdGlvbiA9IHRoaXMuX2F0dGVtcHRTdHIodGhpcy5faW50ZXJwb2xhdGlvbkNvbmZpZy5zdGFydCk7XG4gICAgICB0aGlzLl9jdXJzb3IgPSBzdGFydDtcbiAgICAgIHJldHVybiAhaXNJbnRlcnBvbGF0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc05vdFdoaXRlc3BhY2UoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiAhY2hhcnMuaXNXaGl0ZXNwYWNlKGNvZGUpIHx8IGNvZGUgPT09IGNoYXJzLiRFT0Y7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZUVuZChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNoYXJzLmlzV2hpdGVzcGFjZShjb2RlKSB8fCBjb2RlID09PSBjaGFycy4kR1QgfHwgY29kZSA9PT0gY2hhcnMuJExUIHx8XG4gICAgICBjb2RlID09PSBjaGFycy4kU0xBU0ggfHwgY29kZSA9PT0gY2hhcnMuJFNRIHx8IGNvZGUgPT09IGNoYXJzLiREUSB8fCBjb2RlID09PSBjaGFycy4kRVEgfHxcbiAgICAgIGNvZGUgPT09IGNoYXJzLiRFT0Y7XG59XG5cbmZ1bmN0aW9uIGlzUHJlZml4RW5kKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gKGNvZGUgPCBjaGFycy4kYSB8fCBjaGFycy4keiA8IGNvZGUpICYmIChjb2RlIDwgY2hhcnMuJEEgfHwgY2hhcnMuJFogPCBjb2RlKSAmJlxuICAgICAgKGNvZGUgPCBjaGFycy4kMCB8fCBjb2RlID4gY2hhcnMuJDkpO1xufVxuXG5mdW5jdGlvbiBpc0RpZ2l0RW50aXR5RW5kKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29kZSA9PT0gY2hhcnMuJFNFTUlDT0xPTiB8fCBjb2RlID09PSBjaGFycy4kRU9GIHx8ICFjaGFycy5pc0FzY2lpSGV4RGlnaXQoY29kZSk7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZWRFbnRpdHlFbmQoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb2RlID09PSBjaGFycy4kU0VNSUNPTE9OIHx8IGNvZGUgPT09IGNoYXJzLiRFT0YgfHwgIWNoYXJzLmlzQXNjaWlMZXR0ZXIoY29kZSk7XG59XG5cbmZ1bmN0aW9uIGlzRXhwYW5zaW9uQ2FzZVN0YXJ0KHBlZWs6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gcGVlayAhPT0gY2hhcnMuJFJCUkFDRTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZUNoYXJDb2RlQ2FzZUluc2Vuc2l0aXZlKGNvZGUxOiBudW1iZXIsIGNvZGUyOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRvVXBwZXJDYXNlQ2hhckNvZGUoY29kZTEpID09PSB0b1VwcGVyQ2FzZUNoYXJDb2RlKGNvZGUyKTtcbn1cblxuZnVuY3Rpb24gdG9VcHBlckNhc2VDaGFyQ29kZShjb2RlOiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gY29kZSA+PSBjaGFycy4kYSAmJiBjb2RlIDw9IGNoYXJzLiR6ID8gY29kZSAtIGNoYXJzLiRhICsgY2hhcnMuJEEgOiBjb2RlO1xufVxuXG5mdW5jdGlvbiBtZXJnZVRleHRUb2tlbnMoc3JjVG9rZW5zOiBUb2tlbltdKTogVG9rZW5bXSB7XG4gIGNvbnN0IGRzdFRva2VuczogVG9rZW5bXSA9IFtdO1xuICBsZXQgbGFzdERzdFRva2VuOiBUb2tlbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3JjVG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgdG9rZW4gPSBzcmNUb2tlbnNbaV07XG4gICAgaWYgKChsYXN0RHN0VG9rZW4gJiYgbGFzdERzdFRva2VuLnR5cGUgPT09IFRva2VuVHlwZS5URVhUICYmIHRva2VuLnR5cGUgPT09IFRva2VuVHlwZS5URVhUKSB8fFxuICAgICAgICAobGFzdERzdFRva2VuICYmIGxhc3REc3RUb2tlbi50eXBlID09PSBUb2tlblR5cGUuQVRUUl9WQUxVRV9URVhUICYmXG4gICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlblR5cGUuQVRUUl9WQUxVRV9URVhUKSkge1xuICAgICAgbGFzdERzdFRva2VuLnBhcnRzWzBdISArPSB0b2tlbi5wYXJ0c1swXTtcbiAgICAgIGxhc3REc3RUb2tlbi5zb3VyY2VTcGFuLmVuZCA9IHRva2VuLnNvdXJjZVNwYW4uZW5kO1xuICAgIH0gZWxzZSB7XG4gICAgICBsYXN0RHN0VG9rZW4gPSB0b2tlbjtcbiAgICAgIGRzdFRva2Vucy5wdXNoKGxhc3REc3RUb2tlbik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRzdFRva2Vucztcbn1cblxuXG4vKipcbiAqIFRoZSBfVG9rZW5pemVyIHVzZXMgb2JqZWN0cyBvZiB0aGlzIHR5cGUgdG8gbW92ZSB0aHJvdWdoIHRoZSBpbnB1dCB0ZXh0LFxuICogZXh0cmFjdGluZyBcInBhcnNlZCBjaGFyYWN0ZXJzXCIuIFRoZXNlIGNvdWxkIGJlIG1vcmUgdGhhbiBvbmUgYWN0dWFsIGNoYXJhY3RlclxuICogaWYgdGhlIHRleHQgY29udGFpbnMgZXNjYXBlIHNlcXVlbmNlcy5cbiAqL1xuaW50ZXJmYWNlIENoYXJhY3RlckN1cnNvciB7XG4gIC8qKiBJbml0aWFsaXplIHRoZSBjdXJzb3IuICovXG4gIGluaXQoKTogdm9pZDtcbiAgLyoqIFRoZSBwYXJzZWQgY2hhcmFjdGVyIGF0IHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbi4gKi9cbiAgcGVlaygpOiBudW1iZXI7XG4gIC8qKiBBZHZhbmNlIHRoZSBjdXJzb3IgYnkgb25lIHBhcnNlZCBjaGFyYWN0ZXIuICovXG4gIGFkdmFuY2UoKTogdm9pZDtcbiAgLyoqIEdldCBhIHNwYW4gZnJvbSB0aGUgbWFya2VkIHN0YXJ0IHBvaW50IHRvIHRoZSBjdXJyZW50IHBvaW50LiAqL1xuICBnZXRTcGFuKHN0YXJ0PzogdGhpcywgbGVhZGluZ1RyaXZpYUNvZGVQb2ludHM/OiBudW1iZXJbXSk6IFBhcnNlU291cmNlU3BhbjtcbiAgLyoqIEdldCB0aGUgcGFyc2VkIGNoYXJhY3RlcnMgZnJvbSB0aGUgbWFya2VkIHN0YXJ0IHBvaW50IHRvIHRoZSBjdXJyZW50IHBvaW50LiAqL1xuICBnZXRDaGFycyhzdGFydDogdGhpcyk6IHN0cmluZztcbiAgLyoqIFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBsZWZ0IGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBjdXJzb3IuICovXG4gIGNoYXJzTGVmdCgpOiBudW1iZXI7XG4gIC8qKiBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgYmV0d2VlbiBgdGhpc2AgY3Vyc29yIGFuZCBgb3RoZXJgIGN1cnNvci4gKi9cbiAgZGlmZihvdGhlcjogdGhpcyk6IG51bWJlcjtcbiAgLyoqIE1ha2UgYSBjb3B5IG9mIHRoaXMgY3Vyc29yICovXG4gIGNsb25lKCk6IENoYXJhY3RlckN1cnNvcjtcbn1cblxuaW50ZXJmYWNlIEN1cnNvclN0YXRlIHtcbiAgcGVlazogbnVtYmVyO1xuICBvZmZzZXQ6IG51bWJlcjtcbiAgbGluZTogbnVtYmVyO1xuICBjb2x1bW46IG51bWJlcjtcbn1cblxuY2xhc3MgUGxhaW5DaGFyYWN0ZXJDdXJzb3IgaW1wbGVtZW50cyBDaGFyYWN0ZXJDdXJzb3Ige1xuICBwcm90ZWN0ZWQgc3RhdGU6IEN1cnNvclN0YXRlO1xuICBwcm90ZWN0ZWQgZmlsZTogUGFyc2VTb3VyY2VGaWxlO1xuICBwcm90ZWN0ZWQgaW5wdXQ6IHN0cmluZztcbiAgcHJvdGVjdGVkIGVuZDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGZpbGVPckN1cnNvcjogUGxhaW5DaGFyYWN0ZXJDdXJzb3IpO1xuICBjb25zdHJ1Y3RvcihmaWxlT3JDdXJzb3I6IFBhcnNlU291cmNlRmlsZSwgcmFuZ2U6IExleGVyUmFuZ2UpO1xuICBjb25zdHJ1Y3RvcihmaWxlT3JDdXJzb3I6IFBhcnNlU291cmNlRmlsZXxQbGFpbkNoYXJhY3RlckN1cnNvciwgcmFuZ2U/OiBMZXhlclJhbmdlKSB7XG4gICAgaWYgKGZpbGVPckN1cnNvciBpbnN0YW5jZW9mIFBsYWluQ2hhcmFjdGVyQ3Vyc29yKSB7XG4gICAgICB0aGlzLmZpbGUgPSBmaWxlT3JDdXJzb3IuZmlsZTtcbiAgICAgIHRoaXMuaW5wdXQgPSBmaWxlT3JDdXJzb3IuaW5wdXQ7XG4gICAgICB0aGlzLmVuZCA9IGZpbGVPckN1cnNvci5lbmQ7XG5cbiAgICAgIGNvbnN0IHN0YXRlID0gZmlsZU9yQ3Vyc29yLnN0YXRlO1xuICAgICAgLy8gTm90ZTogYXZvaWQgdXNpbmcgYHsuLi5maWxlT3JDdXJzb3Iuc3RhdGV9YCBoZXJlIGFzIHRoYXQgaGFzIGEgc2V2ZXJlIHBlcmZvcm1hbmNlIHBlbmFsdHkuXG4gICAgICAvLyBJbiBFUzUgYnVuZGxlcyB0aGUgb2JqZWN0IHNwcmVhZCBvcGVyYXRvciBpcyB0cmFuc2xhdGVkIGludG8gdGhlIGBfX2Fzc2lnbmAgaGVscGVyLCB3aGljaFxuICAgICAgLy8gaXMgbm90IG9wdGltaXplZCBieSBWTXMgYXMgZWZmaWNpZW50bHkgYXMgYSByYXcgb2JqZWN0IGxpdGVyYWwuIFNpbmNlIHRoaXMgY29uc3RydWN0b3IgaXNcbiAgICAgIC8vIGNhbGxlZCBpbiB0aWdodCBsb29wcywgdGhpcyBkaWZmZXJlbmNlIG1hdHRlcnMuXG4gICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICBwZWVrOiBzdGF0ZS5wZWVrLFxuICAgICAgICBvZmZzZXQ6IHN0YXRlLm9mZnNldCxcbiAgICAgICAgbGluZTogc3RhdGUubGluZSxcbiAgICAgICAgY29sdW1uOiBzdGF0ZS5jb2x1bW4sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXJhbmdlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdQcm9ncmFtbWluZyBlcnJvcjogdGhlIHJhbmdlIGFyZ3VtZW50IG11c3QgYmUgcHJvdmlkZWQgd2l0aCBhIGZpbGUgYXJndW1lbnQuJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmZpbGUgPSBmaWxlT3JDdXJzb3I7XG4gICAgICB0aGlzLmlucHV0ID0gZmlsZU9yQ3Vyc29yLmNvbnRlbnQ7XG4gICAgICB0aGlzLmVuZCA9IHJhbmdlLmVuZFBvcztcbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIHBlZWs6IC0xLFxuICAgICAgICBvZmZzZXQ6IHJhbmdlLnN0YXJ0UG9zLFxuICAgICAgICBsaW5lOiByYW5nZS5zdGFydExpbmUsXG4gICAgICAgIGNvbHVtbjogcmFuZ2Uuc3RhcnRDb2wsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNsb25lKCk6IFBsYWluQ2hhcmFjdGVyQ3Vyc29yIHtcbiAgICByZXR1cm4gbmV3IFBsYWluQ2hhcmFjdGVyQ3Vyc29yKHRoaXMpO1xuICB9XG5cbiAgcGVlaygpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5wZWVrO1xuICB9XG4gIGNoYXJzTGVmdCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbmQgLSB0aGlzLnN0YXRlLm9mZnNldDtcbiAgfVxuICBkaWZmKG90aGVyOiB0aGlzKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUub2Zmc2V0IC0gb3RoZXIuc3RhdGUub2Zmc2V0O1xuICB9XG5cbiAgYWR2YW5jZSgpOiB2b2lkIHtcbiAgICB0aGlzLmFkdmFuY2VTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgfVxuXG4gIGluaXQoKTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGVQZWVrKHRoaXMuc3RhdGUpO1xuICB9XG5cbiAgZ2V0U3BhbihzdGFydD86IHRoaXMsIGxlYWRpbmdUcml2aWFDb2RlUG9pbnRzPzogbnVtYmVyW10pOiBQYXJzZVNvdXJjZVNwYW4ge1xuICAgIHN0YXJ0ID0gc3RhcnQgfHwgdGhpcztcbiAgICBsZXQgZnVsbFN0YXJ0ID0gc3RhcnQ7XG4gICAgaWYgKGxlYWRpbmdUcml2aWFDb2RlUG9pbnRzKSB7XG4gICAgICB3aGlsZSAodGhpcy5kaWZmKHN0YXJ0KSA+IDAgJiYgbGVhZGluZ1RyaXZpYUNvZGVQb2ludHMuaW5kZXhPZihzdGFydC5wZWVrKCkpICE9PSAtMSkge1xuICAgICAgICBpZiAoZnVsbFN0YXJ0ID09PSBzdGFydCkge1xuICAgICAgICAgIHN0YXJ0ID0gc3RhcnQuY2xvbmUoKSBhcyB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHN0YXJ0LmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc3RhcnRMb2NhdGlvbiA9IHRoaXMubG9jYXRpb25Gcm9tQ3Vyc29yKHN0YXJ0KTtcbiAgICBjb25zdCBlbmRMb2NhdGlvbiA9IHRoaXMubG9jYXRpb25Gcm9tQ3Vyc29yKHRoaXMpO1xuICAgIGNvbnN0IGZ1bGxTdGFydExvY2F0aW9uID1cbiAgICAgICAgZnVsbFN0YXJ0ICE9PSBzdGFydCA/IHRoaXMubG9jYXRpb25Gcm9tQ3Vyc29yKGZ1bGxTdGFydCkgOiBzdGFydExvY2F0aW9uO1xuICAgIHJldHVybiBuZXcgUGFyc2VTb3VyY2VTcGFuKHN0YXJ0TG9jYXRpb24sIGVuZExvY2F0aW9uLCBmdWxsU3RhcnRMb2NhdGlvbik7XG4gIH1cblxuICBnZXRDaGFycyhzdGFydDogdGhpcyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuaW5wdXQuc3Vic3RyaW5nKHN0YXJ0LnN0YXRlLm9mZnNldCwgdGhpcy5zdGF0ZS5vZmZzZXQpO1xuICB9XG5cbiAgY2hhckF0KHBvczogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHBvcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYWR2YW5jZVN0YXRlKHN0YXRlOiBDdXJzb3JTdGF0ZSkge1xuICAgIGlmIChzdGF0ZS5vZmZzZXQgPj0gdGhpcy5lbmQpIHtcbiAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICAgIHRocm93IG5ldyBDdXJzb3JFcnJvcignVW5leHBlY3RlZCBjaGFyYWN0ZXIgXCJFT0ZcIicsIHRoaXMpO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50Q2hhciA9IHRoaXMuY2hhckF0KHN0YXRlLm9mZnNldCk7XG4gICAgaWYgKGN1cnJlbnRDaGFyID09PSBjaGFycy4kTEYpIHtcbiAgICAgIHN0YXRlLmxpbmUrKztcbiAgICAgIHN0YXRlLmNvbHVtbiA9IDA7XG4gICAgfSBlbHNlIGlmICghY2hhcnMuaXNOZXdMaW5lKGN1cnJlbnRDaGFyKSkge1xuICAgICAgc3RhdGUuY29sdW1uKys7XG4gICAgfVxuICAgIHN0YXRlLm9mZnNldCsrO1xuICAgIHRoaXMudXBkYXRlUGVlayhzdGF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgdXBkYXRlUGVlayhzdGF0ZTogQ3Vyc29yU3RhdGUpOiB2b2lkIHtcbiAgICBzdGF0ZS5wZWVrID0gc3RhdGUub2Zmc2V0ID49IHRoaXMuZW5kID8gY2hhcnMuJEVPRiA6IHRoaXMuY2hhckF0KHN0YXRlLm9mZnNldCk7XG4gIH1cblxuICBwcml2YXRlIGxvY2F0aW9uRnJvbUN1cnNvcihjdXJzb3I6IHRoaXMpOiBQYXJzZUxvY2F0aW9uIHtcbiAgICByZXR1cm4gbmV3IFBhcnNlTG9jYXRpb24oXG4gICAgICAgIGN1cnNvci5maWxlLCBjdXJzb3Iuc3RhdGUub2Zmc2V0LCBjdXJzb3Iuc3RhdGUubGluZSwgY3Vyc29yLnN0YXRlLmNvbHVtbik7XG4gIH1cbn1cblxuY2xhc3MgRXNjYXBlZENoYXJhY3RlckN1cnNvciBleHRlbmRzIFBsYWluQ2hhcmFjdGVyQ3Vyc29yIHtcbiAgcHJvdGVjdGVkIGludGVybmFsU3RhdGU6IEN1cnNvclN0YXRlO1xuXG4gIGNvbnN0cnVjdG9yKGZpbGVPckN1cnNvcjogRXNjYXBlZENoYXJhY3RlckN1cnNvcik7XG4gIGNvbnN0cnVjdG9yKGZpbGVPckN1cnNvcjogUGFyc2VTb3VyY2VGaWxlLCByYW5nZTogTGV4ZXJSYW5nZSk7XG4gIGNvbnN0cnVjdG9yKGZpbGVPckN1cnNvcjogUGFyc2VTb3VyY2VGaWxlfEVzY2FwZWRDaGFyYWN0ZXJDdXJzb3IsIHJhbmdlPzogTGV4ZXJSYW5nZSkge1xuICAgIGlmIChmaWxlT3JDdXJzb3IgaW5zdGFuY2VvZiBFc2NhcGVkQ2hhcmFjdGVyQ3Vyc29yKSB7XG4gICAgICBzdXBlcihmaWxlT3JDdXJzb3IpO1xuICAgICAgdGhpcy5pbnRlcm5hbFN0YXRlID0gey4uLmZpbGVPckN1cnNvci5pbnRlcm5hbFN0YXRlfTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3VwZXIoZmlsZU9yQ3Vyc29yLCByYW5nZSEpO1xuICAgICAgdGhpcy5pbnRlcm5hbFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBhZHZhbmNlKCk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGUgPSB0aGlzLmludGVybmFsU3RhdGU7XG4gICAgc3VwZXIuYWR2YW5jZSgpO1xuICAgIHRoaXMucHJvY2Vzc0VzY2FwZVNlcXVlbmNlKCk7XG4gIH1cblxuICBvdmVycmlkZSBpbml0KCk6IHZvaWQge1xuICAgIHN1cGVyLmluaXQoKTtcbiAgICB0aGlzLnByb2Nlc3NFc2NhcGVTZXF1ZW5jZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2xvbmUoKTogRXNjYXBlZENoYXJhY3RlckN1cnNvciB7XG4gICAgcmV0dXJuIG5ldyBFc2NhcGVkQ2hhcmFjdGVyQ3Vyc29yKHRoaXMpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q2hhcnMoc3RhcnQ6IHRoaXMpOiBzdHJpbmcge1xuICAgIGNvbnN0IGN1cnNvciA9IHN0YXJ0LmNsb25lKCk7XG4gICAgbGV0IGNoYXJzID0gJyc7XG4gICAgd2hpbGUgKGN1cnNvci5pbnRlcm5hbFN0YXRlLm9mZnNldCA8IHRoaXMuaW50ZXJuYWxTdGF0ZS5vZmZzZXQpIHtcbiAgICAgIGNoYXJzICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGN1cnNvci5wZWVrKCkpO1xuICAgICAgY3Vyc29yLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgdGhlIGVzY2FwZSBzZXF1ZW5jZSB0aGF0IHN0YXJ0cyBhdCB0aGUgY3VycmVudCBwb3NpdGlvbiBpbiB0aGUgdGV4dC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgaXMgY2FsbGVkIHRvIGVuc3VyZSB0aGF0IGBwZWVrYCBoYXMgdGhlIHVuZXNjYXBlZCB2YWx1ZSBvZiBlc2NhcGUgc2VxdWVuY2VzLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByb2Nlc3NFc2NhcGVTZXF1ZW5jZSgpOiB2b2lkIHtcbiAgICBjb25zdCBwZWVrID0gKCkgPT4gdGhpcy5pbnRlcm5hbFN0YXRlLnBlZWs7XG5cbiAgICBpZiAocGVlaygpID09PSBjaGFycy4kQkFDS1NMQVNIKSB7XG4gICAgICAvLyBXZSBoYXZlIGhpdCBhbiBlc2NhcGUgc2VxdWVuY2Ugc28gd2UgbmVlZCB0aGUgaW50ZXJuYWwgc3RhdGUgdG8gYmVjb21lIGluZGVwZW5kZW50XG4gICAgICAvLyBvZiB0aGUgZXh0ZXJuYWwgc3RhdGUuXG4gICAgICB0aGlzLmludGVybmFsU3RhdGUgPSB7Li4udGhpcy5zdGF0ZX07XG5cbiAgICAgIC8vIE1vdmUgcGFzdCB0aGUgYmFja3NsYXNoXG4gICAgICB0aGlzLmFkdmFuY2VTdGF0ZSh0aGlzLmludGVybmFsU3RhdGUpO1xuXG4gICAgICAvLyBGaXJzdCBjaGVjayBmb3Igc3RhbmRhcmQgY29udHJvbCBjaGFyIHNlcXVlbmNlc1xuICAgICAgaWYgKHBlZWsoKSA9PT0gY2hhcnMuJG4pIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5wZWVrID0gY2hhcnMuJExGO1xuICAgICAgfSBlbHNlIGlmIChwZWVrKCkgPT09IGNoYXJzLiRyKSB7XG4gICAgICAgIHRoaXMuc3RhdGUucGVlayA9IGNoYXJzLiRDUjtcbiAgICAgIH0gZWxzZSBpZiAocGVlaygpID09PSBjaGFycy4kdikge1xuICAgICAgICB0aGlzLnN0YXRlLnBlZWsgPSBjaGFycy4kVlRBQjtcbiAgICAgIH0gZWxzZSBpZiAocGVlaygpID09PSBjaGFycy4kdCkge1xuICAgICAgICB0aGlzLnN0YXRlLnBlZWsgPSBjaGFycy4kVEFCO1xuICAgICAgfSBlbHNlIGlmIChwZWVrKCkgPT09IGNoYXJzLiRiKSB7XG4gICAgICAgIHRoaXMuc3RhdGUucGVlayA9IGNoYXJzLiRCU1BBQ0U7XG4gICAgICB9IGVsc2UgaWYgKHBlZWsoKSA9PT0gY2hhcnMuJGYpIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5wZWVrID0gY2hhcnMuJEZGO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3cgY29uc2lkZXIgbW9yZSBjb21wbGV4IHNlcXVlbmNlc1xuICAgICAgZWxzZSBpZiAocGVlaygpID09PSBjaGFycy4kdSkge1xuICAgICAgICAvLyBVbmljb2RlIGNvZGUtcG9pbnQgc2VxdWVuY2VcbiAgICAgICAgdGhpcy5hZHZhbmNlU3RhdGUodGhpcy5pbnRlcm5hbFN0YXRlKTsgIC8vIGFkdmFuY2UgcGFzdCB0aGUgYHVgIGNoYXJcbiAgICAgICAgaWYgKHBlZWsoKSA9PT0gY2hhcnMuJExCUkFDRSkge1xuICAgICAgICAgIC8vIFZhcmlhYmxlIGxlbmd0aCBVbmljb2RlLCBlLmcuIGBcXHh7MTIzfWBcbiAgICAgICAgICB0aGlzLmFkdmFuY2VTdGF0ZSh0aGlzLmludGVybmFsU3RhdGUpOyAgLy8gYWR2YW5jZSBwYXN0IHRoZSBge2AgY2hhclxuICAgICAgICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgdmFyaWFibGUgbnVtYmVyIG9mIGhleCBkaWdpdHMgdW50aWwgd2UgaGl0IGEgYH1gIGNoYXJcbiAgICAgICAgICBjb25zdCBkaWdpdFN0YXJ0ID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICAgIGxldCBsZW5ndGggPSAwO1xuICAgICAgICAgIHdoaWxlIChwZWVrKCkgIT09IGNoYXJzLiRSQlJBQ0UpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZVN0YXRlKHRoaXMuaW50ZXJuYWxTdGF0ZSk7XG4gICAgICAgICAgICBsZW5ndGgrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5zdGF0ZS5wZWVrID0gdGhpcy5kZWNvZGVIZXhEaWdpdHMoZGlnaXRTdGFydCwgbGVuZ3RoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBGaXhlZCBsZW5ndGggVW5pY29kZSwgZS5nLiBgXFx1MTIzNGBcbiAgICAgICAgICBjb25zdCBkaWdpdFN0YXJ0ID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICAgIHRoaXMuYWR2YW5jZVN0YXRlKHRoaXMuaW50ZXJuYWxTdGF0ZSk7XG4gICAgICAgICAgdGhpcy5hZHZhbmNlU3RhdGUodGhpcy5pbnRlcm5hbFN0YXRlKTtcbiAgICAgICAgICB0aGlzLmFkdmFuY2VTdGF0ZSh0aGlzLmludGVybmFsU3RhdGUpO1xuICAgICAgICAgIHRoaXMuc3RhdGUucGVlayA9IHRoaXMuZGVjb2RlSGV4RGlnaXRzKGRpZ2l0U3RhcnQsIDQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVsc2UgaWYgKHBlZWsoKSA9PT0gY2hhcnMuJHgpIHtcbiAgICAgICAgLy8gSGV4IGNoYXIgY29kZSwgZS5nLiBgXFx4MkZgXG4gICAgICAgIHRoaXMuYWR2YW5jZVN0YXRlKHRoaXMuaW50ZXJuYWxTdGF0ZSk7ICAvLyBhZHZhbmNlIHBhc3QgdGhlIGB4YCBjaGFyXG4gICAgICAgIGNvbnN0IGRpZ2l0U3RhcnQgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIHRoaXMuYWR2YW5jZVN0YXRlKHRoaXMuaW50ZXJuYWxTdGF0ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUucGVlayA9IHRoaXMuZGVjb2RlSGV4RGlnaXRzKGRpZ2l0U3RhcnQsIDIpO1xuICAgICAgfVxuXG4gICAgICBlbHNlIGlmIChjaGFycy5pc09jdGFsRGlnaXQocGVlaygpKSkge1xuICAgICAgICAvLyBPY3RhbCBjaGFyIGNvZGUsIGUuZy4gYFxcMDEyYCxcbiAgICAgICAgbGV0IG9jdGFsID0gJyc7XG4gICAgICAgIGxldCBsZW5ndGggPSAwO1xuICAgICAgICBsZXQgcHJldmlvdXMgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIHdoaWxlIChjaGFycy5pc09jdGFsRGlnaXQocGVlaygpKSAmJiBsZW5ndGggPCAzKSB7XG4gICAgICAgICAgcHJldmlvdXMgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgICAgb2N0YWwgKz0gU3RyaW5nLmZyb21Db2RlUG9pbnQocGVlaygpKTtcbiAgICAgICAgICB0aGlzLmFkdmFuY2VTdGF0ZSh0aGlzLmludGVybmFsU3RhdGUpO1xuICAgICAgICAgIGxlbmd0aCsrO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGUucGVlayA9IHBhcnNlSW50KG9jdGFsLCA4KTtcbiAgICAgICAgLy8gQmFja3VwIG9uZSBjaGFyXG4gICAgICAgIHRoaXMuaW50ZXJuYWxTdGF0ZSA9IHByZXZpb3VzLmludGVybmFsU3RhdGU7XG4gICAgICB9XG5cbiAgICAgIGVsc2UgaWYgKGNoYXJzLmlzTmV3TGluZSh0aGlzLmludGVybmFsU3RhdGUucGVlaykpIHtcbiAgICAgICAgLy8gTGluZSBjb250aW51YXRpb24gYFxcYCBmb2xsb3dlZCBieSBhIG5ldyBsaW5lXG4gICAgICAgIHRoaXMuYWR2YW5jZVN0YXRlKHRoaXMuaW50ZXJuYWxTdGF0ZSk7ICAvLyBhZHZhbmNlIG92ZXIgdGhlIG5ld2xpbmVcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuaW50ZXJuYWxTdGF0ZTtcbiAgICAgIH1cblxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIElmIG5vbmUgb2YgdGhlIGBpZmAgYmxvY2tzIHdlcmUgZXhlY3V0ZWQgdGhlbiB3ZSBqdXN0IGhhdmUgYW4gZXNjYXBlZCBub3JtYWwgY2hhcmFjdGVyLlxuICAgICAgICAvLyBJbiB0aGF0IGNhc2Ugd2UganVzdCwgZWZmZWN0aXZlbHksIHNraXAgdGhlIGJhY2tzbGFzaCBmcm9tIHRoZSBjaGFyYWN0ZXIuXG4gICAgICAgIHRoaXMuc3RhdGUucGVlayA9IHRoaXMuaW50ZXJuYWxTdGF0ZS5wZWVrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBkZWNvZGVIZXhEaWdpdHMoc3RhcnQ6IEVzY2FwZWRDaGFyYWN0ZXJDdXJzb3IsIGxlbmd0aDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBoZXggPSB0aGlzLmlucHV0LnN1YnN0cihzdGFydC5pbnRlcm5hbFN0YXRlLm9mZnNldCwgbGVuZ3RoKTtcbiAgICBjb25zdCBjaGFyQ29kZSA9IHBhcnNlSW50KGhleCwgMTYpO1xuICAgIGlmICghaXNOYU4oY2hhckNvZGUpKSB7XG4gICAgICByZXR1cm4gY2hhckNvZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0LnN0YXRlID0gc3RhcnQuaW50ZXJuYWxTdGF0ZTtcbiAgICAgIHRocm93IG5ldyBDdXJzb3JFcnJvcignSW52YWxpZCBoZXhhZGVjaW1hbCBlc2NhcGUgc2VxdWVuY2UnLCBzdGFydCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDdXJzb3JFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBtc2c6IHN0cmluZywgcHVibGljIGN1cnNvcjogQ2hhcmFjdGVyQ3Vyc29yKSB7fVxufVxuIl19