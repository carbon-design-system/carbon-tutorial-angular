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
        define("@angular/compiler/src/ml_parser/html_whitespaces", ["require", "exports", "@angular/compiler/src/ml_parser/ast", "@angular/compiler/src/ml_parser/entities", "@angular/compiler/src/ml_parser/parser"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeWhitespaces = exports.WhitespaceVisitor = exports.replaceNgsp = exports.PRESERVE_WS_ATTR_NAME = void 0;
    var html = require("@angular/compiler/src/ml_parser/ast");
    var entities_1 = require("@angular/compiler/src/ml_parser/entities");
    var parser_1 = require("@angular/compiler/src/ml_parser/parser");
    exports.PRESERVE_WS_ATTR_NAME = 'ngPreserveWhitespaces';
    var SKIP_WS_TRIM_TAGS = new Set(['pre', 'template', 'textarea', 'script', 'style']);
    // Equivalent to \s with \u00a0 (non-breaking space) excluded.
    // Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
    var WS_CHARS = ' \f\n\r\t\v\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
    var NO_WS_REGEXP = new RegExp("[^" + WS_CHARS + "]");
    var WS_REPLACE_REGEXP = new RegExp("[" + WS_CHARS + "]{2,}", 'g');
    function hasPreserveWhitespacesAttr(attrs) {
        return attrs.some(function (attr) { return attr.name === exports.PRESERVE_WS_ATTR_NAME; });
    }
    /**
     * Angular Dart introduced &ngsp; as a placeholder for non-removable space, see:
     * https://github.com/dart-lang/angular/blob/0bb611387d29d65b5af7f9d2515ab571fd3fbee4/_tests/test/compiler/preserve_whitespace_test.dart#L25-L32
     * In Angular Dart &ngsp; is converted to the 0xE500 PUA (Private Use Areas) unicode character
     * and later on replaced by a space. We are re-implementing the same idea here.
     */
    function replaceNgsp(value) {
        // lexer is replacing the &ngsp; pseudo-entity with NGSP_UNICODE
        return value.replace(new RegExp(entities_1.NGSP_UNICODE, 'g'), ' ');
    }
    exports.replaceNgsp = replaceNgsp;
    /**
     * This visitor can walk HTML parse tree and remove / trim text nodes using the following rules:
     * - consider spaces, tabs and new lines as whitespace characters;
     * - drop text nodes consisting of whitespace characters only;
     * - for all other text nodes replace consecutive whitespace characters with one space;
     * - convert &ngsp; pseudo-entity to a single space;
     *
     * Removal and trimming of whitespaces have positive performance impact (less code to generate
     * while compiling templates, faster view creation). At the same time it can be "destructive"
     * in some cases (whitespaces can influence layout). Because of the potential of breaking layout
     * this visitor is not activated by default in Angular 5 and people need to explicitly opt-in for
     * whitespace removal. The default option for whitespace removal will be revisited in Angular 6
     * and might be changed to "on" by default.
     */
    var WhitespaceVisitor = /** @class */ (function () {
        function WhitespaceVisitor() {
        }
        WhitespaceVisitor.prototype.visitElement = function (element, context) {
            if (SKIP_WS_TRIM_TAGS.has(element.name) || hasPreserveWhitespacesAttr(element.attrs)) {
                // don't descent into elements where we need to preserve whitespaces
                // but still visit all attributes to eliminate one used as a market to preserve WS
                return new html.Element(element.name, html.visitAll(this, element.attrs), element.children, element.sourceSpan, element.startSourceSpan, element.endSourceSpan, element.i18n);
            }
            return new html.Element(element.name, element.attrs, visitAllWithSiblings(this, element.children), element.sourceSpan, element.startSourceSpan, element.endSourceSpan, element.i18n);
        };
        WhitespaceVisitor.prototype.visitAttribute = function (attribute, context) {
            return attribute.name !== exports.PRESERVE_WS_ATTR_NAME ? attribute : null;
        };
        WhitespaceVisitor.prototype.visitText = function (text, context) {
            var isNotBlank = text.value.match(NO_WS_REGEXP);
            var hasExpansionSibling = context &&
                (context.prev instanceof html.Expansion || context.next instanceof html.Expansion);
            if (isNotBlank || hasExpansionSibling) {
                // Process the whitespace in the tokens of this Text node
                var tokens = text.tokens.map(function (token) {
                    return token.type === 5 /* TEXT */ ? createWhitespaceProcessedTextToken(token) : token;
                });
                // Process the whitespace of the value of this Text node
                var value = processWhitespace(text.value);
                return new html.Text(value, text.sourceSpan, tokens, text.i18n);
            }
            return null;
        };
        WhitespaceVisitor.prototype.visitComment = function (comment, context) {
            return comment;
        };
        WhitespaceVisitor.prototype.visitExpansion = function (expansion, context) {
            return expansion;
        };
        WhitespaceVisitor.prototype.visitExpansionCase = function (expansionCase, context) {
            return expansionCase;
        };
        return WhitespaceVisitor;
    }());
    exports.WhitespaceVisitor = WhitespaceVisitor;
    function createWhitespaceProcessedTextToken(_a) {
        var type = _a.type, parts = _a.parts, sourceSpan = _a.sourceSpan;
        return { type: type, parts: [processWhitespace(parts[0])], sourceSpan: sourceSpan };
    }
    function processWhitespace(text) {
        return replaceNgsp(text).replace(WS_REPLACE_REGEXP, ' ');
    }
    function removeWhitespaces(htmlAstWithErrors) {
        return new parser_1.ParseTreeResult(html.visitAll(new WhitespaceVisitor(), htmlAstWithErrors.rootNodes), htmlAstWithErrors.errors);
    }
    exports.removeWhitespaces = removeWhitespaces;
    function visitAllWithSiblings(visitor, nodes) {
        var result = [];
        nodes.forEach(function (ast, i) {
            var context = { prev: nodes[i - 1], next: nodes[i + 1] };
            var astResult = ast.visit(visitor, context);
            if (astResult) {
                result.push(astResult);
            }
        });
        return result;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbF93aGl0ZXNwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9tbF9wYXJzZXIvaHRtbF93aGl0ZXNwYWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwwREFBOEI7SUFDOUIscUVBQXdDO0lBQ3hDLGlFQUF5QztJQUc1QixRQUFBLHFCQUFxQixHQUFHLHVCQUF1QixDQUFDO0lBRTdELElBQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUV0Riw4REFBOEQ7SUFDOUQsbUdBQW1HO0lBQ25HLElBQU0sUUFBUSxHQUFHLDBFQUEwRSxDQUFDO0lBQzVGLElBQU0sWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLE9BQUssUUFBUSxNQUFHLENBQUMsQ0FBQztJQUNsRCxJQUFNLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLE1BQUksUUFBUSxVQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFL0QsU0FBUywwQkFBMEIsQ0FBQyxLQUF1QjtRQUN6RCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFvQixJQUFLLE9BQUEsSUFBSSxDQUFDLElBQUksS0FBSyw2QkFBcUIsRUFBbkMsQ0FBbUMsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLFdBQVcsQ0FBQyxLQUFhO1FBQ3ZDLGdFQUFnRTtRQUNoRSxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsdUJBQVksRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBSEQsa0NBR0M7SUFFRDs7Ozs7Ozs7Ozs7OztPQWFHO0lBQ0g7UUFBQTtR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S0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLFlBQUEsRUFBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQVk7UUFDckMsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FBQyxpQkFBa0M7UUFDbEUsT0FBTyxJQUFJLHdCQUFlLENBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUNuRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBSkQsOENBSUM7SUFPRCxTQUFTLG9CQUFvQixDQUFDLE9BQTBCLEVBQUUsS0FBa0I7UUFDMUUsSUFBTSxNQUFNLEdBQVUsRUFBRSxDQUFDO1FBRXpCLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBQyxHQUFHLEVBQUUsQ0FBQztZQUNuQixJQUFNLE9BQU8sR0FBMEIsRUFBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDO1lBQ2hGLElBQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzlDLElBQUksU0FBUyxFQUFFO2dCQUNiLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDeEI7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgaHRtbCBmcm9tICcuL2FzdCc7XG5pbXBvcnQge05HU1BfVU5JQ09ERX0gZnJvbSAnLi9lbnRpdGllcyc7XG5pbXBvcnQge1BhcnNlVHJlZVJlc3VsdH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHtUZXh0VG9rZW4sIFRva2VuVHlwZX0gZnJvbSAnLi90b2tlbnMnO1xuXG5leHBvcnQgY29uc3QgUFJFU0VSVkVfV1NfQVRUUl9OQU1FID0gJ25nUHJlc2VydmVXaGl0ZXNwYWNlcyc7XG5cbmNvbnN0IFNLSVBfV1NfVFJJTV9UQUdTID0gbmV3IFNldChbJ3ByZScsICd0ZW1wbGF0ZScsICd0ZXh0YXJlYScsICdzY3JpcHQnLCAnc3R5bGUnXSk7XG5cbi8vIEVxdWl2YWxlbnQgdG8gXFxzIHdpdGggXFx1MDBhMCAobm9uLWJyZWFraW5nIHNwYWNlKSBleGNsdWRlZC5cbi8vIEJhc2VkIG9uIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1JlZ0V4cFxuY29uc3QgV1NfQ0hBUlMgPSAnIFxcZlxcblxcclxcdFxcdlxcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyOFxcdTIwMjlcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmJztcbmNvbnN0IE5PX1dTX1JFR0VYUCA9IG5ldyBSZWdFeHAoYFteJHtXU19DSEFSU31dYCk7XG5jb25zdCBXU19SRVBMQUNFX1JFR0VYUCA9IG5ldyBSZWdFeHAoYFske1dTX0NIQVJTfV17Mix9YCwgJ2cnKTtcblxuZnVuY3Rpb24gaGFzUHJlc2VydmVXaGl0ZXNwYWNlc0F0dHIoYXR0cnM6IGh0bWwuQXR0cmlidXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIGF0dHJzLnNvbWUoKGF0dHI6IGh0bWwuQXR0cmlidXRlKSA9PiBhdHRyLm5hbWUgPT09IFBSRVNFUlZFX1dTX0FUVFJfTkFNRSk7XG59XG5cbi8qKlxuICogQW5ndWxhciBEYXJ0IGludHJvZHVjZWQgJm5nc3A7IGFzIGEgcGxhY2Vob2xkZXIgZm9yIG5vbi1yZW1vdmFibGUgc3BhY2UsIHNlZTpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9kYXJ0LWxhbmcvYW5ndWxhci9ibG9iLzBiYjYxMTM4N2QyOWQ2NWI1YWY3ZjlkMjUxNWFiNTcxZmQzZmJlZTQvX3Rlc3RzL3Rlc3QvY29tcGlsZXIvcHJlc2VydmVfd2hpdGVzcGFjZV90ZXN0LmRhcnQjTDI1LUwzMlxuICogSW4gQW5ndWxhciBEYXJ0ICZuZ3NwOyBpcyBjb252ZXJ0ZWQgdG8gdGhlIDB4RTUwMCBQVUEgKFByaXZhdGUgVXNlIEFyZWFzKSB1bmljb2RlIGNoYXJhY3RlclxuICogYW5kIGxhdGVyIG9uIHJlcGxhY2VkIGJ5IGEgc3BhY2UuIFdlIGFyZSByZS1pbXBsZW1lbnRpbmcgdGhlIHNhbWUgaWRlYSBoZXJlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVwbGFjZU5nc3AodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIGxleGVyIGlzIHJlcGxhY2luZyB0aGUgJm5nc3A7IHBzZXVkby1lbnRpdHkgd2l0aCBOR1NQX1VOSUNPREVcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UobmV3IFJlZ0V4cChOR1NQX1VOSUNPREUsICdnJyksICcgJyk7XG59XG5cbi8qKlxuICogVGhpcyB2aXNpdG9yIGNhbiB3YWxrIEhUTUwgcGFyc2UgdHJlZSBhbmQgcmVtb3ZlIC8gdHJpbSB0ZXh0IG5vZGVzIHVzaW5nIHRoZSBmb2xsb3dpbmcgcnVsZXM6XG4gKiAtIGNvbnNpZGVyIHNwYWNlcywgdGFicyBhbmQgbmV3IGxpbmVzIGFzIHdoaXRlc3BhY2UgY2hhcmFjdGVycztcbiAqIC0gZHJvcCB0ZXh0IG5vZGVzIGNvbnNpc3Rpbmcgb2Ygd2hpdGVzcGFjZSBjaGFyYWN0ZXJzIG9ubHk7XG4gKiAtIGZvciBhbGwgb3RoZXIgdGV4dCBub2RlcyByZXBsYWNlIGNvbnNlY3V0aXZlIHdoaXRlc3BhY2UgY2hhcmFjdGVycyB3aXRoIG9uZSBzcGFjZTtcbiAqIC0gY29udmVydCAmbmdzcDsgcHNldWRvLWVudGl0eSB0byBhIHNpbmdsZSBzcGFjZTtcbiAqXG4gKiBSZW1vdmFsIGFuZCB0cmltbWluZyBvZiB3aGl0ZXNwYWNlcyBoYXZlIHBvc2l0aXZlIHBlcmZvcm1hbmNlIGltcGFjdCAobGVzcyBjb2RlIHRvIGdlbmVyYXRlXG4gKiB3aGlsZSBjb21waWxpbmcgdGVtcGxhdGVzLCBmYXN0ZXIgdmlldyBjcmVhdGlvbikuIEF0IHRoZSBzYW1lIHRpbWUgaXQgY2FuIGJlIFwiZGVzdHJ1Y3RpdmVcIlxuICogaW4gc29tZSBjYXNlcyAod2hpdGVzcGFjZXMgY2FuIGluZmx1ZW5jZSBsYXlvdXQpLiBCZWNhdXNlIG9mIHRoZSBwb3RlbnRpYWwgb2YgYnJlYWtpbmcgbGF5b3V0XG4gKiB0aGlzIHZpc2l0b3IgaXMgbm90IGFjdGl2YXRlZCBieSBkZWZhdWx0IGluIEFuZ3VsYXIgNSBhbmQgcGVvcGxlIG5lZWQgdG8gZXhwbGljaXRseSBvcHQtaW4gZm9yXG4gKiB3aGl0ZXNwYWNlIHJlbW92YWwuIFRoZSBkZWZhdWx0IG9wdGlvbiBmb3Igd2hpdGVzcGFjZSByZW1vdmFsIHdpbGwgYmUgcmV2aXNpdGVkIGluIEFuZ3VsYXIgNlxuICogYW5kIG1pZ2h0IGJlIGNoYW5nZWQgdG8gXCJvblwiIGJ5IGRlZmF1bHQuXG4gKi9cbmV4cG9ydCBjbGFzcyBXaGl0ZXNwYWNlVmlzaXRvciBpbXBsZW1lbnRzIGh0bWwuVmlzaXRvciB7XG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiBodG1sLkVsZW1lbnQsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgaWYgKFNLSVBfV1NfVFJJTV9UQUdTLmhhcyhlbGVtZW50Lm5hbWUpIHx8IGhhc1ByZXNlcnZlV2hpdGVzcGFjZXNBdHRyKGVsZW1lbnQuYXR0cnMpKSB7XG4gICAgICAvLyBkb24ndCBkZXNjZW50IGludG8gZWxlbWVudHMgd2hlcmUgd2UgbmVlZCB0byBwcmVzZXJ2ZSB3aGl0ZXNwYWNlc1xuICAgICAgLy8gYnV0IHN0aWxsIHZpc2l0IGFsbCBhdHRyaWJ1dGVzIHRvIGVsaW1pbmF0ZSBvbmUgdXNlZCBhcyBhIG1hcmtldCB0byBwcmVzZXJ2ZSBXU1xuICAgICAgcmV0dXJuIG5ldyBodG1sLkVsZW1lbnQoXG4gICAgICAgICAgZWxlbWVudC5uYW1lLCBodG1sLnZpc2l0QWxsKHRoaXMsIGVsZW1lbnQuYXR0cnMpLCBlbGVtZW50LmNoaWxkcmVuLCBlbGVtZW50LnNvdXJjZVNwYW4sXG4gICAgICAgICAgZWxlbWVudC5zdGFydFNvdXJjZVNwYW4sIGVsZW1lbnQuZW5kU291cmNlU3BhbiwgZWxlbWVudC5pMThuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IGh0bWwuRWxlbWVudChcbiAgICAgICAgZWxlbWVudC5uYW1lLCBlbGVtZW50LmF0dHJzLCB2aXNpdEFsbFdpdGhTaWJsaW5ncyh0aGlzLCBlbGVtZW50LmNoaWxkcmVuKSxcbiAgICAgICAgZWxlbWVudC5zb3VyY2VTcGFuLCBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiwgZWxlbWVudC5lbmRTb3VyY2VTcGFuLCBlbGVtZW50LmkxOG4pO1xuICB9XG5cbiAgdmlzaXRBdHRyaWJ1dGUoYXR0cmlidXRlOiBodG1sLkF0dHJpYnV0ZSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gYXR0cmlidXRlLm5hbWUgIT09IFBSRVNFUlZFX1dTX0FUVFJfTkFNRSA/IGF0dHJpYnV0ZSA6IG51bGw7XG4gIH1cblxuICB2aXNpdFRleHQodGV4dDogaHRtbC5UZXh0LCBjb250ZXh0OiBTaWJsaW5nVmlzaXRvckNvbnRleHR8bnVsbCk6IGFueSB7XG4gICAgY29uc3QgaXNOb3RCbGFuayA9IHRleHQudmFsdWUubWF0Y2goTk9fV1NfUkVHRVhQKTtcbiAgICBjb25zdCBoYXNFeHBhbnNpb25TaWJsaW5nID0gY29udGV4dCAmJlxuICAgICAgICAoY29udGV4dC5wcmV2IGluc3RhbmNlb2YgaHRtbC5FeHBhbnNpb24gfHwgY29udGV4dC5uZXh0IGluc3RhbmNlb2YgaHRtbC5FeHBhbnNpb24pO1xuXG4gICAgaWYgKGlzTm90QmxhbmsgfHwgaGFzRXhwYW5zaW9uU2libGluZykge1xuICAgICAgLy8gUHJvY2VzcyB0aGUgd2hpdGVzcGFjZSBpbiB0aGUgdG9rZW5zIG9mIHRoaXMgVGV4dCBub2RlXG4gICAgICBjb25zdCB0b2tlbnMgPSB0ZXh0LnRva2Vucy5tYXAoXG4gICAgICAgICAgdG9rZW4gPT5cbiAgICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLlRFWFQgPyBjcmVhdGVXaGl0ZXNwYWNlUHJvY2Vzc2VkVGV4dFRva2VuKHRva2VuKSA6IHRva2VuKTtcbiAgICAgIC8vIFByb2Nlc3MgdGhlIHdoaXRlc3BhY2Ugb2YgdGhlIHZhbHVlIG9mIHRoaXMgVGV4dCBub2RlXG4gICAgICBjb25zdCB2YWx1ZSA9IHByb2Nlc3NXaGl0ZXNwYWNlKHRleHQudmFsdWUpO1xuICAgICAgcmV0dXJuIG5ldyBodG1sLlRleHQodmFsdWUsIHRleHQuc291cmNlU3BhbiwgdG9rZW5zLCB0ZXh0LmkxOG4pO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmlzaXRDb21tZW50KGNvbW1lbnQ6IGh0bWwuQ29tbWVudCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gY29tbWVudDtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uKGV4cGFuc2lvbjogaHRtbC5FeHBhbnNpb24sIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGV4cGFuc2lvbjtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uQ2FzZShleHBhbnNpb25DYXNlOiBodG1sLkV4cGFuc2lvbkNhc2UsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGV4cGFuc2lvbkNhc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlV2hpdGVzcGFjZVByb2Nlc3NlZFRleHRUb2tlbih7dHlwZSwgcGFydHMsIHNvdXJjZVNwYW59OiBUZXh0VG9rZW4pOiBUZXh0VG9rZW4ge1xuICByZXR1cm4ge3R5cGUsIHBhcnRzOiBbcHJvY2Vzc1doaXRlc3BhY2UocGFydHNbMF0pXSwgc291cmNlU3Bhbn07XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NXaGl0ZXNwYWNlKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiByZXBsYWNlTmdzcCh0ZXh0KS5yZXBsYWNlKFdTX1JFUExBQ0VfUkVHRVhQLCAnICcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlV2hpdGVzcGFjZXMoaHRtbEFzdFdpdGhFcnJvcnM6IFBhcnNlVHJlZVJlc3VsdCk6IFBhcnNlVHJlZVJlc3VsdCB7XG4gIHJldHVybiBuZXcgUGFyc2VUcmVlUmVzdWx0KFxuICAgICAgaHRtbC52aXNpdEFsbChuZXcgV2hpdGVzcGFjZVZpc2l0b3IoKSwgaHRtbEFzdFdpdGhFcnJvcnMucm9vdE5vZGVzKSxcbiAgICAgIGh0bWxBc3RXaXRoRXJyb3JzLmVycm9ycyk7XG59XG5cbmludGVyZmFjZSBTaWJsaW5nVmlzaXRvckNvbnRleHQge1xuICBwcmV2OiBodG1sLk5vZGV8dW5kZWZpbmVkO1xuICBuZXh0OiBodG1sLk5vZGV8dW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiB2aXNpdEFsbFdpdGhTaWJsaW5ncyh2aXNpdG9yOiBXaGl0ZXNwYWNlVmlzaXRvciwgbm9kZXM6IGh0bWwuTm9kZVtdKTogYW55W10ge1xuICBjb25zdCByZXN1bHQ6IGFueVtdID0gW107XG5cbiAgbm9kZXMuZm9yRWFjaCgoYXN0LCBpKSA9PiB7XG4gICAgY29uc3QgY29udGV4dDogU2libGluZ1Zpc2l0b3JDb250ZXh0ID0ge3ByZXY6IG5vZGVzW2kgLSAxXSwgbmV4dDogbm9kZXNbaSArIDFdfTtcbiAgICBjb25zdCBhc3RSZXN1bHQgPSBhc3QudmlzaXQodmlzaXRvciwgY29udGV4dCk7XG4gICAgaWYgKGFzdFJlc3VsdCkge1xuICAgICAgcmVzdWx0LnB1c2goYXN0UmVzdWx0KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuIl19