/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { identifierName } from '../parse_util';
import { EmitterVisitorContext } from './abstract_emitter';
import { AbstractJsEmitterVisitor } from './abstract_js_emitter';
import * as o from './output_ast';
import { newTrustedFunctionForJIT } from './output_jit_trusted_types';
/**
 * A helper class to manage the evaluation of JIT generated code.
 */
export class JitEvaluator {
    /**
     *
     * @param sourceUrl The URL of the generated code.
     * @param statements An array of Angular statement AST nodes to be evaluated.
     * @param reflector A helper used when converting the statements to executable code.
     * @param createSourceMaps If true then create a source-map for the generated code and include it
     * inline as a source-map comment.
     * @returns A map of all the variables in the generated code.
     */
    evaluateStatements(sourceUrl, statements, reflector, createSourceMaps) {
        const converter = new JitEmitterVisitor(reflector);
        const ctx = EmitterVisitorContext.createRoot();
        // Ensure generated code is in strict mode
        if (statements.length > 0 && !isUseStrictStatement(statements[0])) {
            statements = [
                o.literal('use strict').toStmt(),
                ...statements,
            ];
        }
        converter.visitAllStatements(statements, ctx);
        converter.createReturnStmt(ctx);
        return this.evaluateCode(sourceUrl, ctx, converter.getArgs(), createSourceMaps);
    }
    /**
     * Evaluate a piece of JIT generated code.
     * @param sourceUrl The URL of this generated code.
     * @param ctx A context object that contains an AST of the code to be evaluated.
     * @param vars A map containing the names and values of variables that the evaluated code might
     * reference.
     * @param createSourceMap If true then create a source-map for the generated code and include it
     * inline as a source-map comment.
     * @returns The result of evaluating the code.
     */
    evaluateCode(sourceUrl, ctx, vars, createSourceMap) {
        let fnBody = `"use strict";${ctx.toSource()}\n//# sourceURL=${sourceUrl}`;
        const fnArgNames = [];
        const fnArgValues = [];
        for (const argName in vars) {
            fnArgValues.push(vars[argName]);
            fnArgNames.push(argName);
        }
        if (createSourceMap) {
            // using `new Function(...)` generates a header, 1 line of no arguments, 2 lines otherwise
            // E.g. ```
            // function anonymous(a,b,c
            // /**/) { ... }```
            // We don't want to hard code this fact, so we auto detect it via an empty function first.
            const emptyFn = newTrustedFunctionForJIT(...fnArgNames.concat('return null;')).toString();
            const headerLines = emptyFn.slice(0, emptyFn.indexOf('return null;')).split('\n').length - 1;
            fnBody += `\n${ctx.toSourceMapGenerator(sourceUrl, headerLines).toJsComment()}`;
        }
        const fn = newTrustedFunctionForJIT(...fnArgNames.concat(fnBody));
        return this.executeFunction(fn, fnArgValues);
    }
    /**
     * Execute a JIT generated function by calling it.
     *
     * This method can be overridden in tests to capture the functions that are generated
     * by this `JitEvaluator` class.
     *
     * @param fn A function to execute.
     * @param args The arguments to pass to the function being executed.
     * @returns The return value of the executed function.
     */
    executeFunction(fn, args) {
        return fn(...args);
    }
}
/**
 * An Angular AST visitor that converts AST nodes into executable JavaScript code.
 */
