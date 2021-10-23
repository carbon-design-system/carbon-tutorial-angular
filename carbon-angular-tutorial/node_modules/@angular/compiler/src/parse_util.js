(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler/src/parse_util", ["require", "exports", "@angular/compiler/src/aot/static_symbol", "@angular/compiler/src/chars", "@angular/compiler/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sanitizeIdentifier = exports.identifierModuleUrl = exports.identifierName = exports.getParseErrors = exports.isSyntaxError = exports.syntaxError = exports.r3JitTypeSourceSpan = exports.typeSourceSpan = exports.ParseError = exports.ParseErrorLevel = exports.ParseSourceSpan = exports.ParseSourceFile = exports.ParseLocation = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var static_symbol_1 = require("@angular/compiler/src/aot/static_symbol");
    var chars = require("@angular/compiler/src/chars");
    var util_1 = require("@angular/compiler/src/util");
    var ParseLocation = /** @class */ (function () {
        function ParseLocation(file, offset, line, col) {
            this.file = file;
            this.offset = offset;
            this.line = line;
            this.col = col;
        }
        ParseLocation.prototype.toString = function () {
            return this.offset != null ? this.file.url + "@" + this.line + ":" + this.col : this.file.url;
        };
        ParseLocation.prototype.moveBy = function (delta) {
            var source = this.file.content;
            var len = source.length;
            var offset = this.offset;
            var line = this.line;
            var col = this.col;
            while (offset > 0 && delta < 0) {
                offset--;
                delta++;
                var ch = source.charCodeAt(offset);
                if (ch == chars.$LF) {
                    line--;
                    var priorLine = source.substr(0, offset - 1).lastIndexOf(String.fromCharCode(chars.$LF));
                    col = priorLine > 0 ? offset - priorLine : offset;
                }
                else {
                    col--;
                }
            }
            while (offset < len && delta > 0) {
                var ch = source.charCodeAt(offset);
                offset++;
                delta--;
                if (ch == chars.$LF) {
                    line++;
                    col = 0;
                }
                else {
                    col++;
                }
            }
            return new ParseLocation(this.file, offset, line, col);
        };
        // Return the source around the location
        // Up to `maxChars` or `maxLines` on each side of the location
        ParseLocation.prototype.getContext = function (maxChars, maxLines) {
            var content = this.file.content;
            var startOffset = this.offset;
            if (startOffset != null) {
                if (startOffset > content.length - 1) {
                    startOffset = content.length - 1;
                }
                var endOffset = startOffset;
                var ctxChars = 0;
                var ctxLines = 0;
                while (ctxChars < maxChars && startOffset > 0) {
                    startOffset--;
                    ctxChars++;
                    if (content[startOffset] == '\n') {
                        if (++ctxLines == maxLines) {
                            break;
                        }
                    }
                }
                ctxChars = 0;
                ctxLines = 0;
                while (ctxChars < maxChars && endOffset < content.length - 1) {
                    endOffset++;
                    ctxChars++;
                    if (content[endOffset] == '\n') {
                        if (++ctxLines == maxLines) {
                            break;
                        }
                    }
                }
                return {
                    before: content.substring(startOffset, this.offset),
                    after: content.substring(this.offset, endOffset + 1),
                };
            }
            return null;
        };
        return ParseLocation;
    }());
    exports.ParseLocation = ParseLocation;
    var ParseSourceFile = /** @class */ (function () {
        function ParseSourceFile(content, url) {
            this.content = content;
            this.url = url;
        }
        return ParseSourceFile;
    }());
    exports.ParseSourceFile = ParseSourceFile;
    var ParseSourceSpan = /** @class */ (function () {
        /**
         * Create an object that holds information about spans of tokens/nodes captured during
         * lexing/parsing of text.
         *
         * @param start
         * The location of the start of the span (having skipped leading trivia).
         * Skipping leading trivia makes source-spans more "user friendly", since things like HTML
         * elements will appear to begin at the start of the opening tag, rather than at the start of any
         * leading trivia, which could include newlines.
         *
         * @param end
         * The location of the end of the span.
         *
         * @param fullStart
         * The start of the token without skipping the leading trivia.
         * This is used by tooling that splits tokens further, such as extracting Angular interpolations
         * from text tokens. Such tooling creates new source-spans relative to the original token's
         * source-span. If leading trivia characters have been skipped then the new source-spans may be
         * incorrectly offset.
         *
         * @param details
         * Additional information (such as identifier names) that should be associated with the span.
         */
        function ParseSourceSpan(start, end, fullStart, details) {
            if (fullStart === void 0) { fullStart = start; }
            if (details === void 0) { details = null; }
            this.start = start;
            this.end = end;
            this.fullStart = fullStart;
            this.details = details;
        }
        ParseSourceSpan.prototype.toString = function () {
            return this.start.file.content.substring(this.start.offset, this.end.offset);
        };
        return ParseSourceSpan;
    }());
    exports.ParseSourceSpan = ParseSourceSpan;
    var ParseErrorLevel;
    (function (ParseErrorLevel) {
        ParseErrorLevel[ParseErrorLevel["WARNING"] = 0] = "WARNING";
        ParseErrorLevel[ParseErrorLevel["ERROR"] = 1] = "ERROR";
    })(ParseErrorLevel = exports.ParseErrorLevel || (exports.ParseErrorLevel = {}));
    var ParseError = /** @class */ (function () {
        function ParseError(span, msg, level) {
            if (level === void 0) { level = ParseErrorLevel.ERROR; }
            this.span = span;
            this.msg = msg;
            this.level = level;
        }
        ParseError.prototype.contextualMessage = function () {
            var ctx = this.span.start.getContext(100, 3);
            return ctx ? this.msg + " (\"" + ctx.before + "[" + ParseErrorLevel[this.level] + " ->]" + ctx.after + "\")" :
                this.msg;
        };
        ParseError.prototype.toString = function () {
            var details = this.span.details ? ", " + this.span.details : '';
            return this.contextualMessage() + ": " + this.span.start + details;
        };
        return ParseError;
    }());
    exports.ParseError = ParseError;
    function typeSourceSpan(kind, type) {
        var moduleUrl = identifierModuleUrl(type);
        var sourceFileName = moduleUrl != null ? "in " + kind + " " + identifierName(type) + " in " + moduleUrl :
            "in " + kind + " " + identifierName(type);
        var sourceFile = new ParseSourceFile('', sourceFileName);
        return new ParseSourceSpan(new ParseLocation(sourceFile, -1, -1, -1), new ParseLocation(sourceFile, -1, -1, -1));
    }
    exports.typeSourceSpan = typeSourceSpan;
    /**
     * Generates Source Span object for a given R3 Type for JIT mode.
     *
     * @param kind Component or Directive.
     * @param typeName name of the Component or Directive.
     * @param sourceUrl reference to Component or Directive source.
     * @returns instance of ParseSourceSpan that represent a given Component or Directive.
     */
    function r3JitTypeSourceSpan(kind, typeName, sourceUrl) {
        var sourceFileName = "in " + kind + " " + typeName + " in " + sourceUrl;
        var sourceFile = new ParseSourceFile('', sourceFileName);
        return new ParseSourceSpan(new ParseLocation(sourceFile, -1, -1, -1), new ParseLocation(sourceFile, -1, -1, -1));
    }
    exports.r3JitTypeSourceSpan = r3JitTypeSourceSpan;
    function syntaxError(msg, parseErrors) {
        var error = Error(msg);
        error[ERROR_SYNTAX_ERROR] = true;
        if (parseErrors)
            error[ERROR_PARSE_ERRORS] = parseErrors;
        return error;
    }
    exports.syntaxError = syntaxError;
    var ERROR_SYNTAX_ERROR = 'ngSyntaxError';
    var ERROR_PARSE_ERRORS = 'ngParseErrors';
    function isSyntaxError(error) {
        return error[ERROR_SYNTAX_ERROR];
    }
    exports.isSyntaxError = isSyntaxError;
    function getParseErrors(error) {
        return error[ERROR_PARSE_ERRORS] || [];
    }
    exports.getParseErrors = getParseErrors;
    var _anonymousTypeIndex = 0;
    function identifierName(compileIdentifier) {
        if (!compileIdentifier || !compileIdentifier.reference) {
            return null;
        }
        var ref = compileIdentifier.reference;
        if (ref instanceof static_symbol_1.StaticSymbol) {
            return ref.name;
        }
        if (ref['__anonymousType']) {
            return ref['__anonymousType'];
        }
        if (ref['__forward_ref__']) {
            // We do not want to try to stringify a `forwardRef()` function because that would cause the
            // inner function to be evaluated too early, defeating the whole point of the `forwardRef`.
            return '__forward_ref__';
        }
        var identifier = util_1.stringify(ref);
        if (identifier.indexOf('(') >= 0) {
            // case: anonymous functions!
            identifier = "anonymous_" + _anonymousTypeIndex++;
            ref['__anonymousType'] = identifier;
        }
        else {
            identifier = sanitizeIdentifier(identifier);
        }
        return identifier;
    }
    exports.identifierName = identifierName;
    function identifierModuleUrl(compileIdentifier) {
        var ref = compileIdentifier.reference;
        if (ref instanceof static_symbol_1.StaticSymbol) {
            return ref.filePath;
        }
        // Runtime type
        return "./" + util_1.stringify(ref);
    }
    exports.identifierModuleUrl = identifierModuleUrl;
    function sanitizeIdentifier(name) {
        return name.replace(/\W/g, '_');
    }
    exports.sanitizeIdentifier = sanitizeIdentifier;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VfdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9wYXJzZV91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHlFQUFpRDtJQUNqRCxtREFBaUM7SUFDakMsbURBQWlDO0lBRWpDO1FBQ0UsdUJBQ1csSUFBcUIsRUFBUyxNQUFjLEVBQVMsSUFBWSxFQUNqRSxHQUFXO1lBRFgsU0FBSSxHQUFKLElBQUksQ0FBaUI7WUFBUyxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUNqRSxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQUcsQ0FBQztRQUUxQixnQ0FBUSxHQUFSO1lBQ0UsT0FBTyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQUksSUFBSSxDQUFDLElBQUksU0FBSSxJQUFJLENBQUMsR0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUMzRixDQUFDO1FBRUQsOEJBQU0sR0FBTixVQUFPLEtBQWE7WUFDbEIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDakMsSUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUMxQixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3pCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDckIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNuQixPQUFPLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsS0FBSyxFQUFFLENBQUM7Z0JB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QUMsaUJBQTRDO1FBQzlFLElBQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztRQUN4QyxJQUFJLEdBQUcsWUFBWSw0QkFBWSxFQUFFO1lBQy9CLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQztTQUNyQjtRQUNELGVBQWU7UUFDZixPQUFPLE9BQUssZ0JBQVMsQ0FBQyxHQUFHLENBQUcsQ0FBQztJQUMvQixDQUFDO0lBUEQsa0RBT0M7SUFNRCxTQUFnQixrQkFBa0IsQ0FBQyxJQUFZO1FBQzdDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUZELGdEQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1N0YXRpY1N5bWJvbH0gZnJvbSAnLi9hb3Qvc3RhdGljX3N5bWJvbCc7XG5pbXBvcnQgKiBhcyBjaGFycyBmcm9tICcuL2NoYXJzJztcbmltcG9ydCB7c3RyaW5naWZ5fSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgY2xhc3MgUGFyc2VMb2NhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIGZpbGU6IFBhcnNlU291cmNlRmlsZSwgcHVibGljIG9mZnNldDogbnVtYmVyLCBwdWJsaWMgbGluZTogbnVtYmVyLFxuICAgICAgcHVibGljIGNvbDogbnVtYmVyKSB7fVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub2Zmc2V0ICE9IG51bGwgPyBgJHt0aGlzLmZpbGUudXJsfUAke3RoaXMubGluZX06JHt0aGlzLmNvbH1gIDogdGhpcy5maWxlLnVybDtcbiAgfVxuXG4gIG1vdmVCeShkZWx0YTogbnVtYmVyKTogUGFyc2VMb2NhdGlvbiB7XG4gICAgY29uc3Qgc291cmNlID0gdGhpcy5maWxlLmNvbnRlbnQ7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBsZXQgb2Zmc2V0ID0gdGhpcy5vZmZzZXQ7XG4gICAgbGV0IGxpbmUgPSB0aGlzLmxpbmU7XG4gICAgbGV0IGNvbCA9IHRoaXMuY29sO1xuICAgIHdoaWxlIChvZmZzZXQgPiAwICYmIGRlbHRhIDwgMCkge1xuICAgICAgb2Zmc2V0LS07XG4gICAgICBkZWx0YSsrO1xuICAgICAgY29uc3QgY2ggPSBzb3VyY2UuY2hhckNvZGVBdChvZmZzZXQpO1xuICAgICAgaWYgKGNoID09IGNoYXJzLiRMRikge1xuICAgICAgICBsaW5lLS07XG4gICAgICAgIGNvbnN0IHByaW9yTGluZSA9IHNvdXJjZS5zdWJzdHIoMCwgb2Zmc2V0IC0gMSkubGFzdEluZGV4T2YoU3RyaW5nLmZyb21DaGFyQ29kZShjaGFycy4kTEYpKTtcbiAgICAgICAgY29sID0gcHJpb3JMaW5lID4gMCA/IG9mZnNldCAtIHByaW9yTGluZSA6IG9mZnNldDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbC0tO1xuICAgICAgfVxuICAgIH1cbiAgICB3aGlsZSAob2Zmc2V0IDwgbGVuICYmIGRlbHRhID4gMCkge1xuICAgICAgY29uc3QgY2ggPSBzb3VyY2UuY2hhckNvZGVBdChvZmZzZXQpO1xuICAgICAgb2Zmc2V0Kys7XG4gICAgICBkZWx0YS0tO1xuICAgICAgaWYgKGNoID09IGNoYXJzLiRMRikge1xuICAgICAgICBsaW5lKys7XG4gICAgICAgIGNvbCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2wrKztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQYXJzZUxvY2F0aW9uKHRoaXMuZmlsZSwgb2Zmc2V0LCBsaW5lLCBjb2wpO1xuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBzb3VyY2UgYXJvdW5kIHRoZSBsb2NhdGlvblxuICAvLyBVcCB0byBgbWF4Q2hhcnNgIG9yIGBtYXhMaW5lc2Agb24gZWFjaCBzaWRlIG9mIHRoZSBsb2NhdGlvblxuICBnZXRDb250ZXh0KG1heENoYXJzOiBudW1iZXIsIG1heExpbmVzOiBudW1iZXIpOiB7YmVmb3JlOiBzdHJpbmcsIGFmdGVyOiBzdHJpbmd9fG51bGwge1xuICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmZpbGUuY29udGVudDtcbiAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aGlzLm9mZnNldDtcblxuICAgIGlmIChzdGFydE9mZnNldCAhPSBudWxsKSB7XG4gICAgICBpZiAoc3RhcnRPZmZzZXQgPiBjb250ZW50Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgc3RhcnRPZmZzZXQgPSBjb250ZW50Lmxlbmd0aCAtIDE7XG4gICAgICB9XG4gICAgICBsZXQgZW5kT2Zmc2V0ID0gc3RhcnRPZmZzZXQ7XG4gICAgICBsZXQgY3R4Q2hhcnMgPSAwO1xuICAgICAgbGV0IGN0eExpbmVzID0gMDtcblxuICAgICAgd2hpbGUgKGN0eENoYXJzIDwgbWF4Q2hhcnMgJiYgc3RhcnRPZmZzZXQgPiAwKSB7XG4gICAgICAgIHN0YXJ0T2Zmc2V0LS07XG4gICAgICAgIGN0eENoYXJzKys7XG4gICAgICAgIGlmIChjb250ZW50W3N0YXJ0T2Zmc2V0XSA9PSAnXFxuJykge1xuICAgICAgICAgIGlmICgrK2N0eExpbmVzID09IG1heExpbmVzKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY3R4Q2hhcnMgPSAwO1xuICAgICAgY3R4TGluZXMgPSAwO1xuICAgICAgd2hpbGUgKGN0eENoYXJzIDwgbWF4Q2hhcnMgJiYgZW5kT2Zmc2V0IDwgY29udGVudC5sZW5ndGggLSAxKSB7XG4gICAgICAgIGVuZE9mZnNldCsrO1xuICAgICAgICBjdHhDaGFycysrO1xuICAgICAgICBpZiAoY29udGVudFtlbmRPZmZzZXRdID09ICdcXG4nKSB7XG4gICAgICAgICAgaWYgKCsrY3R4TGluZXMgPT0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBiZWZvcmU6IGNvbnRlbnQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCB0aGlzLm9mZnNldCksXG4gICAgICAgIGFmdGVyOiBjb250ZW50LnN1YnN0cmluZyh0aGlzLm9mZnNldCwgZW5kT2Zmc2V0ICsgMSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJzZVNvdXJjZUZpbGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29udGVudDogc3RyaW5nLCBwdWJsaWMgdXJsOiBzdHJpbmcpIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJzZVNvdXJjZVNwYW4ge1xuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0aGF0IGhvbGRzIGluZm9ybWF0aW9uIGFib3V0IHNwYW5zIG9mIHRva2Vucy9ub2RlcyBjYXB0dXJlZCBkdXJpbmdcbiAgICogbGV4aW5nL3BhcnNpbmcgb2YgdGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHN0YXJ0XG4gICAqIFRoZSBsb2NhdGlvbiBvZiB0aGUgc3RhcnQgb2YgdGhlIHNwYW4gKGhhdmluZyBza2lwcGVkIGxlYWRpbmcgdHJpdmlhKS5cbiAgICogU2tpcHBpbmcgbGVhZGluZyB0cml2aWEgbWFrZXMgc291cmNlLXNwYW5zIG1vcmUgXCJ1c2VyIGZyaWVuZGx5XCIsIHNpbmNlIHRoaW5ncyBsaWtlIEhUTUxcbiAgICogZWxlbWVudHMgd2lsbCBhcHBlYXIgdG8gYmVnaW4gYXQgdGhlIHN0YXJ0IG9mIHRoZSBvcGVuaW5nIHRhZywgcmF0aGVyIHRoYW4gYXQgdGhlIHN0YXJ0IG9mIGFueVxuICAgKiBsZWFkaW5nIHRyaXZpYSwgd2hpY2ggY291bGQgaW5jbHVkZSBuZXdsaW5lcy5cbiAgICpcbiAgICogQHBhcmFtIGVuZFxuICAgKiBUaGUgbG9jYXRpb24gb2YgdGhlIGVuZCBvZiB0aGUgc3Bhbi5cbiAgICpcbiAgICogQHBhcmFtIGZ1bGxTdGFydFxuICAgKiBUaGUgc3RhcnQgb2YgdGhlIHRva2VuIHdpdGhvdXQgc2tpcHBpbmcgdGhlIGxlYWRpbmcgdHJpdmlhLlxuICAgKiBUaGlzIGlzIHVzZWQgYnkgdG9vbGluZyB0aGF0IHNwbGl0cyB0b2tlbnMgZnVydGhlciwgc3VjaCBhcyBleHRyYWN0aW5nIEFuZ3VsYXIgaW50ZXJwb2xhdGlvbnNcbiAgICogZnJvbSB0ZXh0IHRva2Vucy4gU3VjaCB0b29saW5nIGNyZWF0ZXMgbmV3IHNvdXJjZS1zcGFucyByZWxhdGl2ZSB0byB0aGUgb3JpZ2luYWwgdG9rZW4nc1xuICAgKiBzb3VyY2Utc3Bhbi4gSWYgbGVhZGluZyB0cml2aWEgY2hhcmFjdGVycyBoYXZlIGJlZW4gc2tpcHBlZCB0aGVuIHRoZSBuZXcgc291cmNlLXNwYW5zIG1heSBiZVxuICAgKiBpbmNvcnJlY3RseSBvZmZzZXQuXG4gICAqXG4gICAqIEBwYXJhbSBkZXRhaWxzXG4gICAqIEFkZGl0aW9uYWwgaW5mb3JtYXRpb24gKHN1Y2ggYXMgaWRlbnRpZmllciBuYW1lcykgdGhhdCBzaG91bGQgYmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBzcGFuLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgc3RhcnQ6IFBhcnNlTG9jYXRpb24sIHB1YmxpYyBlbmQ6IFBhcnNlTG9jYXRpb24sXG4gICAgICBwdWJsaWMgZnVsbFN0YXJ0OiBQYXJzZUxvY2F0aW9uID0gc3RhcnQsIHB1YmxpYyBkZXRhaWxzOiBzdHJpbmd8bnVsbCA9IG51bGwpIHt9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zdGFydC5maWxlLmNvbnRlbnQuc3Vic3RyaW5nKHRoaXMuc3RhcnQub2Zmc2V0LCB0aGlzLmVuZC5vZmZzZXQpO1xuICB9XG59XG5cbmV4cG9ydCBlbnVtIFBhcnNlRXJyb3JMZXZlbCB7XG4gIFdBUk5JTkcsXG4gIEVSUk9SLFxufVxuXG5leHBvcnQgY2xhc3MgUGFyc2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIHNwYW46IFBhcnNlU291cmNlU3BhbiwgcHVibGljIG1zZzogc3RyaW5nLFxuICAgICAgcHVibGljIGxldmVsOiBQYXJzZUVycm9yTGV2ZWwgPSBQYXJzZUVycm9yTGV2ZWwuRVJST1IpIHt9XG5cbiAgY29udGV4dHVhbE1lc3NhZ2UoKTogc3RyaW5nIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLnNwYW4uc3RhcnQuZ2V0Q29udGV4dCgxMDAsIDMpO1xuICAgIHJldHVybiBjdHggPyBgJHt0aGlzLm1zZ30gKFwiJHtjdHguYmVmb3JlfVske1BhcnNlRXJyb3JMZXZlbFt0aGlzLmxldmVsXX0gLT5dJHtjdHguYWZ0ZXJ9XCIpYCA6XG4gICAgICAgICAgICAgICAgIHRoaXMubXNnO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBkZXRhaWxzID0gdGhpcy5zcGFuLmRldGFpbHMgPyBgLCAke3RoaXMuc3Bhbi5kZXRhaWxzfWAgOiAnJztcbiAgICByZXR1cm4gYCR7dGhpcy5jb250ZXh0dWFsTWVzc2FnZSgpfTogJHt0aGlzLnNwYW4uc3RhcnR9JHtkZXRhaWxzfWA7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVTb3VyY2VTcGFuKGtpbmQ6IHN0cmluZywgdHlwZTogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSk6IFBhcnNlU291cmNlU3BhbiB7XG4gIGNvbnN0IG1vZHVsZVVybCA9IGlkZW50aWZpZXJNb2R1bGVVcmwodHlwZSk7XG4gIGNvbnN0IHNvdXJjZUZpbGVOYW1lID0gbW9kdWxlVXJsICE9IG51bGwgPyBgaW4gJHtraW5kfSAke2lkZW50aWZpZXJOYW1lKHR5cGUpfSBpbiAke21vZHVsZVVybH1gIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBpbiAke2tpbmR9ICR7aWRlbnRpZmllck5hbWUodHlwZSl9YDtcbiAgY29uc3Qgc291cmNlRmlsZSA9IG5ldyBQYXJzZVNvdXJjZUZpbGUoJycsIHNvdXJjZUZpbGVOYW1lKTtcbiAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICBuZXcgUGFyc2VMb2NhdGlvbihzb3VyY2VGaWxlLCAtMSwgLTEsIC0xKSwgbmV3IFBhcnNlTG9jYXRpb24oc291cmNlRmlsZSwgLTEsIC0xLCAtMSkpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBTb3VyY2UgU3BhbiBvYmplY3QgZm9yIGEgZ2l2ZW4gUjMgVHlwZSBmb3IgSklUIG1vZGUuXG4gKlxuICogQHBhcmFtIGtpbmQgQ29tcG9uZW50IG9yIERpcmVjdGl2ZS5cbiAqIEBwYXJhbSB0eXBlTmFtZSBuYW1lIG9mIHRoZSBDb21wb25lbnQgb3IgRGlyZWN0aXZlLlxuICogQHBhcmFtIHNvdXJjZVVybCByZWZlcmVuY2UgdG8gQ29tcG9uZW50IG9yIERpcmVjdGl2ZSBzb3VyY2UuXG4gKiBAcmV0dXJucyBpbnN0YW5jZSBvZiBQYXJzZVNvdXJjZVNwYW4gdGhhdCByZXByZXNlbnQgYSBnaXZlbiBDb21wb25lbnQgb3IgRGlyZWN0aXZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcjNKaXRUeXBlU291cmNlU3BhbihcbiAgICBraW5kOiBzdHJpbmcsIHR5cGVOYW1lOiBzdHJpbmcsIHNvdXJjZVVybDogc3RyaW5nKTogUGFyc2VTb3VyY2VTcGFuIHtcbiAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBgaW4gJHtraW5kfSAke3R5cGVOYW1lfSBpbiAke3NvdXJjZVVybH1gO1xuICBjb25zdCBzb3VyY2VGaWxlID0gbmV3IFBhcnNlU291cmNlRmlsZSgnJywgc291cmNlRmlsZU5hbWUpO1xuICByZXR1cm4gbmV3IFBhcnNlU291cmNlU3BhbihcbiAgICAgIG5ldyBQYXJzZUxvY2F0aW9uKHNvdXJjZUZpbGUsIC0xLCAtMSwgLTEpLCBuZXcgUGFyc2VMb2NhdGlvbihzb3VyY2VGaWxlLCAtMSwgLTEsIC0xKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW50YXhFcnJvcihtc2c6IHN0cmluZywgcGFyc2VFcnJvcnM/OiBQYXJzZUVycm9yW10pOiBFcnJvciB7XG4gIGNvbnN0IGVycm9yID0gRXJyb3IobXNnKTtcbiAgKGVycm9yIGFzIGFueSlbRVJST1JfU1lOVEFYX0VSUk9SXSA9IHRydWU7XG4gIGlmIChwYXJzZUVycm9ycykgKGVycm9yIGFzIGFueSlbRVJST1JfUEFSU0VfRVJST1JTXSA9IHBhcnNlRXJyb3JzO1xuICByZXR1cm4gZXJyb3I7XG59XG5cbmNvbnN0IEVSUk9SX1NZTlRBWF9FUlJPUiA9ICduZ1N5bnRheEVycm9yJztcbmNvbnN0IEVSUk9SX1BBUlNFX0VSUk9SUyA9ICduZ1BhcnNlRXJyb3JzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3ludGF4RXJyb3IoZXJyb3I6IEVycm9yKTogYm9vbGVhbiB7XG4gIHJldHVybiAoZXJyb3IgYXMgYW55KVtFUlJPUl9TWU5UQVhfRVJST1JdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyc2VFcnJvcnMoZXJyb3I6IEVycm9yKTogUGFyc2VFcnJvcltdIHtcbiAgcmV0dXJuIChlcnJvciBhcyBhbnkpW0VSUk9SX1BBUlNFX0VSUk9SU10gfHwgW107XG59XG5cbmxldCBfYW5vbnltb3VzVHlwZUluZGV4ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZpZXJOYW1lKGNvbXBpbGVJZGVudGlmaWVyOiBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhfG51bGx8dW5kZWZpbmVkKTogc3RyaW5nfFxuICAgIG51bGwge1xuICBpZiAoIWNvbXBpbGVJZGVudGlmaWVyIHx8ICFjb21waWxlSWRlbnRpZmllci5yZWZlcmVuY2UpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCByZWYgPSBjb21waWxlSWRlbnRpZmllci5yZWZlcmVuY2U7XG4gIGlmIChyZWYgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpIHtcbiAgICByZXR1cm4gcmVmLm5hbWU7XG4gIH1cbiAgaWYgKHJlZlsnX19hbm9ueW1vdXNUeXBlJ10pIHtcbiAgICByZXR1cm4gcmVmWydfX2Fub255bW91c1R5cGUnXTtcbiAgfVxuICBpZiAocmVmWydfX2ZvcndhcmRfcmVmX18nXSkge1xuICAgIC8vIFdlIGRvIG5vdCB3YW50IHRvIHRyeSB0byBzdHJpbmdpZnkgYSBgZm9yd2FyZFJlZigpYCBmdW5jdGlvbiBiZWNhdXNlIHRoYXQgd291bGQgY2F1c2UgdGhlXG4gICAgLy8gaW5uZXIgZnVuY3Rpb24gdG8gYmUgZXZhbHVhdGVkIHRvbyBlYXJseSwgZGVmZWF0aW5nIHRoZSB3aG9sZSBwb2ludCBvZiB0aGUgYGZvcndhcmRSZWZgLlxuICAgIHJldHVybiAnX19mb3J3YXJkX3JlZl9fJztcbiAgfVxuICBsZXQgaWRlbnRpZmllciA9IHN0cmluZ2lmeShyZWYpO1xuICBpZiAoaWRlbnRpZmllci5pbmRleE9mKCcoJykgPj0gMCkge1xuICAgIC8vIGNhc2U6IGFub255bW91cyBmdW5jdGlvbnMhXG4gICAgaWRlbnRpZmllciA9IGBhbm9ueW1vdXNfJHtfYW5vbnltb3VzVHlwZUluZGV4Kyt9YDtcbiAgICByZWZbJ19fYW5vbnltb3VzVHlwZSddID0gaWRlbnRpZmllcjtcbiAgfSBlbHNlIHtcbiAgICBpZGVudGlmaWVyID0gc2FuaXRpemVJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICB9XG4gIHJldHVybiBpZGVudGlmaWVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZmllck1vZHVsZVVybChjb21waWxlSWRlbnRpZmllcjogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSk6IHN0cmluZyB7XG4gIGNvbnN0IHJlZiA9IGNvbXBpbGVJZGVudGlmaWVyLnJlZmVyZW5jZTtcbiAgaWYgKHJlZiBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbCkge1xuICAgIHJldHVybiByZWYuZmlsZVBhdGg7XG4gIH1cbiAgLy8gUnVudGltZSB0eXBlXG4gIHJldHVybiBgLi8ke3N0cmluZ2lmeShyZWYpfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSB7XG4gIHJlZmVyZW5jZTogYW55O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVJZGVudGlmaWVyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBuYW1lLnJlcGxhY2UoL1xcVy9nLCAnXycpO1xufVxuIl19