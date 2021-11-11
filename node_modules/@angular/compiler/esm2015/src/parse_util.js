/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { StaticSymbol } from './aot/static_symbol';
import * as chars from './chars';
import { stringify } from './util';
export class ParseLocation {
    constructor(file, offset, line, col) {
        this.file = file;
        this.offset = offset;
        this.line = line;
        this.col = col;
    }
    toString() {
        return this.offset != null ? `${this.file.url}@${this.line}:${this.col}` : this.file.url;
    }
    moveBy(delta) {
        const source = this.file.content;
        const len = source.length;
        let offset = this.offset;
        let line = this.line;
        let col = this.col;
        while (offset > 0 && delta < 0) {
            offset--;
            delta++;
            const ch = source.charCodeAt(offset);
            if (ch == chars.$LF) {
                line--;
                const priorLine = source.substr(0, offset - 1).lastIndexOf(String.fromCharCode(chars.$LF));
                col = priorLine > 0 ? offset - priorLine : offset;
            }
            else {
                col--;
            }
        }
        while (offset < len && delta > 0) {
            const ch = source.charCodeAt(offset);
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
    }
    // Return the source around the location
    // Up to `maxChars` or `maxLines` on each side of the location
    getContext(maxChars, maxLines) {
        const content = this.file.content;
        let startOffset = this.offset;
        if (startOffset != null) {
            if (startOffset > content.length - 1) {
                startOffset = content.length - 1;
            }
            let endOffset = startOffset;
            let ctxChars = 0;
            let ctxLines = 0;
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
    }
}
export class ParseSourceFile {
    constructor(content, url) {
        this.content = content;
        this.url = url;
    }
}
export class ParseSourceSpan {
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
    constructor(start, end, fullStart = start, details = null) {
        this.start = start;
        this.end = end;
        this.fullStart = fullStart;
        this.details = details;
    }
    toString() {
        return this.start.file.content.substring(this.start.offset, this.end.offset);
    }
}
export var ParseErrorLevel;
(function (ParseErrorLevel) {
    ParseErrorLevel[ParseErrorLevel["WARNING"] = 0] = "WARNING";
    ParseErrorLevel[ParseErrorLevel["ERROR"] = 1] = "ERROR";
})(ParseErrorLevel || (ParseErrorLevel = {}));
export class ParseError {
    constructor(span, msg, level = ParseErrorLevel.ERROR) {
        this.span = span;
        this.msg = msg;
        this.level = level;
    }
    contextualMessage() {
        const ctx = this.span.start.getContext(100, 3);
        return ctx ? `${this.msg} ("${ctx.before}[${ParseErrorLevel[this.level]} ->]${ctx.after}")` :
            this.msg;
    }
    toString() {
        const details = this.span.details ? `, ${this.span.details}` : '';
        return `${this.contextualMessage()}: ${this.span.start}${details}`;
    }
}
export function typeSourceSpan(kind, type) {
    const moduleUrl = identifierModuleUrl(type);
    const sourceFileName = moduleUrl != null ? `in ${kind} ${identifierName(type)} in ${moduleUrl}` :
        `in ${kind} ${identifierName(type)}`;
    const sourceFile = new ParseSourceFile('', sourceFileName);
    return new ParseSourceSpan(new ParseLocation(sourceFile, -1, -1, -1), new ParseLocation(sourceFile, -1, -1, -1));
}
/**
 * Generates Source Span object for a given R3 Type for JIT mode.
 *
 * @param kind Component or Directive.
 * @param typeName name of the Component or Directive.
 * @param sourceUrl reference to Component or Directive source.
 * @returns instance of ParseSourceSpan that represent a given Component or Directive.
 */
export function r3JitTypeSourceSpan(kind, typeName, sourceUrl) {
    const sourceFileName = `in ${kind} ${typeName} in ${sourceUrl}`;
    const sourceFile = new ParseSourceFile('', sourceFileName);
    return new ParseSourceSpan(new ParseLocation(sourceFile, -1, -1, -1), new ParseLocation(sourceFile, -1, -1, -1));
}
export function syntaxError(msg, parseErrors) {
    const error = Error(msg);
    error[ERROR_SYNTAX_ERROR] = true;
    if (parseErrors)
        error[ERROR_PARSE_ERRORS] = parseErrors;
    return error;
}
const ERROR_SYNTAX_ERROR = 'ngSyntaxError';
const ERROR_PARSE_ERRORS = 'ngParseErrors';
export function isSyntaxError(error) {
    return error[ERROR_SYNTAX_ERROR];
}
export function getParseErrors(error) {
    return error[ERROR_PARSE_ERRORS] || [];
}
let _anonymousTypeIndex = 0;
export function identifierName(compileIdentifier) {
    if (!compileIdentifier || !compileIdentifier.reference) {
        return null;
    }
    const ref = compileIdentifier.reference;
    if (ref instanceof StaticSymbol) {
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
    let identifier = stringify(ref);
    if (identifier.indexOf('(') >= 0) {
        // case: anonymous functions!
        identifier = `anonymous_${_anonymousTypeIndex++}`;
        ref['__anonymousType'] = identifier;
    }
    else {
        identifier = sanitizeIdentifier(identifier);
    }
    return identifier;
}
export function identifierModuleUrl(compileIdentifier) {
    const ref = compileIdentifier.reference;
    if (ref instanceof StaticSymbol) {
        return ref.filePath;
    }
    // Runtime type
    return `./${stringify(ref)}`;
}
export function sanitizeIdentifier(name) {
    return name.replace(/\W/g, '_');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VfdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9wYXJzZV91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUNqRCxPQUFPLEtBQUssS0FBSyxNQUFNLFNBQVMsQ0FBQztBQUNqQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBRWpDLE1BQU0sT0FBTyxhQUFhO0lBQ3hCLFlBQ1csSUFBcUIsRUFBUyxNQUFjLEVBQVMsSUFBWSxFQUNqRSxHQUFXO1FBRFgsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFBUyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNqRSxRQUFHLEdBQUgsR0FBRyxDQUFRO0lBQUcsQ0FBQztJQUUxQixRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDM0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFhO1FBQ2xCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN6QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3JCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDbkIsT0FBTyxNQUFN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QUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBTUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVk7SUFDN0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNsQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1N0YXRpY1N5bWJvbH0gZnJvbSAnLi9hb3Qvc3RhdGljX3N5bWJvbCc7XG5pbXBvcnQgKiBhcyBjaGFycyBmcm9tICcuL2NoYXJzJztcbmltcG9ydCB7c3RyaW5naWZ5fSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgY2xhc3MgUGFyc2VMb2NhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIGZpbGU6IFBhcnNlU291cmNlRmlsZSwgcHVibGljIG9mZnNldDogbnVtYmVyLCBwdWJsaWMgbGluZTogbnVtYmVyLFxuICAgICAgcHVibGljIGNvbDogbnVtYmVyKSB7fVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub2Zmc2V0ICE9IG51bGwgPyBgJHt0aGlzLmZpbGUudXJsfUAke3RoaXMubGluZX06JHt0aGlzLmNvbH1gIDogdGhpcy5maWxlLnVybDtcbiAgfVxuXG4gIG1vdmVCeShkZWx0YTogbnVtYmVyKTogUGFyc2VMb2NhdGlvbiB7XG4gICAgY29uc3Qgc291cmNlID0gdGhpcy5maWxlLmNvbnRlbnQ7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBsZXQgb2Zmc2V0ID0gdGhpcy5vZmZzZXQ7XG4gICAgbGV0IGxpbmUgPSB0aGlzLmxpbmU7XG4gICAgbGV0IGNvbCA9IHRoaXMuY29sO1xuICAgIHdoaWxlIChvZmZzZXQgPiAwICYmIGRlbHRhIDwgMCkge1xuICAgICAgb2Zmc2V0LS07XG4gICAgICBkZWx0YSsrO1xuICAgICAgY29uc3QgY2ggPSBzb3VyY2UuY2hhckNvZGVBdChvZmZzZXQpO1xuICAgICAgaWYgKGNoID09IGNoYXJzLiRMRikge1xuICAgICAgICBsaW5lLS07XG4gICAgICAgIGNvbnN0IHByaW9yTGluZSA9IHNvdXJjZS5zdWJzdHIoMCwgb2Zmc2V0IC0gMSkubGFzdEluZGV4T2YoU3RyaW5nLmZyb21DaGFyQ29kZShjaGFycy4kTEYpKTtcbiAgICAgICAgY29sID0gcHJpb3JMaW5lID4gMCA/IG9mZnNldCAtIHByaW9yTGluZSA6IG9mZnNldDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbC0tO1xuICAgICAgfVxuICAgIH1cbiAgICB3aGlsZSAob2Zmc2V0IDwgbGVuICYmIGRlbHRhID4gMCkge1xuICAgICAgY29uc3QgY2ggPSBzb3VyY2UuY2hhckNvZGVBdChvZmZzZXQpO1xuICAgICAgb2Zmc2V0Kys7XG4gICAgICBkZWx0YS0tO1xuICAgICAgaWYgKGNoID09IGNoYXJzLiRMRikge1xuICAgICAgICBsaW5lKys7XG4gICAgICAgIGNvbCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2wrKztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQYXJzZUxvY2F0aW9uKHRoaXMuZmlsZSwgb2Zmc2V0LCBsaW5lLCBjb2wpO1xuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBzb3VyY2UgYXJvdW5kIHRoZSBsb2NhdGlvblxuICAvLyBVcCB0byBgbWF4Q2hhcnNgIG9yIGBtYXhMaW5lc2Agb24gZWFjaCBzaWRlIG9mIHRoZSBsb2NhdGlvblxuICBnZXRDb250ZXh0KG1heENoYXJzOiBudW1iZXIsIG1heExpbmVzOiBudW1iZXIpOiB7YmVmb3JlOiBzdHJpbmcsIGFmdGVyOiBzdHJpbmd9fG51bGwge1xuICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmZpbGUuY29udGVudDtcbiAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aGlzLm9mZnNldDtcblxuICAgIGlmIChzdGFydE9mZnNldCAhPSBudWxsKSB7XG4gICAgICBpZiAoc3RhcnRPZmZzZXQgPiBjb250ZW50Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgc3RhcnRPZmZzZXQgPSBjb250ZW50Lmxlbmd0aCAtIDE7XG4gICAgICB9XG4gICAgICBsZXQgZW5kT2Zmc2V0ID0gc3RhcnRPZmZzZXQ7XG4gICAgICBsZXQgY3R4Q2hhcnMgPSAwO1xuICAgICAgbGV0IGN0eExpbmVzID0gMDtcblxuICAgICAgd2hpbGUgKGN0eENoYXJzIDwgbWF4Q2hhcnMgJiYgc3RhcnRPZmZzZXQgPiAwKSB7XG4gICAgICAgIHN0YXJ0T2Zmc2V0LS07XG4gICAgICAgIGN0eENoYXJzKys7XG4gICAgICAgIGlmIChjb250ZW50W3N0YXJ0T2Zmc2V0XSA9PSAnXFxuJykge1xuICAgICAgICAgIGlmICgrK2N0eExpbmVzID09IG1heExpbmVzKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY3R4Q2hhcnMgPSAwO1xuICAgICAgY3R4TGluZXMgPSAwO1xuICAgICAgd2hpbGUgKGN0eENoYXJzIDwgbWF4Q2hhcnMgJiYgZW5kT2Zmc2V0IDwgY29udGVudC5sZW5ndGggLSAxKSB7XG4gICAgICAgIGVuZE9mZnNldCsrO1xuICAgICAgICBjdHhDaGFycysrO1xuICAgICAgICBpZiAoY29udGVudFtlbmRPZmZzZXRdID09ICdcXG4nKSB7XG4gICAgICAgICAgaWYgKCsrY3R4TGluZXMgPT0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBiZWZvcmU6IGNvbnRlbnQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCB0aGlzLm9mZnNldCksXG4gICAgICAgIGFmdGVyOiBjb250ZW50LnN1YnN0cmluZyh0aGlzLm9mZnNldCwgZW5kT2Zmc2V0ICsgMSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJzZVNvdXJjZUZpbGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29udGVudDogc3RyaW5nLCBwdWJsaWMgdXJsOiBzdHJpbmcpIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJzZVNvdXJjZVNwYW4ge1xuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0aGF0IGhvbGRzIGluZm9ybWF0aW9uIGFib3V0IHNwYW5zIG9mIHRva2Vucy9ub2RlcyBjYXB0dXJlZCBkdXJpbmdcbiAgICogbGV4aW5nL3BhcnNpbmcgb2YgdGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHN0YXJ0XG4gICAqIFRoZSBsb2NhdGlvbiBvZiB0aGUgc3RhcnQgb2YgdGhlIHNwYW4gKGhhdmluZyBza2lwcGVkIGxlYWRpbmcgdHJpdmlhKS5cbiAgICogU2tpcHBpbmcgbGVhZGluZyB0cml2aWEgbWFrZXMgc291cmNlLXNwYW5zIG1vcmUgXCJ1c2VyIGZyaWVuZGx5XCIsIHNpbmNlIHRoaW5ncyBsaWtlIEhUTUxcbiAgICogZWxlbWVudHMgd2lsbCBhcHBlYXIgdG8gYmVnaW4gYXQgdGhlIHN0YXJ0IG9mIHRoZSBvcGVuaW5nIHRhZywgcmF0aGVyIHRoYW4gYXQgdGhlIHN0YXJ0IG9mIGFueVxuICAgKiBsZWFkaW5nIHRyaXZpYSwgd2hpY2ggY291bGQgaW5jbHVkZSBuZXdsaW5lcy5cbiAgICpcbiAgICogQHBhcmFtIGVuZFxuICAgKiBUaGUgbG9jYXRpb24gb2YgdGhlIGVuZCBvZiB0aGUgc3Bhbi5cbiAgICpcbiAgICogQHBhcmFtIGZ1bGxTdGFydFxuICAgKiBUaGUgc3RhcnQgb2YgdGhlIHRva2VuIHdpdGhvdXQgc2tpcHBpbmcgdGhlIGxlYWRpbmcgdHJpdmlhLlxuICAgKiBUaGlzIGlzIHVzZWQgYnkgdG9vbGluZyB0aGF0IHNwbGl0cyB0b2tlbnMgZnVydGhlciwgc3VjaCBhcyBleHRyYWN0aW5nIEFuZ3VsYXIgaW50ZXJwb2xhdGlvbnNcbiAgICogZnJvbSB0ZXh0IHRva2Vucy4gU3VjaCB0b29saW5nIGNyZWF0ZXMgbmV3IHNvdXJjZS1zcGFucyByZWxhdGl2ZSB0byB0aGUgb3JpZ2luYWwgdG9rZW4nc1xuICAgKiBzb3VyY2Utc3Bhbi4gSWYgbGVhZGluZyB0cml2aWEgY2hhcmFjdGVycyBoYXZlIGJlZW4gc2tpcHBlZCB0aGVuIHRoZSBuZXcgc291cmNlLXNwYW5zIG1heSBiZVxuICAgKiBpbmNvcnJlY3RseSBvZmZzZXQuXG4gICAqXG4gICAqIEBwYXJhbSBkZXRhaWxzXG4gICAqIEFkZGl0aW9uYWwgaW5mb3JtYXRpb24gKHN1Y2ggYXMgaWRlbnRpZmllciBuYW1lcykgdGhhdCBzaG91bGQgYmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBzcGFuLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgc3RhcnQ6IFBhcnNlTG9jYXRpb24sIHB1YmxpYyBlbmQ6IFBhcnNlTG9jYXRpb24sXG4gICAgICBwdWJsaWMgZnVsbFN0YXJ0OiBQYXJzZUxvY2F0aW9uID0gc3RhcnQsIHB1YmxpYyBkZXRhaWxzOiBzdHJpbmd8bnVsbCA9IG51bGwpIHt9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zdGFydC5maWxlLmNvbnRlbnQuc3Vic3RyaW5nKHRoaXMuc3RhcnQub2Zmc2V0LCB0aGlzLmVuZC5vZmZzZXQpO1xuICB9XG59XG5cbmV4cG9ydCBlbnVtIFBhcnNlRXJyb3JMZXZlbCB7XG4gIFdBUk5JTkcsXG4gIEVSUk9SLFxufVxuXG5leHBvcnQgY2xhc3MgUGFyc2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIHNwYW46IFBhcnNlU291cmNlU3BhbiwgcHVibGljIG1zZzogc3RyaW5nLFxuICAgICAgcHVibGljIGxldmVsOiBQYXJzZUVycm9yTGV2ZWwgPSBQYXJzZUVycm9yTGV2ZWwuRVJST1IpIHt9XG5cbiAgY29udGV4dHVhbE1lc3NhZ2UoKTogc3RyaW5nIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLnNwYW4uc3RhcnQuZ2V0Q29udGV4dCgxMDAsIDMpO1xuICAgIHJldHVybiBjdHggPyBgJHt0aGlzLm1zZ30gKFwiJHtjdHguYmVmb3JlfVske1BhcnNlRXJyb3JMZXZlbFt0aGlzLmxldmVsXX0gLT5dJHtjdHguYWZ0ZXJ9XCIpYCA6XG4gICAgICAgICAgICAgICAgIHRoaXMubXNnO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBkZXRhaWxzID0gdGhpcy5zcGFuLmRldGFpbHMgPyBgLCAke3RoaXMuc3Bhbi5kZXRhaWxzfWAgOiAnJztcbiAgICByZXR1cm4gYCR7dGhpcy5jb250ZXh0dWFsTWVzc2FnZSgpfTogJHt0aGlzLnNwYW4uc3RhcnR9JHtkZXRhaWxzfWA7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVTb3VyY2VTcGFuKGtpbmQ6IHN0cmluZywgdHlwZTogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSk6IFBhcnNlU291cmNlU3BhbiB7XG4gIGNvbnN0IG1vZHVsZVVybCA9IGlkZW50aWZpZXJNb2R1bGVVcmwodHlwZSk7XG4gIGNvbnN0IHNvdXJjZUZpbGVOYW1lID0gbW9kdWxlVXJsICE9IG51bGwgPyBgaW4gJHtraW5kfSAke2lkZW50aWZpZXJOYW1lKHR5cGUpfSBpbiAke21vZHVsZVVybH1gIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBpbiAke2tpbmR9ICR7aWRlbnRpZmllck5hbWUodHlwZSl9YDtcbiAgY29uc3Qgc291cmNlRmlsZSA9IG5ldyBQYXJzZVNvdXJjZUZpbGUoJycsIHNvdXJjZUZpbGVOYW1lKTtcbiAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICBuZXcgUGFyc2VMb2NhdGlvbihzb3VyY2VGaWxlLCAtMSwgLTEsIC0xKSwgbmV3IFBhcnNlTG9jYXRpb24oc291cmNlRmlsZSwgLTEsIC0xLCAtMSkpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBTb3VyY2UgU3BhbiBvYmplY3QgZm9yIGEgZ2l2ZW4gUjMgVHlwZSBmb3IgSklUIG1vZGUuXG4gKlxuICogQHBhcmFtIGtpbmQgQ29tcG9uZW50IG9yIERpcmVjdGl2ZS5cbiAqIEBwYXJhbSB0eXBlTmFtZSBuYW1lIG9mIHRoZSBDb21wb25lbnQgb3IgRGlyZWN0aXZlLlxuICogQHBhcmFtIHNvdXJjZVVybCByZWZlcmVuY2UgdG8gQ29tcG9uZW50IG9yIERpcmVjdGl2ZSBzb3VyY2UuXG4gKiBAcmV0dXJucyBpbnN0YW5jZSBvZiBQYXJzZVNvdXJjZVNwYW4gdGhhdCByZXByZXNlbnQgYSBnaXZlbiBDb21wb25lbnQgb3IgRGlyZWN0aXZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcjNKaXRUeXBlU291cmNlU3BhbihcbiAgICBraW5kOiBzdHJpbmcsIHR5cGVOYW1lOiBzdHJpbmcsIHNvdXJjZVVybDogc3RyaW5nKTogUGFyc2VTb3VyY2VTcGFuIHtcbiAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBgaW4gJHtraW5kfSAke3R5cGVOYW1lfSBpbiAke3NvdXJjZVVybH1gO1xuICBjb25zdCBzb3VyY2VGaWxlID0gbmV3IFBhcnNlU291cmNlRmlsZSgnJywgc291cmNlRmlsZU5hbWUpO1xuICByZXR1cm4gbmV3IFBhcnNlU291cmNlU3BhbihcbiAgICAgIG5ldyBQYXJzZUxvY2F0aW9uKHNvdXJjZUZpbGUsIC0xLCAtMSwgLTEpLCBuZXcgUGFyc2VMb2NhdGlvbihzb3VyY2VGaWxlLCAtMSwgLTEsIC0xKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW50YXhFcnJvcihtc2c6IHN0cmluZywgcGFyc2VFcnJvcnM/OiBQYXJzZUVycm9yW10pOiBFcnJvciB7XG4gIGNvbnN0IGVycm9yID0gRXJyb3IobXNnKTtcbiAgKGVycm9yIGFzIGFueSlbRVJST1JfU1lOVEFYX0VSUk9SXSA9IHRydWU7XG4gIGlmIChwYXJzZUVycm9ycykgKGVycm9yIGFzIGFueSlbRVJST1JfUEFSU0VfRVJST1JTXSA9IHBhcnNlRXJyb3JzO1xuICByZXR1cm4gZXJyb3I7XG59XG5cbmNvbnN0IEVSUk9SX1NZTlRBWF9FUlJPUiA9ICduZ1N5bnRheEVycm9yJztcbmNvbnN0IEVSUk9SX1BBUlNFX0VSUk9SUyA9ICduZ1BhcnNlRXJyb3JzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3ludGF4RXJyb3IoZXJyb3I6IEVycm9yKTogYm9vbGVhbiB7XG4gIHJldHVybiAoZXJyb3IgYXMgYW55KVtFUlJPUl9TWU5UQVhfRVJST1JdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyc2VFcnJvcnMoZXJyb3I6IEVycm9yKTogUGFyc2VFcnJvcltdIHtcbiAgcmV0dXJuIChlcnJvciBhcyBhbnkpW0VSUk9SX1BBUlNFX0VSUk9SU10gfHwgW107XG59XG5cbmxldCBfYW5vbnltb3VzVHlwZUluZGV4ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZpZXJOYW1lKGNvbXBpbGVJZGVudGlmaWVyOiBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhfG51bGx8dW5kZWZpbmVkKTogc3RyaW5nfFxuICAgIG51bGwge1xuICBpZiAoIWNvbXBpbGVJZGVudGlmaWVyIHx8ICFjb21waWxlSWRlbnRpZmllci5yZWZlcmVuY2UpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCByZWYgPSBjb21waWxlSWRlbnRpZmllci5yZWZlcmVuY2U7XG4gIGlmIChyZWYgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpIHtcbiAgICByZXR1cm4gcmVmLm5hbWU7XG4gIH1cbiAgaWYgKHJlZlsnX19hbm9ueW1vdXNUeXBlJ10pIHtcbiAgICByZXR1cm4gcmVmWydfX2Fub255bW91c1R5cGUnXTtcbiAgfVxuICBpZiAocmVmWydfX2ZvcndhcmRfcmVmX18nXSkge1xuICAgIC8vIFdlIGRvIG5vdCB3YW50IHRvIHRyeSB0byBzdHJpbmdpZnkgYSBgZm9yd2FyZFJlZigpYCBmdW5jdGlvbiBiZWNhdXNlIHRoYXQgd291bGQgY2F1c2UgdGhlXG4gICAgLy8gaW5uZXIgZnVuY3Rpb24gdG8gYmUgZXZhbHVhdGVkIHRvbyBlYXJseSwgZGVmZWF0aW5nIHRoZSB3aG9sZSBwb2ludCBvZiB0aGUgYGZvcndhcmRSZWZgLlxuICAgIHJldHVybiAnX19mb3J3YXJkX3JlZl9fJztcbiAgfVxuICBsZXQgaWRlbnRpZmllciA9IHN0cmluZ2lmeShyZWYpO1xuICBpZiAoaWRlbnRpZmllci5pbmRleE9mKCcoJykgPj0gMCkge1xuICAgIC8vIGNhc2U6IGFub255bW91cyBmdW5jdGlvbnMhXG4gICAgaWRlbnRpZmllciA9IGBhbm9ueW1vdXNfJHtfYW5vbnltb3VzVHlwZUluZGV4Kyt9YDtcbiAgICByZWZbJ19fYW5vbnltb3VzVHlwZSddID0gaWRlbnRpZmllcjtcbiAgfSBlbHNlIHtcbiAgICBpZGVudGlmaWVyID0gc2FuaXRpemVJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICB9XG4gIHJldHVybiBpZGVudGlmaWVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZmllck1vZHVsZVVybChjb21waWxlSWRlbnRpZmllcjogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSk6IHN0cmluZyB7XG4gIGNvbnN0IHJlZiA9IGNvbXBpbGVJZGVudGlmaWVyLnJlZmVyZW5jZTtcbiAgaWYgKHJlZiBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbCkge1xuICAgIHJldHVybiByZWYuZmlsZVBhdGg7XG4gIH1cbiAgLy8gUnVudGltZSB0eXBlXG4gIHJldHVybiBgLi8ke3N0cmluZ2lmeShyZWYpfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSB7XG4gIHJlZmVyZW5jZTogYW55O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVJZGVudGlmaWVyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBuYW1lLnJlcGxhY2UoL1xcVy9nLCAnXycpO1xufVxuIl19