export class JitEmitterVisitor extends AbstractJsEmitterVisitor {
    constructor(reflector) {
        super();
        this.reflector = reflector;
        this._evalArgNames = [];
        this._evalArgValues = [];
        this._evalExportedVars = [];
    }
    createReturnStmt(ctx) {
        const stmt = new o.ReturnStatement(new o.LiteralMapExpr(this._evalExportedVars.map(resultVar => new o.LiteralMapEntry(resultVar, o.variable(resultVar), false))));
        stmt.visitStatement(this, ctx);
    }
    getArgs() {
        const result = {};
        for (let i = 0; i < this._evalArgNames.length; i++) {
            result[this._evalArgNames[i]] = this._evalArgValues[i];
        }
        return result;
    }
    visitExternalExpr(ast, ctx) {
        this._emitReferenceToExternal(ast, this.reflector.resolveExternalReference(ast.value), ctx);
        return null;
    }
    visitWrappedNodeExpr(ast, ctx) {
        this._emitReferenceToExternal(ast, ast.node, ctx);
        return null;
    }
    visitDeclareVarStmt(stmt, ctx) {
        if (stmt.hasModifier(o.StmtModifier.Exported)) {
            this._evalExportedVars.push(stmt.name);
        }
        return super.visitDeclareVarStmt(stmt, ctx);
    }
    visitDeclareFunctionStmt(stmt, ctx) {
        if (stmt.hasModifier(o.StmtModifier.Exported)) {
            this._evalExportedVars.push(stmt.name);
        }
        return super.visitDeclareFunctionStmt(stmt, ctx);
    }
    visitDeclareClassStmt(stmt, ctx) {
        if (stmt.hasModifier(o.StmtModifier.Exported)) {
            this._evalExportedVars.push(stmt.name);
        }
        return super.visitDeclareClassStmt(stmt, ctx);
    }
    _emitReferenceToExternal(ast, value, ctx) {
        let id = this._evalArgValues.indexOf(value);
        if (id === -1) {
            id = this._evalArgValues.length;
            this._evalArgValues.push(value);
            const name = identifierName({ reference: value }) || 'val';
            this._evalArgNames.push(`jit_${name}_${id}`);
        }
        ctx.print(ast, this._evalArgNames[id]);
    }
}
function isUseStrictStatement(statement) {
    return statement.isEquivalent(o.literal('use strict').toStmt());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0X2ppdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2ppdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRTdDLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBQyx3QkFBd0IsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQy9ELE9BQU8sS0FBSyxDQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ2xDLE9BQU8sRUFBQyx3QkFBd0IsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXBFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFDdkI7Ozs7Ozs7O09BUUc7SUFDSCxrQkFBa0IsQ0FDZCxTQUFpQixFQUFFLFVBQXlCLEVBQUUsU0FBMkIsRUFDekUsZ0JBQXlCO1FBQzNCLE1BQU0sU0FBUyxHQUFHLElBQUksaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkQsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDL0MsMENBQTBDO1FBQzFDLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRSxVQUFVLEdBQUc7Z0JBQ1gsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hDLEdBQUcsVUFBVTthQUNkLENBQUM7U0FDSDtRQUNELFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDOUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sSUFBSSxD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QUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUM3QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN4QztRQUNELE9BQU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU8sd0JBQXdCLENBQUMsR0FBaUIsRUFBRSxLQUFVLEVBQUUsR0FBMEI7UUFFeEYsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDYixFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7WUFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLEVBQUMsU0FBUyxFQUFFLEtBQUssRUFBQyxDQUFDLElBQUksS0FBSyxDQUFDO1lBQ3pELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDOUM7UUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUNGO0FBR0QsU0FBUyxvQkFBb0IsQ0FBQyxTQUFzQjtJQUNsRCxPQUFPLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ2xFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlUmVmbGVjdG9yfSBmcm9tICcuLi9jb21waWxlX3JlZmxlY3Rvcic7XG5pbXBvcnQge2lkZW50aWZpZXJOYW1lfSBmcm9tICcuLi9wYXJzZV91dGlsJztcblxuaW1wb3J0IHtFbWl0dGVyVmlzaXRvckNvbnRleHR9IGZyb20gJy4vYWJzdHJhY3RfZW1pdHRlcic7XG5pbXBvcnQge0Fic3RyYWN0SnNFbWl0dGVyVmlzaXRvcn0gZnJvbSAnLi9hYnN0cmFjdF9qc19lbWl0dGVyJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnLi9vdXRwdXRfYXN0JztcbmltcG9ydCB7bmV3VHJ1c3RlZEZ1bmN0aW9uRm9ySklUfSBmcm9tICcuL291dHB1dF9qaXRfdHJ1c3RlZF90eXBlcyc7XG5cbi8qKlxuICogQSBoZWxwZXIgY2xhc3MgdG8gbWFuYWdlIHRoZSBldmFsdWF0aW9uIG9mIEpJVCBnZW5lcmF0ZWQgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEppdEV2YWx1YXRvciB7XG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlVXJsIFRoZSBVUkwgb2YgdGhlIGdlbmVyYXRlZCBjb2RlLlxuICAgKiBAcGFyYW0gc3RhdGVtZW50cyBBbiBhcnJheSBvZiBBbmd1bGFyIHN0YXRlbWVudCBBU1Qgbm9kZXMgdG8gYmUgZXZhbHVhdGVkLlxuICAgKiBAcGFyYW0gcmVmbGVjdG9yIEEgaGVscGVyIHVzZWQgd2hlbiBjb252ZXJ0aW5nIHRoZSBzdGF0ZW1lbnRzIHRvIGV4ZWN1dGFibGUgY29kZS5cbiAgICogQHBhcmFtIGNyZWF0ZVNvdXJjZU1hcHMgSWYgdHJ1ZSB0aGVuIGNyZWF0ZSBhIHNvdXJjZS1tYXAgZm9yIHRoZSBnZW5lcmF0ZWQgY29kZSBhbmQgaW5jbHVkZSBpdFxuICAgKiBpbmxpbmUgYXMgYSBzb3VyY2UtbWFwIGNvbW1lbnQuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIGFsbCB0aGUgdmFyaWFibGVzIGluIHRoZSBnZW5lcmF0ZWQgY29kZS5cbiAgICovXG4gIGV2YWx1YXRlU3RhdGVtZW50cyhcbiAgICAgIHNvdXJjZVVybDogc3RyaW5nLCBzdGF0ZW1lbnRzOiBvLlN0YXRlbWVudFtdLCByZWZsZWN0b3I6IENvbXBpbGVSZWZsZWN0b3IsXG4gICAgICBjcmVhdGVTb3VyY2VNYXBzOiBib29sZWFuKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBKaXRFbWl0dGVyVmlzaXRvcihyZWZsZWN0b3IpO1xuICAgIGNvbnN0IGN0eCA9IEVtaXR0ZXJWaXNpdG9yQ29udGV4dC5jcmVhdGVSb290KCk7XG4gICAgLy8gRW5zdXJlIGdlbmVyYXRlZCBjb2RlIGlzIGluIHN0cmljdCBtb2RlXG4gICAgaWYgKHN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiAhaXNVc2VTdHJpY3RTdGF0ZW1lbnQoc3RhdGVtZW50c1swXSkpIHtcbiAgICAgIHN0YXRlbWVudHMgPSBbXG4gICAgICAgIG8ubGl0ZXJhbCgndXNlIHN0cmljdCcpLnRvU3RtdCgpLFxuICAgICAgICAuLi5zdGF0ZW1lbnRzLFxuICAgICAgXTtcbiAgICB9XG4gICAgY29udmVydGVyLnZpc2l0QWxsU3RhdGVtZW50cyhzdGF0ZW1lbnRzLCBjdHgpO1xuICAgIGNvbnZlcnRlci5jcmVhdGVSZXR1cm5TdG10KGN0eCk7XG4gICAgcmV0dXJuIHRoaXMuZXZhbHVhdGVDb2RlKHNvdXJjZVVybCwgY3R4LCBjb252ZXJ0ZXIuZ2V0QXJncygpLCBjcmVhdGVTb3VyY2VNYXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmFsdWF0ZSBhIHBpZWNlIG9mIEpJVCBnZW5lcmF0ZWQgY29kZS5cbiAgICogQHBhcmFtIHNvdXJjZVVybCBUaGUgVVJMIG9mIHRoaXMgZ2VuZXJhdGVkIGNvZGUuXG4gICAqIEBwYXJhbSBjdHggQSBjb250ZXh0IG9iamVjdCB0aGF0IGNvbnRhaW5zIGFuIEFTVCBvZiB0aGUgY29kZSB0byBiZSBldmFsdWF0ZWQuXG4gICAqIEBwYXJhbSB2YXJzIEEgbWFwIGNvbnRhaW5pbmcgdGhlIG5hbWVzIGFuZCB2YWx1ZXMgb2YgdmFyaWFibGVzIHRoYXQgdGhlIGV2YWx1YXRlZCBjb2RlIG1pZ2h0XG4gICAqIHJlZmVyZW5jZS5cbiAgICogQHBhcmFtIGNyZWF0ZVNvdXJjZU1hcCBJZiB0cnVlIHRoZW4gY3JlYXRlIGEgc291cmNlLW1hcCBmb3IgdGhlIGdlbmVyYXRlZCBjb2RlIGFuZCBpbmNsdWRlIGl0XG4gICAqIGlubGluZSBhcyBhIHNvdXJjZS1tYXAgY29tbWVudC5cbiAgICogQHJldHVybnMgVGhlIHJlc3VsdCBvZiBldmFsdWF0aW5nIHRoZSBjb2RlLlxuICAgKi9cbiAgZXZhbHVhdGVDb2RlKFxuICAgICAgc291cmNlVXJsOiBzdHJpbmcsIGN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0LCB2YXJzOiB7W2tleTogc3RyaW5nXTogYW55fSxcbiAgICAgIGNyZWF0ZVNvdXJjZU1hcDogYm9vbGVhbik6IGFueSB7XG4gICAgbGV0IGZuQm9keSA9IGBcInVzZSBzdHJpY3RcIjske2N0eC50b1NvdXJjZSgpfVxcbi8vIyBzb3VyY2VVUkw9JHtzb3VyY2VVcmx9YDtcbiAgICBjb25zdCBmbkFyZ05hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGZuQXJnVmFsdWVzOiBhbnlbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgYXJnTmFtZSBpbiB2YXJzKSB7XG4gICAgICBmbkFyZ1ZhbHVlcy5wdXNoKHZhcnNbYXJnTmFtZV0pO1xuICAgICAgZm5BcmdOYW1lcy5wdXNoKGFyZ05hbWUpO1xuICAgIH1cbiAgICBpZiAoY3JlYXRlU291cmNlTWFwKSB7XG4gICAgICAvLyB1c2luZyBgbmV3IEZ1bmN0aW9uKC4uLilgIGdlbmVyYXRlcyBhIGhlYWRlciwgMSBsaW5lIG9mIG5vIGFyZ3VtZW50cywgMiBsaW5lcyBvdGhlcndpc2VcbiAgICAgIC8vIEUuZy4gYGBgXG4gICAgICAvLyBmdW5jdGlvbiBhbm9ueW1vdXMoYSxiLGNcbiAgICAgIC8vIC8qKi8pIHsgLi4uIH1gYGBcbiAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gaGFyZCBjb2RlIHRoaXMgZmFjdCwgc28gd2UgYXV0byBkZXRlY3QgaXQgdmlhIGFuIGVtcHR5IGZ1bmN0aW9uIGZpcnN0LlxuICAgICAgY29uc3QgZW1wdHlGbiA9IG5ld1RydXN0ZWRGdW5jdGlvbkZvckpJVCguLi5mbkFyZ05hbWVzLmNvbmNhdCgncmV0dXJuIG51bGw7JykpLnRvU3RyaW5nKCk7XG4gICAgICBjb25zdCBoZWFkZXJMaW5lcyA9IGVtcHR5Rm4uc2xpY2UoMCwgZW1wdHlGbi5pbmRleE9mKCdyZXR1cm4gbnVsbDsnKSkuc3BsaXQoJ1xcbicpLmxlbmd0aCAtIDE7XG4gICAgICBmbkJvZHkgKz0gYFxcbiR7Y3R4LnRvU291cmNlTWFwR2VuZXJhdG9yKHNvdXJjZVVybCwgaGVhZGVyTGluZXMpLnRvSnNDb21tZW50KCl9YDtcbiAgICB9XG4gICAgY29uc3QgZm4gPSBuZXdUcnVzdGVkRnVuY3Rpb25Gb3JKSVQoLi4uZm5BcmdOYW1lcy5jb25jYXQoZm5Cb2R5KSk7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZUZ1bmN0aW9uKGZuLCBmbkFyZ1ZhbHVlcyk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIEpJVCBnZW5lcmF0ZWQgZnVuY3Rpb24gYnkgY2FsbGluZyBpdC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGVzdHMgdG8gY2FwdHVyZSB0aGUgZnVuY3Rpb25zIHRoYXQgYXJlIGdlbmVyYXRlZFxuICAgKiBieSB0aGlzIGBKaXRFdmFsdWF0b3JgIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gQSBmdW5jdGlvbiB0byBleGVjdXRlLlxuICAgKiBAcGFyYW0gYXJncyBUaGUgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIGZ1bmN0aW9uIGJlaW5nIGV4ZWN1dGVkLlxuICAgKiBAcmV0dXJucyBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBleGVjdXRlZCBmdW5jdGlvbi5cbiAgICovXG4gIGV4ZWN1dGVGdW5jdGlvbihmbjogRnVuY3Rpb24sIGFyZ3M6IGFueVtdKSB7XG4gICAgcmV0dXJuIGZuKC4uLmFyZ3MpO1xuICB9XG59XG5cbi8qKlxuICogQW4gQW5ndWxhciBBU1QgdmlzaXRvciB0aGF0IGNvbnZlcnRzIEFTVCBub2RlcyBpbnRvIGV4ZWN1dGFibGUgSmF2YVNjcmlwdCBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgSml0RW1pdHRlclZpc2l0b3IgZXh0ZW5kcyBBYnN0cmFjdEpzRW1pdHRlclZpc2l0b3Ige1xuICBwcml2YXRlIF9ldmFsQXJnTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgX2V2YWxBcmdWYWx1ZXM6IGFueVtdID0gW107XG4gIHByaXZhdGUgX2V2YWxFeHBvcnRlZFZhcnM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWZsZWN0b3I6IENvbXBpbGVSZWZsZWN0b3IpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgY3JlYXRlUmV0dXJuU3RtdChjdHg6IEVtaXR0ZXJWaXNpdG9yQ29udGV4dCkge1xuICAgIGNvbnN0IHN0bXQgPSBuZXcgby5SZXR1cm5TdGF0ZW1lbnQobmV3IG8uTGl0ZXJhbE1hcEV4cHIodGhpcy5fZXZhbEV4cG9ydGVkVmFycy5tYXAoXG4gICAgICAgIHJlc3VsdFZhciA9PiBuZXcgby5MaXRlcmFsTWFwRW50cnkocmVzdWx0VmFyLCBvLnZhcmlhYmxlKHJlc3VsdFZhciksIGZhbHNlKSkpKTtcbiAgICBzdG10LnZpc2l0U3RhdGVtZW50KHRoaXMsIGN0eCk7XG4gIH1cblxuICBnZXRBcmdzKCk6IHtba2V5OiBzdHJpbmddOiBhbnl9IHtcbiAgICBjb25zdCByZXN1bHQ6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLl9ldmFsQXJnTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFt0aGlzLl9ldmFsQXJnTmFtZXNbaV1dID0gdGhpcy5fZXZhbEFyZ1ZhbHVlc1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIG92ZXJyaWRlIHZpc2l0RXh0ZXJuYWxFeHByKGFzdDogby5FeHRlcm5hbEV4cHIsIGN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0KTogYW55IHtcbiAgICB0aGlzLl9lbWl0UmVmZXJlbmNlVG9FeHRlcm5hbChhc3QsIHRoaXMucmVmbGVjdG9yLnJlc29sdmVFeHRlcm5hbFJlZmVyZW5jZShhc3QudmFsdWUpLCBjdHgpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgb3ZlcnJpZGUgdmlzaXRXcmFwcGVkTm9kZUV4cHIoYXN0OiBvLldyYXBwZWROb2RlRXhwcjxhbnk+LCBjdHg6IEVtaXR0ZXJWaXNpdG9yQ29udGV4dCk6IGFueSB7XG4gICAgdGhpcy5fZW1pdFJlZmVyZW5jZVRvRXh0ZXJuYWwoYXN0LCBhc3Qubm9kZSwgY3R4KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIG92ZXJyaWRlIHZpc2l0RGVjbGFyZVZhclN0bXQoc3RtdDogby5EZWNsYXJlVmFyU3RtdCwgY3R4OiBFbWl0dGVyVmlzaXRvckNvbnRleHQpOiBhbnkge1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKG8uU3RtdE1vZGlmaWVyLkV4cG9ydGVkKSkge1xuICAgICAgdGhpcy5fZXZhbEV4cG9ydGVkVmFycy5wdXNoKHN0bXQubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci52aXNpdERlY2xhcmVWYXJTdG10KHN0bXQsIGN0eCk7XG4gIH1cblxuICBvdmVycmlkZSB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogby5EZWNsYXJlRnVuY3Rpb25TdG10LCBjdHg6IEVtaXR0ZXJWaXNpdG9yQ29udGV4dCk6IGFueSB7XG4gICAgaWYgKHN0bXQuaGFzTW9kaWZpZXIoby5TdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICB0aGlzLl9ldmFsRXhwb3J0ZWRWYXJzLnB1c2goc3RtdC5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLnZpc2l0RGVjbGFyZUZ1bmN0aW9uU3RtdChzdG10LCBjdHgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdmlzaXREZWNsYXJlQ2xhc3NTdG10KHN0bXQ6IG8uQ2xhc3NTdG10LCBjdHg6IEVtaXR0ZXJWaXNpdG9yQ29udGV4dCk6IGFueSB7XG4gICAgaWYgKHN0bXQuaGFzTW9kaWZpZXIoby5TdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICB0aGlzLl9ldmFsRXhwb3J0ZWRWYXJzLnB1c2goc3RtdC5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLnZpc2l0RGVjbGFyZUNsYXNzU3RtdChzdG10LCBjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdFJlZmVyZW5jZVRvRXh0ZXJuYWwoYXN0OiBvLkV4cHJlc3Npb24sIHZhbHVlOiBhbnksIGN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0KTpcbiAgICAgIHZvaWQge1xuICAgIGxldCBpZCA9IHRoaXMuX2V2YWxBcmdWYWx1ZXMuaW5kZXhPZih2YWx1ZSk7XG4gICAgaWYgKGlkID09PSAtMSkge1xuICAgICAgaWQgPSB0aGlzLl9ldmFsQXJnVmFsdWVzLmxlbmd0aDtcbiAgICAgIHRoaXMuX2V2YWxBcmdWYWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICBjb25zdCBuYW1lID0gaWRlbnRpZmllck5hbWUoe3JlZmVyZW5jZTogdmFsdWV9KSB8fCAndmFsJztcbiAgICAgIHRoaXMuX2V2YWxBcmdOYW1lcy5wdXNoKGBqaXRfJHtuYW1lfV8ke2lkfWApO1xuICAgIH1cbiAgICBjdHgucHJpbnQoYXN0LCB0aGlzLl9ldmFsQXJnTmFtZXNbaWRdKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGlzVXNlU3RyaWN0U3RhdGVtZW50KHN0YXRlbWVudDogby5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHN0YXRlbWVudC5pc0VxdWl2YWxlbnQoby5saXRlcmFsKCd1c2Ugc3RyaWN0JykudG9TdG10KCkpO1xufVxuIl19