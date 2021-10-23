/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Lexer as ExpressionLexer } from '../expression_parser/lexer';
import { Parser as ExpressionParser } from '../expression_parser/parser';
import * as html from '../ml_parser/ast';
import { getHtmlTagDefinition } from '../ml_parser/html_tags';
import { ParseSourceSpan } from '../parse_util';
import * as i18n from './i18n_ast';
import { PlaceholderRegistry } from './serializers/placeholder';
const _expParser = new ExpressionParser(new ExpressionLexer());
/**
 * Returns a function converting html nodes to an i18n Message given an interpolationConfig
 */
export function createI18nMessageFactory(interpolationConfig) {
    const visitor = new _I18nVisitor(_expParser, interpolationConfig);
    return (nodes, meaning, description, customId, visitNodeFn) => visitor.toI18nMessage(nodes, meaning, description, customId, visitNodeFn);
}
function noopVisitNodeFn(_html, i18n) {
    return i18n;
}
class _I18nVisitor {
    constructor(_expressionParser, _interpolationConfig) {
        this._expressionParser = _expressionParser;
        this._interpolationConfig = _interpolationConfig;
    }
    toI18nMessage(nodes, meaning = '', description = '', customId = '', visitNodeFn) {
        const context = {
            isIcu: nodes.length == 1 && nodes[0] instanceof html.Expansion,
            icuDepth: 0,
            placeholderRegistry: new PlaceholderRegistry(),
            placeholderToContent: {},
            placeholderToMessage: {},
            visitNodeFn: visitNodeFn || noopVisitNodeFn,
        };
        const i18nodes = html.visitAll(this, nodes, context);
        return new i18n.Message(i18nodes, context.placeholderToContent, context.placeholderToMessage, meaning, description, customId);
    }
    visitElement(el, context) {
        var _a;
        const children = html.visitAll(this, el.children, context);
        const attrs = {};
        el.attrs.forEach(attr => {
            // Do not visit the attributes, translatable ones are top-level ASTs
            attrs[attr.name] = attr.value;
        });
        const isVoid = getHtmlTagDefinition(el.name).isVoid;
        const startPhName = context.placeholderRegistry.getStartTagPlaceholderName(el.name, attrs, isVoid);
        context.placeholderToContent[startPhName] = {
            text: el.startSourceSpan.toString(),
            sourceSpan: el.startSourceSpan,
        };
        let closePhName = '';
        if (!isVoid) {
            closePhName = context.placeholderRegistry.getCloseTagPlaceholderName(el.name);
            context.placeholderToContent[closePhName] = {
                text: `</${el.name}>`,
                sourceSpan: (_a = el.endSourceSpan) !== null && _a !== void 0 ? _a : el.sourceSpan,
            };
        }
        const node = new i18n.TagPlaceholder(el.name, attrs, startPhName, closePhName, children, isVoid, el.sourceSpan, el.startSourceSpan, el.endSourceSpan);
        return context.visitNodeFn(el, node);
    }
    visitAttribute(attribute, context) {
        const node = attribute.valueTokens === undefined || attribute.valueTokens.length === 1 ?
            new i18n.Text(attribute.value, attribute.valueSpan || attribute.sourceSpan) :
            this._visitTextWithInterpolation(attribute.valueTokens, attribute.valueSpan || attribute.sourceSpan, context, attribute.i18n);
        return context.visitNodeFn(attribute, node);
    }
    visitText(text, context) {
        const node = text.tokens.length === 1 ?
            new i18n.Text(text.value, text.sourceSpan) :
            this._visitTextWithInterpolation(text.tokens, text.sourceSpan, context, text.i18n);
        return context.visitNodeFn(text, node);
    }
    visitComment(comment, context) {
        return null;
    }
    visitExpansion(icu, context) {
        context.icuDepth++;
        const i18nIcuCases = {};
        const i18nIcu = new i18n.Icu(icu.switchValue, icu.type, i18nIcuCases, icu.sourceSpan);
        icu.cases.forEach((caze) => {
            i18nIcuCases[caze.value] = new i18n.Container(caze.expression.map((node) => node.visit(this, context)), caze.expSourceSpan);
        });
        context.icuDepth--;
        if (context.isIcu || context.icuDepth > 0) {
            // Returns an ICU node when:
            // - the message (vs a part of the message) is an ICU message, or
            // - the ICU message is nested.
            const expPh = context.placeholderRegistry.getUniquePlaceholder(`VAR_${icu.type}`);
            i18nIcu.expressionPlaceholder = expPh;
            context.placeholderToContent[expPh] = {
                text: icu.switchValue,
                sourceSpan: icu.switchValueSourceSpan,
            };
            return context.visitNodeFn(icu, i18nIcu);
        }
        // Else returns a placeholder
        // ICU placeholders should not be replaced with their original content but with the their
        // translations.
        // TODO(vicb): add a html.Node -> i18n.Message cache to avoid having to re-create the msg
        const phName = context.placeholderRegistry.getPlaceholderName('ICU', icu.sourceSpan.toString());
        context.placeholderToMessage[phName] = this.toI18nMessage([icu], '', '', '', undefined);
        const node = new i18n.IcuPlaceholder(i18nIcu, phName, icu.sourceSpan);
        return context.visitNodeFn(icu, node);
    }
    visitExpansionCase(_icuCase, _context) {
        throw new Error('Unreachable code');
    }
    /**
     * Convert, text and interpolated tokens up into text and placeholder pieces.
     *
     * @param tokens The text and interpolated tokens.
     * @param sourceSpan The span of the whole of the `text` string.
     * @param context The current context of the visitor, used to compute and store placeholders.
     * @param previousI18n Any i18n metadata associated with this `text` from a previous pass.
     */
    _visitTextWithInterpolation(tokens, sourceSpan, context, previousI18n) {
        // Return a sequence of `Text` and `Placeholder` nodes grouped in a `Container`.
        const nodes = [];
        // We will only create a container if there are actually interpolations,
        // so this flag tracks that.
        let hasInterpolation = false;
        for (const token of tokens) {
            switch (token.type) {
                case 8 /* INTERPOLATION */:
                case 17 /* ATTR_VALUE_INTERPOLATION */:
                    hasInterpolation = true;
                    const expression = token.parts[1];
                    const baseName = extractPlaceholderName(expression) || 'INTERPOLATION';
                    const phName = context.placeholderRegistry.getPlaceholderName(baseName, expression);
                    context.placeholderToContent[phName] = {
                        text: token.parts.join(''),
                        sourceSpan: token.sourceSpan
                    };
                    nodes.push(new i18n.Placeholder(expression, phName, token.sourceSpan));
                    break;
                default:
                    if (token.parts[0].length > 0) {
                        // This token is text or an encoded entity.
                        // If it is following on from a previous text node then merge it into that node
                        // Otherwise, if it is following an interpolation, then add a new node.
                        const previous = nodes[nodes.length - 1];
                        if (previous instanceof i18n.Text) {
                            previous.value += token.parts[0];
                            previous.sourceSpan = new ParseSourceSpan(previous.sourceSpan.start, token.sourceSpan.end, previous.sourceSpan.fullStart, previous.sourceSpan.details);
                        }
                        else {
                            nodes.push(new i18n.Text(token.parts[0], token.sourceSpan));
                        }
                    }
                    break;
            }
        }
        if (hasInterpolation) {
            // Whitespace removal may have invalidated the interpolation source-spans.
            reusePreviousSourceSpans(nodes, previousI18n);
            return new i18n.Container(nodes, sourceSpan);
        }
        else {
            return nodes[0];
        }
    }
}
/**
 * Re-use the source-spans from `previousI18n` metadata for the `nodes`.
 *
 * Whitespace removal can invalidate the source-spans of interpolation nodes, so we
 * reuse the source-span stored from a previous pass before the whitespace was removed.
 *
 * @param nodes The `Text` and `Placeholder` nodes to be processed.
 * @param previousI18n Any i18n metadata for these `nodes` stored from a previous pass.
 */
