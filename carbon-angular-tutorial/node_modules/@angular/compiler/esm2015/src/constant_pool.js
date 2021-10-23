/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as o from './output/output_ast';
const CONSTANT_PREFIX = '_c';
/**
 * `ConstantPool` tries to reuse literal factories when two or more literals are identical.
 * We determine whether literals are identical by creating a key out of their AST using the
 * `KeyVisitor`. This constant is used to replace dynamic expressions which can't be safely
 * converted into a key. E.g. given an expression `{foo: bar()}`, since we don't know what
 * the result of `bar` will be, we create a key that looks like `{foo: <unknown>}`. Note
 * that we use a variable, rather than something like `null` in order to avoid collisions.
 */
const UNKNOWN_VALUE_KEY = o.variable('<unknown>');
/**
 * Context to use when producing a key.
 *
 * This ensures we see the constant not the reference variable when producing
 * a key.
 */
const KEY_CONTEXT = {};
/**
 * Generally all primitive values are excluded from the `ConstantPool`, but there is an exclusion
 * for strings that reach a certain length threshold. This constant defines the length threshold for
 * strings.
 */
const POOL_INCLUSION_LENGTH_THRESHOLD_FOR_STRINGS = 50;
/**
 * A node that is a place-holder that allows the node to be replaced when the actual
 * node is known.
 *
 * This allows the constant pool to change an expression from a direct reference to
 * a constant to a shared constant. It returns a fix-up node that is later allowed to
 * change the referenced expression.
 */
class FixupExpression extends o.Expression {
    constructor(resolved) {
        super(resolved.type);
        this.resolved = resolved;
        this.original = resolved;
    }
    visitExpression(visitor, context) {
        if (context === KEY_CONTEXT) {
            // When producing a key we want to traverse the constant not the
            // variable used to refer to it.
            return this.original.visitExpression(visitor, context);
        }
        else {
            return this.resolved.visitExpression(visitor, context);
        }
    }
    isEquivalent(e) {
        return e instanceof FixupExpression && this.resolved.isEquivalent(e.resolved);
    }
    isConstant() {
        return true;
    }
    fixup(expression) {
        this.resolved = expression;
        this.shared = true;
    }
}
/**
 * A constant pool allows a code emitter to share constant in an output context.
 *
 * The constant pool also supports sharing access to ivy definitions references.
 */
export class ConstantPool {
    constructor(isClosureCompilerEnabled = false) {
        this.isClosureCompilerEnabled = isClosureCompilerEnabled;
        this.statements = [];
        this.literals = new Map();
        this.literalFactories = new Map();
        this.injectorDefinitions = new Map();
        this.directiveDefinitions = new Map();
        this.componentDefinitions = new Map();
        this.pipeDefinitions = new Map();
        this.nextNameIndex = 0;
    }
    getConstLiteral(literal, forceShared) {
        if ((literal instanceof o.LiteralExpr && !isLongStringLiteral(literal)) ||
            literal instanceof FixupExpression) {
            // Do no put simple literals into the constant pool or try to produce a constant for a
            // reference to a constant.
            return literal;
        }
        const key = this.keyOf(literal);
        let fixup = this.literals.get(key);
        let newValue = false;
        if (!fixup) {
            fixup = new FixupExpression(literal);
            this.literals.set(key, fixup);
            newValue = true;
        }
        if ((!newValue && !fixup.shared) || (newValue && forceShared)) {
            // Replace the expression with a variable
            const name = this.freshName();
            let definition;
            let usage;
            if (this.isClosureCompilerEnabled && isLongStringLiteral(literal)) {
                // For string literals, Closure will **always** inline the string at
                // **all** usages, duplicating it each time. For large strings, this
                // unnecessarily bloats bundle size. To work around this restriction, we
                // wrap the string in a function, and call that function for each usage.
                // This tricks Closure into using inline logic for functions instead of
                // string literals. Function calls are only inlined if the body is small
                // enough to be worth it. By doing this, very large strings will be
                // shared across multiple usages, rather than duplicating the string at
                // each usage site.
                //
                // const myStr = function() { return "very very very long string"; };
                // const usage1 = myStr();
                // const usage2 = myStr();
                definition = o.variable(name).set(new o.FunctionExpr([], // Params.
                [
                    // Statements.
                    new o.ReturnStatement(literal),
                ]));
                usage = o.variable(name).callFn([]);
            }
            else {
                // Just declare and use the variable directly, without a function call
                // indirection. This saves a few bytes and avoids an unncessary call.
                definition = o.variable(name).set(literal);
                usage = o.variable(name);
            }
            this.statements.push(definition.toDeclStmt(o.INFERRED_TYPE, [o.StmtModifier.Final]));
            fixup.fixup(usage);
        }
        return fixup;
    }
    getDefinition(type, kind, ctx, forceShared = false) {
        const definitions = this.definitionsOf(kind);
        let fixup = definitions.get(type);
        let newValue = false;
        if (!fixup) {
            const property = this.propertyNameOf(kind);
            fixup = new FixupExpression(ctx.importExpr(type).prop(property));
            definitions.set(type, fixup);
            newValue = true;
        }
        if ((!newValue && !fixup.shared) || (newValue && forceShared)) {
            const name = this.freshName();
            this.statements.push(o.variable(name).set(fixup.resolved).toDeclStmt(o.INFERRED_TYPE, [o.StmtModifier.Final]));
            fixup.fixup(o.variable(name));
        }
        return fixup;
    }
    getLiteralFactory(literal) {
        // Create a pure function that builds an array of a mix of constant and variable expressions
        if (literal instanceof o.LiteralArrayExpr) {
            const argumentsForKey = literal.entries.map(e => e.isConstant() ? e : UNKNOWN_VALUE_KEY);
            const key = this.keyOf(o.literalArr(argumentsForKey));
            return this._getLiteralFactory(key, literal.entries, entries => o.literalArr(entries));
        }
        else {
            const expressionForKey = o.literalMap(literal.entries.map(e => ({
                key: e.key,
                value: e.value.isConstant() ? e.value : UNKNOWN_VALUE_KEY,
                quoted: e.quoted
            })));
            const key = this.keyOf(expressionForKey);
            return this._getLiteralFactory(key, literal.entries.map(e => e.value), entries => o.literalMap(entries.map((value, index) => ({
                key: literal.entries[index].key,
                value,
                quoted: literal.entries[index].quoted
            }))));
        }
    }
    _getLiteralFactory(key, values, resultMap) {
        let literalFactory = this.literalFactories.get(key);
        const literalFactoryArguments = values.filter((e => !e.isConstant()));
        if (!literalFactory) {
            const resultExpressions = values.map((e, index) => e.isConstant() ? this.getConstLiteral(e, true) : o.variable(`a${index}`));
            const parameters = resultExpressions.filter(isVariable).map(e => new o.FnParam(e.name, o.DYNAMIC_TYPE));
            const pureFunctionDeclaration = o.fn(parameters, [new o.ReturnStatement(resultMap(resultExpressions))], o.INFERRED_TYPE);
            const name = this.freshName();
            this.statements.push(o.variable(name).set(pureFunctionDeclaration).toDeclStmt(o.INFERRED_TYPE, [
                o.StmtModifier.Final
            ]));
            literalFactory = o.variable(name);
            this.literalFactories.set(key, literalFactory);
        }
        return { literalFactory, literalFactoryArguments };
    }
    /**
     * Produce a unique name.
     *
     * The name might be unique among different prefixes if any of the prefixes end in
     * a digit so the prefix should be a constant string (not based on user input) and
     * must not end in a digit.
     */
    uniqueName(prefix) {
        return `${prefix}${this.nextNameIndex++}`;
    }
    definitionsOf(kind) {
        switch (kind) {
            case 2 /* Component */:
                return this.componentDefinitions;
            case 1 /* Directive */:
                return this.directiveDefinitions;
            case 0 /* Injector */:
                return this.injectorDefinitions;
            case 3 /* Pipe */:
                return this.pipeDefinitions;
        }
    }
    propertyNameOf(kind) {
        switch (kind) {
            case 2 /* Component */:
                return 'ɵcmp';
            case 1 /* Directive */:
                return 'ɵdir';
            case 0 /* Injector */:
                return 'ɵinj';
            case 3 /* Pipe */:
                return 'ɵpipe';
        }
    }
    freshName() {
        return this.uniqueName(CONSTANT_PREFIX);
    }
    keyOf(expression) {
        return expression.visitExpression(new KeyVisitor(), KEY_CONTEXT);
    }
}
/**
 * Visitor used to determine if 2 expressions are equivalent and can be shared in the
 * `ConstantPool`.
 *
 * When the id (string) generated by the visitor is equal, expressions are considered equivalent.
 */