function reusePreviousSourceSpans(nodes, previousI18n) {
    if (previousI18n instanceof i18n.Message) {
        // The `previousI18n` is an i18n `Message`, so we are processing an `Attribute` with i18n
        // metadata. The `Message` should consist only of a single `Container` that contains the
        // parts (`Text` and `Placeholder`) to process.
        assertSingleContainerMessage(previousI18n);
        previousI18n = previousI18n.nodes[0];
    }
    if (previousI18n instanceof i18n.Container) {
        // The `previousI18n` is a `Container`, which means that this is a second i18n extraction pass
        // after whitespace has been removed from the AST nodes.
        assertEquivalentNodes(previousI18n.children, nodes);
        // Reuse the source-spans from the first pass.
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].sourceSpan = previousI18n.children[i].sourceSpan;
        }
    }
}
/**
 * Asserts that the `message` contains exactly one `Container` node.
 */
function assertSingleContainerMessage(message) {
    const nodes = message.nodes;
    if (nodes.length !== 1 || !(nodes[0] instanceof i18n.Container)) {
        throw new Error('Unexpected previous i18n message - expected it to consist of only a single `Container` node.');
    }
}
/**
 * Asserts that the `previousNodes` and `node` collections have the same number of elements and
 * corresponding elements have the same node type.
 */
function assertEquivalentNodes(previousNodes, nodes) {
    if (previousNodes.length !== nodes.length) {
        throw new Error('The number of i18n message children changed between first and second pass.');
    }
    if (previousNodes.some((node, i) => nodes[i].constructor !== node.constructor)) {
        throw new Error('The types of the i18n message children changed between first and second pass.');
    }
}
const _CUSTOM_PH_EXP = /\/\/[\s\S]*i18n[\s\S]*\([\s\S]*ph[\s\S]*=[\s\S]*("|')([\s\S]*?)\1[\s\S]*\)/g;
function extractPlaceholderName(input) {
    return input.split(_CUSTOM_PH_EXP)[2];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bl9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvaTE4bi9pMThuX3BhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsS0FBSyxJQUFJLGVBQWUsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQ3BFLE9BQU8sRUFBQyxNQUFNLElBQUksZ0JBQWdCLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RSxPQUFPLEtBQUssSUFBSSxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBRzVELE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFOUMsT0FBTyxLQUFLLElBQUksTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFFOUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7QUFTL0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsbUJBQXdDO0lBRS9FLE1BQU0sT0FBTyxHQUFHLElBQUksWUFBWSxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ2xFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FDbkQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDdkYsQ0FBQztBQVdELFNBQVMsZUFBZSxDQUFDLEtBQWdCLEVBQUUsSUFBZTtJQUN4RCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLFlBQVk7SUFD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Q0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQy9ELE1BQU0sSUFBSSxLQUFLLENBQ1gsOEZBQThGLENBQUMsQ0FBQztLQUNyRztBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLHFCQUFxQixDQUFDLGFBQTBCLEVBQUUsS0FBa0I7SUFDM0UsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLEVBQUU7UUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0RUFBNEUsQ0FBQyxDQUFDO0tBQy9GO0lBQ0QsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDOUUsTUFBTSxJQUFJLEtBQUssQ0FDWCwrRUFBK0UsQ0FBQyxDQUFDO0tBQ3RGO0FBQ0gsQ0FBQztBQUVELE1BQU0sY0FBYyxHQUNoQiw2RUFBNkUsQ0FBQztBQUVsRixTQUFTLHNCQUFzQixDQUFDLEtBQWE7SUFDM0MsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMZXhlciBhcyBFeHByZXNzaW9uTGV4ZXJ9IGZyb20gJy4uL2V4cHJlc3Npb25fcGFyc2VyL2xleGVyJztcbmltcG9ydCB7UGFyc2VyIGFzIEV4cHJlc3Npb25QYXJzZXJ9IGZyb20gJy4uL2V4cHJlc3Npb25fcGFyc2VyL3BhcnNlcic7XG5pbXBvcnQgKiBhcyBodG1sIGZyb20gJy4uL21sX3BhcnNlci9hc3QnO1xuaW1wb3J0IHtnZXRIdG1sVGFnRGVmaW5pdGlvbn0gZnJvbSAnLi4vbWxfcGFyc2VyL2h0bWxfdGFncyc7XG5pbXBvcnQge0ludGVycG9sYXRpb25Db25maWd9IGZyb20gJy4uL21sX3BhcnNlci9pbnRlcnBvbGF0aW9uX2NvbmZpZyc7XG5pbXBvcnQge0ludGVycG9sYXRlZEF0dHJpYnV0ZVRva2VuLCBJbnRlcnBvbGF0ZWRUZXh0VG9rZW4sIFRva2VuVHlwZX0gZnJvbSAnLi4vbWxfcGFyc2VyL3Rva2Vucyc7XG5pbXBvcnQge1BhcnNlU291cmNlU3Bhbn0gZnJvbSAnLi4vcGFyc2VfdXRpbCc7XG5cbmltcG9ydCAqIGFzIGkxOG4gZnJvbSAnLi9pMThuX2FzdCc7XG5pbXBvcnQge1BsYWNlaG9sZGVyUmVnaXN0cnl9IGZyb20gJy4vc2VyaWFsaXplcnMvcGxhY2Vob2xkZXInO1xuXG5jb25zdCBfZXhwUGFyc2VyID0gbmV3IEV4cHJlc3Npb25QYXJzZXIobmV3IEV4cHJlc3Npb25MZXhlcigpKTtcblxuZXhwb3J0IHR5cGUgVmlzaXROb2RlRm4gPSAoaHRtbDogaHRtbC5Ob2RlLCBpMThuOiBpMThuLk5vZGUpID0+IGkxOG4uTm9kZTtcblxuZXhwb3J0IGludGVyZmFjZSBJMThuTWVzc2FnZUZhY3Rvcnkge1xuICAobm9kZXM6IGh0bWwuTm9kZVtdLCBtZWFuaW5nOiBzdHJpbmd8dW5kZWZpbmVkLCBkZXNjcmlwdGlvbjogc3RyaW5nfHVuZGVmaW5lZCxcbiAgIGN1c3RvbUlkOiBzdHJpbmd8dW5kZWZpbmVkLCB2aXNpdE5vZGVGbj86IFZpc2l0Tm9kZUZuKTogaTE4bi5NZXNzYWdlO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiBjb252ZXJ0aW5nIGh0bWwgbm9kZXMgdG8gYW4gaTE4biBNZXNzYWdlIGdpdmVuIGFuIGludGVycG9sYXRpb25Db25maWdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUkxOG5NZXNzYWdlRmFjdG9yeShpbnRlcnBvbGF0aW9uQ29uZmlnOiBJbnRlcnBvbGF0aW9uQ29uZmlnKTpcbiAgICBJMThuTWVzc2FnZUZhY3Rvcnkge1xuICBjb25zdCB2aXNpdG9yID0gbmV3IF9JMThuVmlzaXRvcihfZXhwUGFyc2VyLCBpbnRlcnBvbGF0aW9uQ29uZmlnKTtcbiAgcmV0dXJuIChub2RlcywgbWVhbmluZywgZGVzY3JpcHRpb24sIGN1c3RvbUlkLCB2aXNpdE5vZGVGbikgPT5cbiAgICAgICAgICAgICB2aXNpdG9yLnRvSTE4bk1lc3NhZ2Uobm9kZXMsIG1lYW5pbmcsIGRlc2NyaXB0aW9uLCBjdXN0b21JZCwgdmlzaXROb2RlRm4pO1xufVxuXG5pbnRlcmZhY2UgSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCB7XG4gIGlzSWN1OiBib29sZWFuO1xuICBpY3VEZXB0aDogbnVtYmVyO1xuICBwbGFjZWhvbGRlclJlZ2lzdHJ5OiBQbGFjZWhvbGRlclJlZ2lzdHJ5O1xuICBwbGFjZWhvbGRlclRvQ29udGVudDoge1twaE5hbWU6IHN0cmluZ106IGkxOG4uTWVzc2FnZVBsYWNlaG9sZGVyfTtcbiAgcGxhY2Vob2xkZXJUb01lc3NhZ2U6IHtbcGhOYW1lOiBzdHJpbmddOiBpMThuLk1lc3NhZ2V9O1xuICB2aXNpdE5vZGVGbjogVmlzaXROb2RlRm47XG59XG5cbmZ1bmN0aW9uIG5vb3BWaXNpdE5vZGVGbihfaHRtbDogaHRtbC5Ob2RlLCBpMThuOiBpMThuLk5vZGUpOiBpMThuLk5vZGUge1xuICByZXR1cm4gaTE4bjtcbn1cblxuY2xhc3MgX0kxOG5WaXNpdG9yIGltcGxlbWVudHMgaHRtbC5WaXNpdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIF9leHByZXNzaW9uUGFyc2VyOiBFeHByZXNzaW9uUGFyc2VyLFxuICAgICAgcHJpdmF0ZSBfaW50ZXJwb2xhdGlvbkNvbmZpZzogSW50ZXJwb2xhdGlvbkNvbmZpZykge31cblxuICBwdWJsaWMgdG9JMThuTWVzc2FnZShcbiAgICAgIG5vZGVzOiBodG1sLk5vZGVbXSwgbWVhbmluZyA9ICcnLCBkZXNjcmlwdGlvbiA9ICcnLCBjdXN0b21JZCA9ICcnLFxuICAgICAgdmlzaXROb2RlRm46IFZpc2l0Tm9kZUZufHVuZGVmaW5lZCk6IGkxOG4uTWVzc2FnZSB7XG4gICAgY29uc3QgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCA9IHtcbiAgICAgIGlzSWN1OiBub2Rlcy5sZW5ndGggPT0gMSAmJiBub2Rlc1swXSBpbnN0YW5jZW9mIGh0bWwuRXhwYW5zaW9uLFxuICAgICAgaWN1RGVwdGg6IDAsXG4gICAgICBwbGFjZWhvbGRlclJlZ2lzdHJ5OiBuZXcgUGxhY2Vob2xkZXJSZWdpc3RyeSgpLFxuICAgICAgcGxhY2Vob2xkZXJUb0NvbnRlbnQ6IHt9LFxuICAgICAgcGxhY2Vob2xkZXJUb01lc3NhZ2U6IHt9LFxuICAgICAgdmlzaXROb2RlRm46IHZpc2l0Tm9kZUZuIHx8IG5vb3BWaXNpdE5vZGVGbixcbiAgICB9O1xuXG4gICAgY29uc3QgaTE4bm9kZXM6IGkxOG4uTm9kZVtdID0gaHRtbC52aXNpdEFsbCh0aGlzLCBub2RlcywgY29udGV4dCk7XG5cbiAgICByZXR1cm4gbmV3IGkxOG4uTWVzc2FnZShcbiAgICAgICAgaTE4bm9kZXMsIGNvbnRleHQucGxhY2Vob2xkZXJUb0NvbnRlbnQsIGNvbnRleHQucGxhY2Vob2xkZXJUb01lc3NhZ2UsIG1lYW5pbmcsIGRlc2NyaXB0aW9uLFxuICAgICAgICBjdXN0b21JZCk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnQoZWw6IGh0bWwuRWxlbWVudCwgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCk6IGkxOG4uTm9kZSB7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBodG1sLnZpc2l0QWxsKHRoaXMsIGVsLmNoaWxkcmVuLCBjb250ZXh0KTtcbiAgICBjb25zdCBhdHRyczoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgZWwuYXR0cnMuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgIC8vIERvIG5vdCB2aXNpdCB0aGUgYXR0cmlidXRlcywgdHJhbnNsYXRhYmxlIG9uZXMgYXJlIHRvcC1sZXZlbCBBU1RzXG4gICAgICBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGlzVm9pZDogYm9vbGVhbiA9IGdldEh0bWxUYWdEZWZpbml0aW9uKGVsLm5hbWUpLmlzVm9pZDtcbiAgICBjb25zdCBzdGFydFBoTmFtZSA9XG4gICAgICAgIGNvbnRleHQucGxhY2Vob2xkZXJSZWdpc3RyeS5nZXRTdGFydFRhZ1BsYWNlaG9sZGVyTmFtZShlbC5uYW1lLCBhdHRycywgaXNWb2lkKTtcbiAgICBjb250ZXh0LnBsYWNlaG9sZGVyVG9Db250ZW50W3N0YXJ0UGhOYW1lXSA9IHtcbiAgICAgIHRleHQ6IGVsLnN0YXJ0U291cmNlU3Bhbi50b1N0cmluZygpLFxuICAgICAgc291cmNlU3BhbjogZWwuc3RhcnRTb3VyY2VTcGFuLFxuICAgIH07XG5cbiAgICBsZXQgY2xvc2VQaE5hbWUgPSAnJztcblxuICAgIGlmICghaXNWb2lkKSB7XG4gICAgICBjbG9zZVBoTmFtZSA9IGNvbnRleHQucGxhY2Vob2xkZXJSZWdpc3RyeS5nZXRDbG9zZVRhZ1BsYWNlaG9sZGVyTmFtZShlbC5uYW1lKTtcbiAgICAgIGNvbnRleHQucGxhY2Vob2xkZXJUb0NvbnRlbnRbY2xvc2VQaE5hbWVdID0ge1xuICAgICAgICB0ZXh0OiBgPC8ke2VsLm5hbWV9PmAsXG4gICAgICAgIHNvdXJjZVNwYW46IGVsLmVuZFNvdXJjZVNwYW4gPz8gZWwuc291cmNlU3BhbixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IG5ldyBpMThuLlRhZ1BsYWNlaG9sZGVyKFxuICAgICAgICBlbC5uYW1lLCBhdHRycywgc3RhcnRQaE5hbWUsIGNsb3NlUGhOYW1lLCBjaGlsZHJlbiwgaXNWb2lkLCBlbC5zb3VyY2VTcGFuLFxuICAgICAgICBlbC5zdGFydFNvdXJjZVNwYW4sIGVsLmVuZFNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBjb250ZXh0LnZpc2l0Tm9kZUZuKGVsLCBub2RlKTtcbiAgfVxuXG4gIHZpc2l0QXR0cmlidXRlKGF0dHJpYnV0ZTogaHRtbC5BdHRyaWJ1dGUsIGNvbnRleHQ6IEkxOG5NZXNzYWdlVmlzaXRvckNvbnRleHQpOiBpMThuLk5vZGUge1xuICAgIGNvbnN0IG5vZGUgPSBhdHRyaWJ1dGUudmFsdWVUb2tlbnMgPT09IHVuZGVmaW5lZCB8fCBhdHRyaWJ1dGUudmFsdWVUb2tlbnMubGVuZ3RoID09PSAxID9cbiAgICAgICAgbmV3IGkxOG4uVGV4dChhdHRyaWJ1dGUudmFsdWUsIGF0dHJpYnV0ZS52YWx1ZVNwYW4gfHwgYXR0cmlidXRlLnNvdXJjZVNwYW4pIDpcbiAgICAgICAgdGhpcy5fdmlzaXRUZXh0V2l0aEludGVycG9sYXRpb24oXG4gICAgICAgICAgICBhdHRyaWJ1dGUudmFsdWVUb2tlbnMsIGF0dHJpYnV0ZS52YWx1ZVNwYW4gfHwgYXR0cmlidXRlLnNvdXJjZVNwYW4sIGNvbnRleHQsXG4gICAgICAgICAgICBhdHRyaWJ1dGUuaTE4bik7XG4gICAgcmV0dXJuIGNvbnRleHQudmlzaXROb2RlRm4oYXR0cmlidXRlLCBub2RlKTtcbiAgfVxuXG4gIHZpc2l0VGV4dCh0ZXh0OiBodG1sLlRleHQsIGNvbnRleHQ6IEkxOG5NZXNzYWdlVmlzaXRvckNvbnRleHQpOiBpMThuLk5vZGUge1xuICAgIGNvbnN0IG5vZGUgPSB0ZXh0LnRva2Vucy5sZW5ndGggPT09IDEgP1xuICAgICAgICBuZXcgaTE4bi5UZXh0KHRleHQudmFsdWUsIHRleHQuc291cmNlU3BhbikgOlxuICAgICAgICB0aGlzLl92aXNpdFRleHRXaXRoSW50ZXJwb2xhdGlvbih0ZXh0LnRva2VucywgdGV4dC5zb3VyY2VTcGFuLCBjb250ZXh0LCB0ZXh0LmkxOG4pO1xuICAgIHJldHVybiBjb250ZXh0LnZpc2l0Tm9kZUZuKHRleHQsIG5vZGUpO1xuICB9XG5cbiAgdmlzaXRDb21tZW50KGNvbW1lbnQ6IGh0bWwuQ29tbWVudCwgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCk6IGkxOG4uTm9kZXxudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uKGljdTogaHRtbC5FeHBhbnNpb24sIGNvbnRleHQ6IEkxOG5NZXNzYWdlVmlzaXRvckNvbnRleHQpOiBpMThuLk5vZGUge1xuICAgIGNvbnRleHQuaWN1RGVwdGgrKztcbiAgICBjb25zdCBpMThuSWN1Q2FzZXM6IHtbazogc3RyaW5nXTogaTE4bi5Ob2RlfSA9IHt9O1xuICAgIGNvbnN0IGkxOG5JY3UgPSBuZXcgaTE4bi5JY3UoaWN1LnN3aXRjaFZhbHVlLCBpY3UudHlwZSwgaTE4bkljdUNhc2VzLCBpY3Uuc291cmNlU3Bhbik7XG4gICAgaWN1LmNhc2VzLmZvckVhY2goKGNhemUpOiB2b2lkID0+IHtcbiAgICAgIGkxOG5JY3VDYXNlc1tjYXplLnZhbHVlXSA9IG5ldyBpMThuLkNvbnRhaW5lcihcbiAgICAgICAgICBjYXplLmV4cHJlc3Npb24ubWFwKChub2RlKSA9PiBub2RlLnZpc2l0KHRoaXMsIGNvbnRleHQpKSwgY2F6ZS5leHBTb3VyY2VTcGFuKTtcbiAgICB9KTtcbiAgICBjb250ZXh0LmljdURlcHRoLS07XG5cbiAgICBpZiAoY29udGV4dC5pc0ljdSB8fCBjb250ZXh0LmljdURlcHRoID4gMCkge1xuICAgICAgLy8gUmV0dXJucyBhbiBJQ1Ugbm9kZSB3aGVuOlxuICAgICAgLy8gLSB0aGUgbWVzc2FnZSAodnMgYSBwYXJ0IG9mIHRoZSBtZXNzYWdlKSBpcyBhbiBJQ1UgbWVzc2FnZSwgb3JcbiAgICAgIC8vIC0gdGhlIElDVSBtZXNzYWdlIGlzIG5lc3RlZC5cbiAgICAgIGNvbnN0IGV4cFBoID0gY29udGV4dC5wbGFjZWhvbGRlclJlZ2lzdHJ5LmdldFVuaXF1ZVBsYWNlaG9sZGVyKGBWQVJfJHtpY3UudHlwZX1gKTtcbiAgICAgIGkxOG5JY3UuZXhwcmVzc2lvblBsYWNlaG9sZGVyID0gZXhwUGg7XG4gICAgICBjb250ZXh0LnBsYWNlaG9sZGVyVG9Db250ZW50W2V4cFBoXSA9IHtcbiAgICAgICAgdGV4dDogaWN1LnN3aXRjaFZhbHVlLFxuICAgICAgICBzb3VyY2VTcGFuOiBpY3Uuc3dpdGNoVmFsdWVTb3VyY2VTcGFuLFxuICAgICAgfTtcbiAgICAgIHJldHVybiBjb250ZXh0LnZpc2l0Tm9kZUZuKGljdSwgaTE4bkljdSk7XG4gICAgfVxuXG4gICAgLy8gRWxzZSByZXR1cm5zIGEgcGxhY2Vob2xkZXJcbiAgICAvLyBJQ1UgcGxhY2Vob2xkZXJzIHNob3VsZCBub3QgYmUgcmVwbGFjZWQgd2l0aCB0aGVpciBvcmlnaW5hbCBjb250ZW50IGJ1dCB3aXRoIHRoZSB0aGVpclxuICAgIC8vIHRyYW5zbGF0aW9ucy5cbiAgICAvLyBUT0RPKHZpY2IpOiBhZGQgYSBodG1sLk5vZGUgLT4gaTE4bi5NZXNzYWdlIGNhY2hlIHRvIGF2b2lkIGhhdmluZyB0byByZS1jcmVhdGUgdGhlIG1zZ1xuICAgIGNvbnN0IHBoTmFtZSA9IGNvbnRleHQucGxhY2Vob2xkZXJSZWdpc3RyeS5nZXRQbGFjZWhvbGRlck5hbWUoJ0lDVScsIGljdS5zb3VyY2VTcGFuLnRvU3RyaW5nKCkpO1xuICAgIGNvbnRleHQucGxhY2Vob2xkZXJUb01lc3NhZ2VbcGhOYW1lXSA9IHRoaXMudG9JMThuTWVzc2FnZShbaWN1XSwgJycsICcnLCAnJywgdW5kZWZpbmVkKTtcbiAgICBjb25zdCBub2RlID0gbmV3IGkxOG4uSWN1UGxhY2Vob2xkZXIoaTE4bkljdSwgcGhOYW1lLCBpY3Uuc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGNvbnRleHQudmlzaXROb2RlRm4oaWN1LCBub2RlKTtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uQ2FzZShfaWN1Q2FzZTogaHRtbC5FeHBhbnNpb25DYXNlLCBfY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCk6IGkxOG4uTm9kZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbnJlYWNoYWJsZSBjb2RlJyk7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCwgdGV4dCBhbmQgaW50ZXJwb2xhdGVkIHRva2VucyB1cCBpbnRvIHRleHQgYW5kIHBsYWNlaG9sZGVyIHBpZWNlcy5cbiAgICpcbiAgICogQHBhcmFtIHRva2VucyBUaGUgdGV4dCBhbmQgaW50ZXJwb2xhdGVkIHRva2Vucy5cbiAgICogQHBhcmFtIHNvdXJjZVNwYW4gVGhlIHNwYW4gb2YgdGhlIHdob2xlIG9mIHRoZSBgdGV4dGAgc3RyaW5nLlxuICAgKiBAcGFyYW0gY29udGV4dCBUaGUgY3VycmVudCBjb250ZXh0IG9mIHRoZSB2aXNpdG9yLCB1c2VkIHRvIGNvbXB1dGUgYW5kIHN0b3JlIHBsYWNlaG9sZGVycy5cbiAgICogQHBhcmFtIHByZXZpb3VzSTE4biBBbnkgaTE4biBtZXRhZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhpcyBgdGV4dGAgZnJvbSBhIHByZXZpb3VzIHBhc3MuXG4gICAqL1xuICBwcml2YXRlIF92aXNpdFRleHRXaXRoSW50ZXJwb2xhdGlvbihcbiAgICAgIHRva2VuczogKEludGVycG9sYXRlZFRleHRUb2tlbnxJbnRlcnBvbGF0ZWRBdHRyaWJ1dGVUb2tlbilbXSwgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCwgcHJldmlvdXNJMThuOiBpMThuLkkxOG5NZXRhfHVuZGVmaW5lZCk6IGkxOG4uTm9kZSB7XG4gICAgLy8gUmV0dXJuIGEgc2VxdWVuY2Ugb2YgYFRleHRgIGFuZCBgUGxhY2Vob2xkZXJgIG5vZGVzIGdyb3VwZWQgaW4gYSBgQ29udGFpbmVyYC5cbiAgICBjb25zdCBub2RlczogaTE4bi5Ob2RlW10gPSBbXTtcbiAgICAvLyBXZSB3aWxsIG9ubHkgY3JlYXRlIGEgY29udGFpbmVyIGlmIHRoZXJlIGFyZSBhY3R1YWxseSBpbnRlcnBvbGF0aW9ucyxcbiAgICAvLyBzbyB0aGlzIGZsYWcgdHJhY2tzIHRoYXQuXG4gICAgbGV0IGhhc0ludGVycG9sYXRpb24gPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgc3dpdGNoICh0b2tlbi50eXBlKSB7XG4gICAgICAgIGNhc2UgVG9rZW5UeXBlLklOVEVSUE9MQVRJT046XG4gICAgICAgIGNhc2UgVG9rZW5UeXBlLkFUVFJfVkFMVUVfSU5URVJQT0xBVElPTjpcbiAgICAgICAgICBoYXNJbnRlcnBvbGF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdG9rZW4ucGFydHNbMV07XG4gICAgICAgICAgY29uc3QgYmFzZU5hbWUgPSBleHRyYWN0UGxhY2Vob2xkZXJOYW1lKGV4cHJlc3Npb24pIHx8ICdJTlRFUlBPTEFUSU9OJztcbiAgICAgICAgICBjb25zdCBwaE5hbWUgPSBjb250ZXh0LnBsYWNlaG9sZGVyUmVnaXN0cnkuZ2V0UGxhY2Vob2xkZXJOYW1lKGJhc2VOYW1lLCBleHByZXNzaW9uKTtcbiAgICAgICAgICBjb250ZXh0LnBsYWNlaG9sZGVyVG9Db250ZW50W3BoTmFtZV0gPSB7XG4gICAgICAgICAgICB0ZXh0OiB0b2tlbi5wYXJ0cy5qb2luKCcnKSxcbiAgICAgICAgICAgIHNvdXJjZVNwYW46IHRva2VuLnNvdXJjZVNwYW5cbiAgICAgICAgICB9O1xuICAgICAgICAgIG5vZGVzLnB1c2gobmV3IGkxOG4uUGxhY2Vob2xkZXIoZXhwcmVzc2lvbiwgcGhOYW1lLCB0b2tlbi5zb3VyY2VTcGFuKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKHRva2VuLnBhcnRzWzBdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFRoaXMgdG9rZW4gaXMgdGV4dCBvciBhbiBlbmNvZGVkIGVudGl0eS5cbiAgICAgICAgICAgIC8vIElmIGl0IGlzIGZvbGxvd2luZyBvbiBmcm9tIGEgcHJldmlvdXMgdGV4dCBub2RlIHRoZW4gbWVyZ2UgaXQgaW50byB0aGF0IG5vZGVcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgaWYgaXQgaXMgZm9sbG93aW5nIGFuIGludGVycG9sYXRpb24sIHRoZW4gYWRkIGEgbmV3IG5vZGUuXG4gICAgICAgICAgICBjb25zdCBwcmV2aW91cyA9IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHByZXZpb3VzIGluc3RhbmNlb2YgaTE4bi5UZXh0KSB7XG4gICAgICAgICAgICAgIHByZXZpb3VzLnZhbHVlICs9IHRva2VuLnBhcnRzWzBdO1xuICAgICAgICAgICAgICBwcmV2aW91cy5zb3VyY2VTcGFuID0gbmV3IFBhcnNlU291cmNlU3BhbihcbiAgICAgICAgICAgICAgICAgIHByZXZpb3VzLnNvdXJjZVNwYW4uc3RhcnQsIHRva2VuLnNvdXJjZVNwYW4uZW5kLCBwcmV2aW91cy5zb3VyY2VTcGFuLmZ1bGxTdGFydCxcbiAgICAgICAgICAgICAgICAgIHByZXZpb3VzLnNvdXJjZVNwYW4uZGV0YWlscyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBub2Rlcy5wdXNoKG5ldyBpMThuLlRleHQodG9rZW4ucGFydHNbMF0sIHRva2VuLnNvdXJjZVNwYW4pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhc0ludGVycG9sYXRpb24pIHtcbiAgICAgIC8vIFdoaXRlc3BhY2UgcmVtb3ZhbCBtYXkgaGF2ZSBpbnZhbGlkYXRlZCB0aGUgaW50ZXJwb2xhdGlvbiBzb3VyY2Utc3BhbnMuXG4gICAgICByZXVzZVByZXZpb3VzU291cmNlU3BhbnMobm9kZXMsIHByZXZpb3VzSTE4bik7XG4gICAgICByZXR1cm4gbmV3IGkxOG4uQ29udGFpbmVyKG5vZGVzLCBzb3VyY2VTcGFuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5vZGVzWzBdO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlLXVzZSB0aGUgc291cmNlLXNwYW5zIGZyb20gYHByZXZpb3VzSTE4bmAgbWV0YWRhdGEgZm9yIHRoZSBgbm9kZXNgLlxuICpcbiAqIFdoaXRlc3BhY2UgcmVtb3ZhbCBjYW4gaW52YWxpZGF0ZSB0aGUgc291cmNlLXNwYW5zIG9mIGludGVycG9sYXRpb24gbm9kZXMsIHNvIHdlXG4gKiByZXVzZSB0aGUgc291cmNlLXNwYW4gc3RvcmVkIGZyb20gYSBwcmV2aW91cyBwYXNzIGJlZm9yZSB0aGUgd2hpdGVzcGFjZSB3YXMgcmVtb3ZlZC5cbiAqXG4gKiBAcGFyYW0gbm9kZXMgVGhlIGBUZXh0YCBhbmQgYFBsYWNlaG9sZGVyYCBub2RlcyB0byBiZSBwcm9jZXNzZWQuXG4gKiBAcGFyYW0gcHJldmlvdXNJMThuIEFueSBpMThuIG1ldGFkYXRhIGZvciB0aGVzZSBgbm9kZXNgIHN0b3JlZCBmcm9tIGEgcHJldmlvdXMgcGFzcy5cbiAqL1xuZnVuY3Rpb24gcmV1c2VQcmV2aW91c1NvdXJjZVNwYW5zKG5vZGVzOiBpMThuLk5vZGVbXSwgcHJldmlvdXNJMThuOiBpMThuLkkxOG5NZXRhfHVuZGVmaW5lZCk6IHZvaWQge1xuICBpZiAocHJldmlvdXNJMThuIGluc3RhbmNlb2YgaTE4bi5NZXNzYWdlKSB7XG4gICAgLy8gVGhlIGBwcmV2aW91c0kxOG5gIGlzIGFuIGkxOG4gYE1lc3NhZ2VgLCBzbyB3ZSBhcmUgcHJvY2Vzc2luZyBhbiBgQXR0cmlidXRlYCB3aXRoIGkxOG5cbiAgICAvLyBtZXRhZGF0YS4gVGhlIGBNZXNzYWdlYCBzaG91bGQgY29uc2lzdCBvbmx5IG9mIGEgc2luZ2xlIGBDb250YWluZXJgIHRoYXQgY29udGFpbnMgdGhlXG4gICAgLy8gcGFydHMgKGBUZXh0YCBhbmQgYFBsYWNlaG9sZGVyYCkgdG8gcHJvY2Vzcy5cbiAgICBhc3NlcnRTaW5nbGVDb250YWluZXJNZXNzYWdlKHByZXZpb3VzSTE4bik7XG4gICAgcHJldmlvdXNJMThuID0gcHJldmlvdXNJMThuLm5vZGVzWzBdO1xuICB9XG5cbiAgaWYgKHByZXZpb3VzSTE4biBpbnN0YW5jZW9mIGkxOG4uQ29udGFpbmVyKSB7XG4gICAgLy8gVGhlIGBwcmV2aW91c0kxOG5gIGlzIGEgYENvbnRhaW5lcmAsIHdoaWNoIG1lYW5zIHRoYXQgdGhpcyBpcyBhIHNlY29uZCBpMThuIGV4dHJhY3Rpb24gcGFzc1xuICAgIC8vIGFmdGVyIHdoaXRlc3BhY2UgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tIHRoZSBBU1Qgbm9kZXMuXG4gICAgYXNzZXJ0RXF1aXZhbGVudE5vZGVzKHByZXZpb3VzSTE4bi5jaGlsZHJlbiwgbm9kZXMpO1xuXG4gICAgLy8gUmV1c2UgdGhlIHNvdXJjZS1zcGFucyBmcm9tIHRoZSBmaXJzdCBwYXNzLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG5vZGVzW2ldLnNvdXJjZVNwYW4gPSBwcmV2aW91c0kxOG4uY2hpbGRyZW5baV0uc291cmNlU3BhbjtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NlcnRzIHRoYXQgdGhlIGBtZXNzYWdlYCBjb250YWlucyBleGFjdGx5IG9uZSBgQ29udGFpbmVyYCBub2RlLlxuICovXG5mdW5jdGlvbiBhc3NlcnRTaW5nbGVDb250YWluZXJNZXNzYWdlKG1lc3NhZ2U6IGkxOG4uTWVzc2FnZSk6IHZvaWQge1xuICBjb25zdCBub2RlcyA9IG1lc3NhZ2Uubm9kZXM7XG4gIGlmIChub2Rlcy5sZW5ndGggIT09IDEgfHwgIShub2Rlc1swXSBpbnN0YW5jZW9mIGkxOG4uQ29udGFpbmVyKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1VuZXhwZWN0ZWQgcHJldmlvdXMgaTE4biBtZXNzYWdlIC0gZXhwZWN0ZWQgaXQgdG8gY29uc2lzdCBvZiBvbmx5IGEgc2luZ2xlIGBDb250YWluZXJgIG5vZGUuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NlcnRzIHRoYXQgdGhlIGBwcmV2aW91c05vZGVzYCBhbmQgYG5vZGVgIGNvbGxlY3Rpb25zIGhhdmUgdGhlIHNhbWUgbnVtYmVyIG9mIGVsZW1lbnRzIGFuZFxuICogY29ycmVzcG9uZGluZyBlbGVtZW50cyBoYXZlIHRoZSBzYW1lIG5vZGUgdHlwZS5cbiAqL1xuZnVuY3Rpb24gYXNzZXJ0RXF1aXZhbGVudE5vZGVzKHByZXZpb3VzTm9kZXM6IGkxOG4uTm9kZVtdLCBub2RlczogaTE4bi5Ob2RlW10pOiB2b2lkIHtcbiAgaWYgKHByZXZpb3VzTm9kZXMubGVuZ3RoICE9PSBub2Rlcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBudW1iZXIgb2YgaTE4biBtZXNzYWdlIGNoaWxkcmVuIGNoYW5nZWQgYmV0d2VlbiBmaXJzdCBhbmQgc2Vjb25kIHBhc3MuJyk7XG4gIH1cbiAgaWYgKHByZXZpb3VzTm9kZXMuc29tZSgobm9kZSwgaSkgPT4gbm9kZXNbaV0uY29uc3RydWN0b3IgIT09IG5vZGUuY29uc3RydWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIHR5cGVzIG9mIHRoZSBpMThuIG1lc3NhZ2UgY2hpbGRyZW4gY2hhbmdlZCBiZXR3ZWVuIGZpcnN0IGFuZCBzZWNvbmQgcGFzcy4nKTtcbiAgfVxufVxuXG5jb25zdCBfQ1VTVE9NX1BIX0VYUCA9XG4gICAgL1xcL1xcL1tcXHNcXFNdKmkxOG5bXFxzXFxTXSpcXChbXFxzXFxTXSpwaFtcXHNcXFNdKj1bXFxzXFxTXSooXCJ8JykoW1xcc1xcU10qPylcXDFbXFxzXFxTXSpcXCkvZztcblxuZnVuY3Rpb24gZXh0cmFjdFBsYWNlaG9sZGVyTmFtZShpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGlucHV0LnNwbGl0KF9DVVNUT01fUEhfRVhQKVsyXTtcbn1cbiJdfQ==