class KeyVisitor {
    constructor() {
        this.visitWrappedNodeExpr = invalid;
        this.visitWriteVarExpr = invalid;
        this.visitWriteKeyExpr = invalid;
        this.visitWritePropExpr = invalid;
        this.visitInvokeMethodExpr = invalid;
        this.visitInvokeFunctionExpr = invalid;
        this.visitTaggedTemplateExpr = invalid;
        this.visitInstantiateExpr = invalid;
        this.visitConditionalExpr = invalid;
        this.visitNotExpr = invalid;
        this.visitAssertNotNullExpr = invalid;
        this.visitCastExpr = invalid;
        this.visitFunctionExpr = invalid;
        this.visitUnaryOperatorExpr = invalid;
        this.visitBinaryOperatorExpr = invalid;
        this.visitReadPropExpr = invalid;
        this.visitReadKeyExpr = invalid;
        this.visitCommaExpr = invalid;
        this.visitLocalizedString = invalid;
    }
    visitLiteralExpr(ast) {
        return `${typeof ast.value === 'string' ? '"' + ast.value + '"' : ast.value}`;
    }
    visitLiteralArrayExpr(ast, context) {
        return `[${ast.entries.map(entry => entry.visitExpression(this, context)).join(',')}]`;
    }
    visitLiteralMapExpr(ast, context) {
        const mapKey = (entry) => {
            const quote = entry.quoted ? '"' : '';
            return `${quote}${entry.key}${quote}`;
        };
        const mapEntry = (entry) => `${mapKey(entry)}:${entry.value.visitExpression(this, context)}`;
        return `{${ast.entries.map(mapEntry).join(',')}`;
    }
    visitExternalExpr(ast) {
        return ast.value.moduleName ? `EX:${ast.value.moduleName}:${ast.value.name}` :
            `EX:${ast.value.runtime.name}`;
    }
    visitReadVarExpr(node) {
        return `VAR:${node.name}`;
    }
    visitTypeofExpr(node, context) {
        return `TYPEOF:${node.expr.visitExpression(this, context)}`;
    }
}
function invalid(arg) {
    throw new Error(`Invalid state: Visitor ${this.constructor.name} doesn't handle ${arg.constructor.name}`);
}
function isVariable(e) {
    return e instanceof o.ReadVarExpr;
}
function isLongStringLiteral(expr) {
    return expr instanceof o.LiteralExpr && typeof expr.value === 'string' &&
        expr.value.length >= POOL_INCLUSION_LENGTH_THRESHOLD_FOR_STRINGS;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRfcG9vbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9jb25zdGFudF9wb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sS0FBSyxDQUFDLE1BQU0scUJBQXFCLENBQUM7QUFFekMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBRTdCOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7QUFTbEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFFdkI7Ozs7R0FJRztBQUNILE1BQU0sMkNBQTJDLEdBQUcsRUFBRSxDQUFDO0FBRXZEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLGVBQWdCLFNBQVEsQ0FBQyxDQUFDLFVBQVU7SUFNeEMsWUFBbUIsUUFBc0I7UUFDdkMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQURKLGFBQVEsR0FBUixRQUFRLENBQWM7UUFFdkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDM0IsQ0FBQztJQUVRLGVBQWUsQ0FBQyxPQUE0QixFQUFFLE9BQVk7UUFDakUsSUFBSSxPQUFPLEtBQUssV0FBVyxFQUFFO1lBQzNCLGdFQUFnRTtZQUNoRSxnQ0FBZ0M7WUFDaEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDeEQ7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3hEO0lBQ0gsQ0FBQztJQUVRLFlBQVksQ0FBQyxDQUFlO1FBQ25DLE9BQU8sQ0FBQyxZQUFZLGVBQWUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFlB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a0I7SUFDN0MsT0FBTyxJQUFJLFlBQVksQ0FBQyxDQUFDLFdBQVcsSUFBSSxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUTtRQUNsRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSwyQ0FBMkMsQ0FBQztBQUN2RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIG8gZnJvbSAnLi9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmNvbnN0IENPTlNUQU5UX1BSRUZJWCA9ICdfYyc7XG5cbi8qKlxuICogYENvbnN0YW50UG9vbGAgdHJpZXMgdG8gcmV1c2UgbGl0ZXJhbCBmYWN0b3JpZXMgd2hlbiB0d28gb3IgbW9yZSBsaXRlcmFscyBhcmUgaWRlbnRpY2FsLlxuICogV2UgZGV0ZXJtaW5lIHdoZXRoZXIgbGl0ZXJhbHMgYXJlIGlkZW50aWNhbCBieSBjcmVhdGluZyBhIGtleSBvdXQgb2YgdGhlaXIgQVNUIHVzaW5nIHRoZVxuICogYEtleVZpc2l0b3JgLiBUaGlzIGNvbnN0YW50IGlzIHVzZWQgdG8gcmVwbGFjZSBkeW5hbWljIGV4cHJlc3Npb25zIHdoaWNoIGNhbid0IGJlIHNhZmVseVxuICogY29udmVydGVkIGludG8gYSBrZXkuIEUuZy4gZ2l2ZW4gYW4gZXhwcmVzc2lvbiBge2ZvbzogYmFyKCl9YCwgc2luY2Ugd2UgZG9uJ3Qga25vdyB3aGF0XG4gKiB0aGUgcmVzdWx0IG9mIGBiYXJgIHdpbGwgYmUsIHdlIGNyZWF0ZSBhIGtleSB0aGF0IGxvb2tzIGxpa2UgYHtmb286IDx1bmtub3duPn1gLiBOb3RlXG4gKiB0aGF0IHdlIHVzZSBhIHZhcmlhYmxlLCByYXRoZXIgdGhhbiBzb21ldGhpbmcgbGlrZSBgbnVsbGAgaW4gb3JkZXIgdG8gYXZvaWQgY29sbGlzaW9ucy5cbiAqL1xuY29uc3QgVU5LTk9XTl9WQUxVRV9LRVkgPSBvLnZhcmlhYmxlKCc8dW5rbm93bj4nKTtcblxuZXhwb3J0IGNvbnN0IGVudW0gRGVmaW5pdGlvbktpbmQge1xuICBJbmplY3RvcixcbiAgRGlyZWN0aXZlLFxuICBDb21wb25lbnQsXG4gIFBpcGVcbn1cblxuLyoqXG4gKiBDb250ZXh0IHRvIHVzZSB3aGVuIHByb2R1Y2luZyBhIGtleS5cbiAqXG4gKiBUaGlzIGVuc3VyZXMgd2Ugc2VlIHRoZSBjb25zdGFudCBub3QgdGhlIHJlZmVyZW5jZSB2YXJpYWJsZSB3aGVuIHByb2R1Y2luZ1xuICogYSBrZXkuXG4gKi9cbmNvbnN0IEtFWV9DT05URVhUID0ge307XG5cbi8qKlxuICogR2VuZXJhbGx5IGFsbCBwcmltaXRpdmUgdmFsdWVzIGFyZSBleGNsdWRlZCBmcm9tIHRoZSBgQ29uc3RhbnRQb29sYCwgYnV0IHRoZXJlIGlzIGFuIGV4Y2x1c2lvblxuICogZm9yIHN0cmluZ3MgdGhhdCByZWFjaCBhIGNlcnRhaW4gbGVuZ3RoIHRocmVzaG9sZC4gVGhpcyBjb25zdGFudCBkZWZpbmVzIHRoZSBsZW5ndGggdGhyZXNob2xkIGZvclxuICogc3RyaW5ncy5cbiAqL1xuY29uc3QgUE9PTF9JTkNMVVNJT05fTEVOR1RIX1RIUkVTSE9MRF9GT1JfU1RSSU5HUyA9IDUwO1xuXG4vKipcbiAqIEEgbm9kZSB0aGF0IGlzIGEgcGxhY2UtaG9sZGVyIHRoYXQgYWxsb3dzIHRoZSBub2RlIHRvIGJlIHJlcGxhY2VkIHdoZW4gdGhlIGFjdHVhbFxuICogbm9kZSBpcyBrbm93bi5cbiAqXG4gKiBUaGlzIGFsbG93cyB0aGUgY29uc3RhbnQgcG9vbCB0byBjaGFuZ2UgYW4gZXhwcmVzc2lvbiBmcm9tIGEgZGlyZWN0IHJlZmVyZW5jZSB0b1xuICogYSBjb25zdGFudCB0byBhIHNoYXJlZCBjb25zdGFudC4gSXQgcmV0dXJucyBhIGZpeC11cCBub2RlIHRoYXQgaXMgbGF0ZXIgYWxsb3dlZCB0b1xuICogY2hhbmdlIHRoZSByZWZlcmVuY2VkIGV4cHJlc3Npb24uXG4gKi9cbmNsYXNzIEZpeHVwRXhwcmVzc2lvbiBleHRlbmRzIG8uRXhwcmVzc2lvbiB7XG4gIHByaXZhdGUgb3JpZ2luYWw6IG8uRXhwcmVzc2lvbjtcblxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgc2hhcmVkITogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVzb2x2ZWQ6IG8uRXhwcmVzc2lvbikge1xuICAgIHN1cGVyKHJlc29sdmVkLnR5cGUpO1xuICAgIHRoaXMub3JpZ2luYWwgPSByZXNvbHZlZDtcbiAgfVxuXG4gIG92ZXJyaWRlIHZpc2l0RXhwcmVzc2lvbih2aXNpdG9yOiBvLkV4cHJlc3Npb25WaXNpdG9yLCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGlmIChjb250ZXh0ID09PSBLRVlfQ09OVEVYVCkge1xuICAgICAgLy8gV2hlbiBwcm9kdWNpbmcgYSBrZXkgd2Ugd2FudCB0byB0cmF2ZXJzZSB0aGUgY29uc3RhbnQgbm90IHRoZVxuICAgICAgLy8gdmFyaWFibGUgdXNlZCB0byByZWZlciB0byBpdC5cbiAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsLnZpc2l0RXhwcmVzc2lvbih2aXNpdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZWQudmlzaXRFeHByZXNzaW9uKHZpc2l0b3IsIGNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGlzRXF1aXZhbGVudChlOiBvLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gZSBpbnN0YW5jZW9mIEZpeHVwRXhwcmVzc2lvbiAmJiB0aGlzLnJlc29sdmVkLmlzRXF1aXZhbGVudChlLnJlc29sdmVkKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGlzQ29uc3RhbnQoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBmaXh1cChleHByZXNzaW9uOiBvLkV4cHJlc3Npb24pIHtcbiAgICB0aGlzLnJlc29sdmVkID0gZXhwcmVzc2lvbjtcbiAgICB0aGlzLnNoYXJlZCA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvbnN0YW50IHBvb2wgYWxsb3dzIGEgY29kZSBlbWl0dGVyIHRvIHNoYXJlIGNvbnN0YW50IGluIGFuIG91dHB1dCBjb250ZXh0LlxuICpcbiAqIFRoZSBjb25zdGFudCBwb29sIGFsc28gc3VwcG9ydHMgc2hhcmluZyBhY2Nlc3MgdG8gaXZ5IGRlZmluaXRpb25zIHJlZmVyZW5jZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb25zdGFudFBvb2wge1xuICBzdGF0ZW1lbnRzOiBvLlN0YXRlbWVudFtdID0gW107XG4gIHByaXZhdGUgbGl0ZXJhbHMgPSBuZXcgTWFwPHN0cmluZywgRml4dXBFeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGxpdGVyYWxGYWN0b3JpZXMgPSBuZXcgTWFwPHN0cmluZywgby5FeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGluamVjdG9yRGVmaW5pdGlvbnMgPSBuZXcgTWFwPGFueSwgRml4dXBFeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGRpcmVjdGl2ZURlZmluaXRpb25zID0gbmV3IE1hcDxhbnksIEZpeHVwRXhwcmVzc2lvbj4oKTtcbiAgcHJpdmF0ZSBjb21wb25lbnREZWZpbml0aW9ucyA9IG5ldyBNYXA8YW55LCBGaXh1cEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgcGlwZURlZmluaXRpb25zID0gbmV3IE1hcDxhbnksIEZpeHVwRXhwcmVzc2lvbj4oKTtcblxuICBwcml2YXRlIG5leHROYW1lSW5kZXggPSAwO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuID0gZmFsc2UpIHt9XG5cbiAgZ2V0Q29uc3RMaXRlcmFsKGxpdGVyYWw6IG8uRXhwcmVzc2lvbiwgZm9yY2VTaGFyZWQ/OiBib29sZWFuKTogby5FeHByZXNzaW9uIHtcbiAgICBpZiAoKGxpdGVyYWwgaW5zdGFuY2VvZiBvLkxpdGVyYWxFeHByICYmICFpc0xvbmdTdHJpbmdMaXRlcmFsKGxpdGVyYWwpKSB8fFxuICAgICAgICBsaXRlcmFsIGluc3RhbmNlb2YgRml4dXBFeHByZXNzaW9uKSB7XG4gICAgICAvLyBEbyBubyBwdXQgc2ltcGxlIGxpdGVyYWxzIGludG8gdGhlIGNvbnN0YW50IHBvb2wgb3IgdHJ5IHRvIHByb2R1Y2UgYSBjb25zdGFudCBmb3IgYVxuICAgICAgLy8gcmVmZXJlbmNlIHRvIGEgY29uc3RhbnQuXG4gICAgICByZXR1cm4gbGl0ZXJhbDtcbiAgICB9XG4gICAgY29uc3Qga2V5ID0gdGhpcy5rZXlPZihsaXRlcmFsKTtcbiAgICBsZXQgZml4dXAgPSB0aGlzLmxpdGVyYWxzLmdldChrZXkpO1xuICAgIGxldCBuZXdWYWx1ZSA9IGZhbHNlO1xuICAgIGlmICghZml4dXApIHtcbiAgICAgIGZpeHVwID0gbmV3IEZpeHVwRXhwcmVzc2lvbihsaXRlcmFsKTtcbiAgICAgIHRoaXMubGl0ZXJhbHMuc2V0KGtleSwgZml4dXApO1xuICAgICAgbmV3VmFsdWUgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICgoIW5ld1ZhbHVlICYmICFmaXh1cC5zaGFyZWQpIHx8IChuZXdWYWx1ZSAmJiBmb3JjZVNoYXJlZCkpIHtcbiAgICAgIC8vIFJlcGxhY2UgdGhlIGV4cHJlc3Npb24gd2l0aCBhIHZhcmlhYmxlXG4gICAgICBjb25zdCBuYW1lID0gdGhpcy5mcmVzaE5hbWUoKTtcbiAgICAgIGxldCBkZWZpbml0aW9uOiBvLldyaXRlVmFyRXhwcjtcbiAgICAgIGxldCB1c2FnZTogby5FeHByZXNzaW9uO1xuICAgICAgaWYgKHRoaXMuaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkICYmIGlzTG9uZ1N0cmluZ0xpdGVyYWwobGl0ZXJhbCkpIHtcbiAgICAgICAgLy8gRm9yIHN0cmluZyBsaXRlcmFscywgQ2xvc3VyZSB3aWxsICoqYWx3YXlzKiogaW5saW5lIHRoZSBzdHJpbmcgYXRcbiAgICAgICAgLy8gKiphbGwqKiB1c2FnZXMsIGR1cGxpY2F0aW5nIGl0IGVhY2ggdGltZS4gRm9yIGxhcmdlIHN0cmluZ3MsIHRoaXNcbiAgICAgICAgLy8gdW5uZWNlc3NhcmlseSBibG9hdHMgYnVuZGxlIHNpemUuIFRvIHdvcmsgYXJvdW5kIHRoaXMgcmVzdHJpY3Rpb24sIHdlXG4gICAgICAgIC8vIHdyYXAgdGhlIHN0cmluZyBpbiBhIGZ1bmN0aW9uLCBhbmQgY2FsbCB0aGF0IGZ1bmN0aW9uIGZvciBlYWNoIHVzYWdlLlxuICAgICAgICAvLyBUaGlzIHRyaWNrcyBDbG9zdXJlIGludG8gdXNpbmcgaW5saW5lIGxvZ2ljIGZvciBmdW5jdGlvbnMgaW5zdGVhZCBvZlxuICAgICAgICAvLyBzdHJpbmcgbGl0ZXJhbHMuIEZ1bmN0aW9uIGNhbGxzIGFyZSBvbmx5IGlubGluZWQgaWYgdGhlIGJvZHkgaXMgc21hbGxcbiAgICAgICAgLy8gZW5vdWdoIHRvIGJlIHdvcnRoIGl0LiBCeSBkb2luZyB0aGlzLCB2ZXJ5IGxhcmdlIHN0cmluZ3Mgd2lsbCBiZVxuICAgICAgICAvLyBzaGFyZWQgYWNyb3NzIG11bHRpcGxlIHVzYWdlcywgcmF0aGVyIHRoYW4gZHVwbGljYXRpbmcgdGhlIHN0cmluZyBhdFxuICAgICAgICAvLyBlYWNoIHVzYWdlIHNpdGUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGNvbnN0IG15U3RyID0gZnVuY3Rpb24oKSB7IHJldHVybiBcInZlcnkgdmVyeSB2ZXJ5IGxvbmcgc3RyaW5nXCI7IH07XG4gICAgICAgIC8vIGNvbnN0IHVzYWdlMSA9IG15U3RyKCk7XG4gICAgICAgIC8vIGNvbnN0IHVzYWdlMiA9IG15U3RyKCk7XG4gICAgICAgIGRlZmluaXRpb24gPSBvLnZhcmlhYmxlKG5hbWUpLnNldChuZXcgby5GdW5jdGlvbkV4cHIoXG4gICAgICAgICAgICBbXSwgIC8vIFBhcmFtcy5cbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgLy8gU3RhdGVtZW50cy5cbiAgICAgICAgICAgICAgbmV3IG8uUmV0dXJuU3RhdGVtZW50KGxpdGVyYWwpLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICkpO1xuICAgICAgICB1c2FnZSA9IG8udmFyaWFibGUobmFtZSkuY2FsbEZuKFtdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEp1c3QgZGVjbGFyZSBhbmQgdXNlIHRoZSB2YXJpYWJsZSBkaXJlY3RseSwgd2l0aG91dCBhIGZ1bmN0aW9uIGNhbGxcbiAgICAgICAgLy8gaW5kaXJlY3Rpb24uIFRoaXMgc2F2ZXMgYSBmZXcgYnl0ZXMgYW5kIGF2b2lkcyBhbiB1bm5jZXNzYXJ5IGNhbGwuXG4gICAgICAgIGRlZmluaXRpb24gPSBvLnZhcmlhYmxlKG5hbWUpLnNldChsaXRlcmFsKTtcbiAgICAgICAgdXNhZ2UgPSBvLnZhcmlhYmxlKG5hbWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YXRlbWVudHMucHVzaChkZWZpbml0aW9uLnRvRGVjbFN0bXQoby5JTkZFUlJFRF9UWVBFLCBbby5TdG10TW9kaWZpZXIuRmluYWxdKSk7XG4gICAgICBmaXh1cC5maXh1cCh1c2FnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpeHVwO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbih0eXBlOiBhbnksIGtpbmQ6IERlZmluaXRpb25LaW5kLCBjdHg6IE91dHB1dENvbnRleHQsIGZvcmNlU2hhcmVkOiBib29sZWFuID0gZmFsc2UpOlxuICAgICAgby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBkZWZpbml0aW9ucyA9IHRoaXMuZGVmaW5pdGlvbnNPZihraW5kKTtcbiAgICBsZXQgZml4dXAgPSBkZWZpbml0aW9ucy5nZXQodHlwZSk7XG4gICAgbGV0IG5ld1ZhbHVlID0gZmFsc2U7XG4gICAgaWYgKCFmaXh1cCkge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSB0aGlzLnByb3BlcnR5TmFtZU9mKGtpbmQpO1xuICAgICAgZml4dXAgPSBuZXcgRml4dXBFeHByZXNzaW9uKGN0eC5pbXBvcnRFeHByKHR5cGUpLnByb3AocHJvcGVydHkpKTtcbiAgICAgIGRlZmluaXRpb25zLnNldCh0eXBlLCBmaXh1cCk7XG4gICAgICBuZXdWYWx1ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCghbmV3VmFsdWUgJiYgIWZpeHVwLnNoYXJlZCkgfHwgKG5ld1ZhbHVlICYmIGZvcmNlU2hhcmVkKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHRoaXMuZnJlc2hOYW1lKCk7XG4gICAgICB0aGlzLnN0YXRlbWVudHMucHVzaChcbiAgICAgICAgICBvLnZhcmlhYmxlKG5hbWUpLnNldChmaXh1cC5yZXNvbHZlZCkudG9EZWNsU3RtdChvLklORkVSUkVEX1RZUEUsIFtvLlN0bXRNb2RpZmllci5GaW5hbF0pKTtcbiAgICAgIGZpeHVwLmZpeHVwKG8udmFyaWFibGUobmFtZSkpO1xuICAgIH1cbiAgICByZXR1cm4gZml4dXA7XG4gIH1cblxuICBnZXRMaXRlcmFsRmFjdG9yeShsaXRlcmFsOiBvLkxpdGVyYWxBcnJheUV4cHJ8by5MaXRlcmFsTWFwRXhwcik6XG4gICAgICB7bGl0ZXJhbEZhY3Rvcnk6IG8uRXhwcmVzc2lvbiwgbGl0ZXJhbEZhY3RvcnlBcmd1bWVudHM6IG8uRXhwcmVzc2lvbltdfSB7XG4gICAgLy8gQ3JlYXRlIGEgcHVyZSBmdW5jdGlvbiB0aGF0IGJ1aWxkcyBhbiBhcnJheSBvZiBhIG1peCBvZiBjb25zdGFudCBhbmQgdmFyaWFibGUgZXhwcmVzc2lvbnNcbiAgICBpZiAobGl0ZXJhbCBpbnN0YW5jZW9mIG8uTGl0ZXJhbEFycmF5RXhwcikge1xuICAgICAgY29uc3QgYXJndW1lbnRzRm9yS2V5ID0gbGl0ZXJhbC5lbnRyaWVzLm1hcChlID0+IGUuaXNDb25zdGFudCgpID8gZSA6IFVOS05PV05fVkFMVUVfS0VZKTtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMua2V5T2Yoby5saXRlcmFsQXJyKGFyZ3VtZW50c0ZvcktleSkpO1xuICAgICAgcmV0dXJuIHRoaXMuX2dldExpdGVyYWxGYWN0b3J5KGtleSwgbGl0ZXJhbC5lbnRyaWVzLCBlbnRyaWVzID0+IG8ubGl0ZXJhbEFycihlbnRyaWVzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25Gb3JLZXkgPSBvLmxpdGVyYWxNYXAoXG4gICAgICAgICAgbGl0ZXJhbC5lbnRyaWVzLm1hcChlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleTogZS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBlLnZhbHVlLmlzQ29uc3RhbnQoKSA/IGUudmFsdWUgOiBVTktOT1dOX1ZBTFVFX0tFWSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVvdGVkOiBlLnF1b3RlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMua2V5T2YoZXhwcmVzc2lvbkZvcktleSk7XG4gICAgICByZXR1cm4gdGhpcy5fZ2V0TGl0ZXJhbEZhY3RvcnkoXG4gICAgICAgICAga2V5LCBsaXRlcmFsLmVudHJpZXMubWFwKGUgPT4gZS52YWx1ZSksXG4gICAgICAgICAgZW50cmllcyA9PiBvLmxpdGVyYWxNYXAoZW50cmllcy5tYXAoKHZhbHVlLCBpbmRleCkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleTogbGl0ZXJhbC5lbnRyaWVzW2luZGV4XS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1b3RlZDogbGl0ZXJhbC5lbnRyaWVzW2luZGV4XS5xdW90ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRMaXRlcmFsRmFjdG9yeShcbiAgICAgIGtleTogc3RyaW5nLCB2YWx1ZXM6IG8uRXhwcmVzc2lvbltdLCByZXN1bHRNYXA6IChwYXJhbWV0ZXJzOiBvLkV4cHJlc3Npb25bXSkgPT4gby5FeHByZXNzaW9uKTpcbiAgICAgIHtsaXRlcmFsRmFjdG9yeTogby5FeHByZXNzaW9uLCBsaXRlcmFsRmFjdG9yeUFyZ3VtZW50czogby5FeHByZXNzaW9uW119IHtcbiAgICBsZXQgbGl0ZXJhbEZhY3RvcnkgPSB0aGlzLmxpdGVyYWxGYWN0b3JpZXMuZ2V0KGtleSk7XG4gICAgY29uc3QgbGl0ZXJhbEZhY3RvcnlBcmd1bWVudHMgPSB2YWx1ZXMuZmlsdGVyKChlID0+ICFlLmlzQ29uc3RhbnQoKSkpO1xuICAgIGlmICghbGl0ZXJhbEZhY3RvcnkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdEV4cHJlc3Npb25zID0gdmFsdWVzLm1hcChcbiAgICAgICAgICAoZSwgaW5kZXgpID0+IGUuaXNDb25zdGFudCgpID8gdGhpcy5nZXRDb25zdExpdGVyYWwoZSwgdHJ1ZSkgOiBvLnZhcmlhYmxlKGBhJHtpbmRleH1gKSk7XG4gICAgICBjb25zdCBwYXJhbWV0ZXJzID1cbiAgICAgICAgICByZXN1bHRFeHByZXNzaW9ucy5maWx0ZXIoaXNWYXJpYWJsZSkubWFwKGUgPT4gbmV3IG8uRm5QYXJhbShlLm5hbWUhLCBvLkRZTkFNSUNfVFlQRSkpO1xuICAgICAgY29uc3QgcHVyZUZ1bmN0aW9uRGVjbGFyYXRpb24gPVxuICAgICAgICAgIG8uZm4ocGFyYW1ldGVycywgW25ldyBvLlJldHVyblN0YXRlbWVudChyZXN1bHRNYXAocmVzdWx0RXhwcmVzc2lvbnMpKV0sIG8uSU5GRVJSRURfVFlQRSk7XG4gICAgICBjb25zdCBuYW1lID0gdGhpcy5mcmVzaE5hbWUoKTtcbiAgICAgIHRoaXMuc3RhdGVtZW50cy5wdXNoKFxuICAgICAgICAgIG8udmFyaWFibGUobmFtZSkuc2V0KHB1cmVGdW5jdGlvbkRlY2xhcmF0aW9uKS50b0RlY2xTdG10KG8uSU5GRVJSRURfVFlQRSwgW1xuICAgICAgICAgICAgby5TdG10TW9kaWZpZXIuRmluYWxcbiAgICAgICAgICBdKSk7XG4gICAgICBsaXRlcmFsRmFjdG9yeSA9IG8udmFyaWFibGUobmFtZSk7XG4gICAgICB0aGlzLmxpdGVyYWxGYWN0b3JpZXMuc2V0KGtleSwgbGl0ZXJhbEZhY3RvcnkpO1xuICAgIH1cbiAgICByZXR1cm4ge2xpdGVyYWxGYWN0b3J5LCBsaXRlcmFsRmFjdG9yeUFyZ3VtZW50c307XG4gIH1cblxuICAvKipcbiAgICogUHJvZHVjZSBhIHVuaXF1ZSBuYW1lLlxuICAgKlxuICAgKiBUaGUgbmFtZSBtaWdodCBiZSB1bmlxdWUgYW1vbmcgZGlmZmVyZW50IHByZWZpeGVzIGlmIGFueSBvZiB0aGUgcHJlZml4ZXMgZW5kIGluXG4gICAqIGEgZGlnaXQgc28gdGhlIHByZWZpeCBzaG91bGQgYmUgYSBjb25zdGFudCBzdHJpbmcgKG5vdCBiYXNlZCBvbiB1c2VyIGlucHV0KSBhbmRcbiAgICogbXVzdCBub3QgZW5kIGluIGEgZGlnaXQuXG4gICAqL1xuICB1bmlxdWVOYW1lKHByZWZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7cHJlZml4fSR7dGhpcy5uZXh0TmFtZUluZGV4Kyt9YDtcbiAgfVxuXG4gIHByaXZhdGUgZGVmaW5pdGlvbnNPZihraW5kOiBEZWZpbml0aW9uS2luZCk6IE1hcDxhbnksIEZpeHVwRXhwcmVzc2lvbj4ge1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgY2FzZSBEZWZpbml0aW9uS2luZC5Db21wb25lbnQ6XG4gICAgICAgIHJldHVybiB0aGlzLmNvbXBvbmVudERlZmluaXRpb25zO1xuICAgICAgY2FzZSBEZWZpbml0aW9uS2luZC5EaXJlY3RpdmU6XG4gICAgICAgIHJldHVybiB0aGlzLmRpcmVjdGl2ZURlZmluaXRpb25zO1xuICAgICAgY2FzZSBEZWZpbml0aW9uS2luZC5JbmplY3RvcjpcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0b3JEZWZpbml0aW9ucztcbiAgICAgIGNhc2UgRGVmaW5pdGlvbktpbmQuUGlwZTpcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZURlZmluaXRpb25zO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBwcm9wZXJ0eU5hbWVPZihraW5kOiBEZWZpbml0aW9uS2luZCk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChraW5kKSB7XG4gICAgICBjYXNlIERlZmluaXRpb25LaW5kLkNvbXBvbmVudDpcbiAgICAgICAgcmV0dXJuICfJtWNtcCc7XG4gICAgICBjYXNlIERlZmluaXRpb25LaW5kLkRpcmVjdGl2ZTpcbiAgICAgICAgcmV0dXJuICfJtWRpcic7XG4gICAgICBjYXNlIERlZmluaXRpb25LaW5kLkluamVjdG9yOlxuICAgICAgICByZXR1cm4gJ8m1aW5qJztcbiAgICAgIGNhc2UgRGVmaW5pdGlvbktpbmQuUGlwZTpcbiAgICAgICAgcmV0dXJuICfJtXBpcGUnO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZnJlc2hOYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudW5pcXVlTmFtZShDT05TVEFOVF9QUkVGSVgpO1xuICB9XG5cbiAgcHJpdmF0ZSBrZXlPZihleHByZXNzaW9uOiBvLkV4cHJlc3Npb24pIHtcbiAgICByZXR1cm4gZXhwcmVzc2lvbi52aXNpdEV4cHJlc3Npb24obmV3IEtleVZpc2l0b3IoKSwgS0VZX0NPTlRFWFQpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3V0cHV0Q29udGV4dCB7XG4gIGdlbkZpbGVQYXRoOiBzdHJpbmc7XG4gIHN0YXRlbWVudHM6IG8uU3RhdGVtZW50W107XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xuICBpbXBvcnRFeHByKHJlZmVyZW5jZTogYW55LCB0eXBlUGFyYW1zPzogby5UeXBlW118bnVsbCwgdXNlU3VtbWFyaWVzPzogYm9vbGVhbik6IG8uRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBWaXNpdG9yIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIDIgZXhwcmVzc2lvbnMgYXJlIGVxdWl2YWxlbnQgYW5kIGNhbiBiZSBzaGFyZWQgaW4gdGhlXG4gKiBgQ29uc3RhbnRQb29sYC5cbiAqXG4gKiBXaGVuIHRoZSBpZCAoc3RyaW5nKSBnZW5lcmF0ZWQgYnkgdGhlIHZpc2l0b3IgaXMgZXF1YWwsIGV4cHJlc3Npb25zIGFyZSBjb25zaWRlcmVkIGVxdWl2YWxlbnQuXG4gKi9cbmNsYXNzIEtleVZpc2l0b3IgaW1wbGVtZW50cyBvLkV4cHJlc3Npb25WaXNpdG9yIHtcbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IG8uTGl0ZXJhbEV4cHIpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0eXBlb2YgYXN0LnZhbHVlID09PSAnc3RyaW5nJyA/ICdcIicgKyBhc3QudmFsdWUgKyAnXCInIDogYXN0LnZhbHVlfWA7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoYXN0OiBvLkxpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IG9iamVjdCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBbJHthc3QuZW50cmllcy5tYXAoZW50cnkgPT4gZW50cnkudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKS5qb2luKCcsJyl9XWA7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGFzdDogby5MaXRlcmFsTWFwRXhwciwgY29udGV4dDogb2JqZWN0KTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXBLZXkgPSAoZW50cnk6IG8uTGl0ZXJhbE1hcEVudHJ5KSA9PiB7XG4gICAgICBjb25zdCBxdW90ZSA9IGVudHJ5LnF1b3RlZCA/ICdcIicgOiAnJztcbiAgICAgIHJldHVybiBgJHtxdW90ZX0ke2VudHJ5LmtleX0ke3F1b3RlfWA7XG4gICAgfTtcbiAgICBjb25zdCBtYXBFbnRyeSA9IChlbnRyeTogby5MaXRlcmFsTWFwRW50cnkpID0+XG4gICAgICAgIGAke21hcEtleShlbnRyeSl9OiR7ZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpfWA7XG4gICAgcmV0dXJuIGB7JHthc3QuZW50cmllcy5tYXAobWFwRW50cnkpLmpvaW4oJywnKX1gO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoYXN0OiBvLkV4dGVybmFsRXhwcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGFzdC52YWx1ZS5tb2R1bGVOYW1lID8gYEVYOiR7YXN0LnZhbHVlLm1vZHVsZU5hbWV9OiR7YXN0LnZhbHVlLm5hbWV9YCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYEVYOiR7YXN0LnZhbHVlLnJ1bnRpbWUubmFtZX1gO1xuICB9XG5cbiAgdmlzaXRSZWFkVmFyRXhwcihub2RlOiBvLlJlYWRWYXJFeHByKSB7XG4gICAgcmV0dXJuIGBWQVI6JHtub2RlLm5hbWV9YDtcbiAgfVxuXG4gIHZpc2l0VHlwZW9mRXhwcihub2RlOiBvLlR5cGVvZkV4cHIsIGNvbnRleHQ6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBUWVBFT0Y6JHtub2RlLmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpfWA7XG4gIH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwciA9IGludmFsaWQ7XG4gIHZpc2l0V3JpdGVWYXJFeHByID0gaW52YWxpZDtcbiAgdmlzaXRXcml0ZUtleUV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdFdyaXRlUHJvcEV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdEludm9rZU1ldGhvZEV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwciA9IGludmFsaWQ7XG4gIHZpc2l0VGFnZ2VkVGVtcGxhdGVFeHByID0gaW52YWxpZDtcbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdENvbmRpdGlvbmFsRXhwciA9IGludmFsaWQ7XG4gIHZpc2l0Tm90RXhwciA9IGludmFsaWQ7XG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdENhc3RFeHByID0gaW52YWxpZDtcbiAgdmlzaXRGdW5jdGlvbkV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdFVuYXJ5T3BlcmF0b3JFeHByID0gaW52YWxpZDtcbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdFJlYWRQcm9wRXhwciA9IGludmFsaWQ7XG4gIHZpc2l0UmVhZEtleUV4cHIgPSBpbnZhbGlkO1xuICB2aXNpdENvbW1hRXhwciA9IGludmFsaWQ7XG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nID0gaW52YWxpZDtcbn1cblxuZnVuY3Rpb24gaW52YWxpZDxUPih0aGlzOiBvLkV4cHJlc3Npb25WaXNpdG9yLCBhcmc6IG8uRXhwcmVzc2lvbnxvLlN0YXRlbWVudCk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEludmFsaWQgc3RhdGU6IFZpc2l0b3IgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9IGRvZXNuJ3QgaGFuZGxlICR7YXJnLmNvbnN0cnVjdG9yLm5hbWV9YCk7XG59XG5cbmZ1bmN0aW9uIGlzVmFyaWFibGUoZTogby5FeHByZXNzaW9uKTogZSBpcyBvLlJlYWRWYXJFeHByIHtcbiAgcmV0dXJuIGUgaW5zdGFuY2VvZiBvLlJlYWRWYXJFeHByO1xufVxuXG5mdW5jdGlvbiBpc0xvbmdTdHJpbmdMaXRlcmFsKGV4cHI6IG8uRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gZXhwciBpbnN0YW5jZW9mIG8uTGl0ZXJhbEV4cHIgJiYgdHlwZW9mIGV4cHIudmFsdWUgPT09ICdzdHJpbmcnICYmXG4gICAgICBleHByLnZhbHVlLmxlbmd0aCA+PSBQT09MX0lOQ0xVU0lPTl9MRU5HVEhfVEhSRVNIT0xEX0ZPUl9TVFJJTkdTO1xufVxuIl19