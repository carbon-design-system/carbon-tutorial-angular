(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler/src/render3/r3_factory", ["require", "exports", "@angular/compiler/src/output/output_ast", "@angular/compiler/src/render3/r3_identifiers", "@angular/compiler/src/render3/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isExpressionFactoryMetadata = exports.isDelegatedFactoryMetadata = exports.createFactoryType = exports.compileFactoryFunction = exports.FactoryTarget = exports.R3FactoryDelegateType = void 0;
    var o = require("@angular/compiler/src/output/output_ast");
    var r3_identifiers_1 = require("@angular/compiler/src/render3/r3_identifiers");
    var util_1 = require("@angular/compiler/src/render3/util");
    var R3FactoryDelegateType;
    (function (R3FactoryDelegateType) {
        R3FactoryDelegateType[R3FactoryDelegateType["Class"] = 0] = "Class";
        R3FactoryDelegateType[R3FactoryDelegateType["Function"] = 1] = "Function";
    })(R3FactoryDelegateType = exports.R3FactoryDelegateType || (exports.R3FactoryDelegateType = {}));
    var FactoryTarget;
    (function (FactoryTarget) {
        FactoryTarget[FactoryTarget["Directive"] = 0] = "Directive";
        FactoryTarget[FactoryTarget["Component"] = 1] = "Component";
        FactoryTarget[FactoryTarget["Injectable"] = 2] = "Injectable";
        FactoryTarget[FactoryTarget["Pipe"] = 3] = "Pipe";
        FactoryTarget[FactoryTarget["NgModule"] = 4] = "NgModule";
    })(FactoryTarget = exports.FactoryTarget || (exports.FactoryTarget = {}));
    /**
     * Construct a factory function expression for the given `R3FactoryMetadata`.
     */
    function compileFactoryFunction(meta) {
        var t = o.variable('t');
        var baseFactoryVar = null;
        // The type to instantiate via constructor invocation. If there is no delegated factory, meaning
        // this type is always created by constructor invocation, then this is the type-to-create
        // parameter provided by the user (t) if specified, or the current type if not. If there is a
        // delegated factory (which is used to create the current type) then this is only the type-to-
        // create parameter (t).
        var typeForCtor = !isDelegatedFactoryMetadata(meta) ?
            new o.BinaryOperatorExpr(o.BinaryOperator.Or, t, meta.internalType) :
            t;
        var ctorExpr = null;
        if (meta.deps !== null) {
            // There is a constructor (either explicitly or implicitly defined).
            if (meta.deps !== 'invalid') {
                ctorExpr = new o.InstantiateExpr(typeForCtor, injectDependencies(meta.deps, meta.target));
            }
        }
        else {
            // There is no constructor, use the base class' factory to construct typeForCtor.
            baseFactoryVar = o.variable("\u0275" + meta.name + "_BaseFactory");
            ctorExpr = baseFactoryVar.callFn([typeForCtor]);
        }
        var body = [];
        var retExpr = null;
        function makeConditionalFactory(nonCtorExpr) {
            var r = o.variable('r');
            body.push(r.set(o.NULL_EXPR).toDeclStmt());
            var ctorStmt = ctorExpr !== null ? r.set(ctorExpr).toStmt() :
                o.importExpr(r3_identifiers_1.Identifiers.invalidFactory).callFn([]).toStmt();
            body.push(o.ifStmt(t, [ctorStmt], [r.set(nonCtorExpr).toStmt()]));
            return r;
        }
        if (isDelegatedFactoryMetadata(meta)) {
            // This type is created with a delegated factory. If a type parameter is not specified, call
            // the factory instead.
            var delegateArgs = injectDependencies(meta.delegateDeps, meta.target);
            // Either call `new delegate(...)` or `delegate(...)` depending on meta.delegateType.
            var factoryExpr = new (meta.delegateType === R3FactoryDelegateType.Class ?
                o.InstantiateExpr :
                o.InvokeFunctionExpr)(meta.delegate, delegateArgs);
            retExpr = makeConditionalFactory(factoryExpr);
        }
        else if (isExpressionFactoryMetadata(meta)) {
            // TODO(alxhub): decide whether to lower the value here or in the caller
            retExpr = makeConditionalFactory(meta.expression);
        }
        else {
            retExpr = ctorExpr;
        }
        if (retExpr === null) {
            // The expression cannot be formed so render an `ɵɵinvalidFactory()` call.
            body.push(o.importExpr(r3_identifiers_1.Identifiers.invalidFactory).callFn([]).toStmt());
        }
        else if (baseFactoryVar !== null) {
            // This factory uses a base factory, so call `ɵɵgetInheritedFactory()` to compute it.
            var getInheritedFactoryCall = o.importExpr(r3_identifiers_1.Identifiers.getInheritedFactory).callFn([meta.internalType]);
            // Memoize the base factoryFn: `baseFactory || (baseFactory = ɵɵgetInheritedFactory(...))`
            var baseFactory = new o.BinaryOperatorExpr(o.BinaryOperator.Or, baseFactoryVar, baseFactoryVar.set(getInheritedFactoryCall));
            body.push(new o.ReturnStatement(baseFactory.callFn([typeForCtor])));
        }
        else {
            // This is straightforward factory, just return it.
            body.push(new o.ReturnStatement(retExpr));
        }
        var factoryFn = o.fn([new o.FnParam('t', o.DYNAMIC_TYPE)], body, o.INFERRED_TYPE, undefined, meta.name + "_Factory");
        if (baseFactoryVar !== null) {
            // There is a base factory variable so wrap its declaration along with the factory function into
            // an IIFE.
            factoryFn = o.fn([], [
                new o.DeclareVarStmt(baseFactoryVar.name), new o.ReturnStatement(factoryFn)
            ]).callFn([], /* sourceSpan */ undefined, /* pure */ true);
        }
        return {
            expression: factoryFn,
            statements: [],
            type: createFactoryType(meta),
        };
    }
    exports.compileFactoryFunction = compileFactoryFunction;
    function createFactoryType(meta) {
        var ctorDepsType = meta.deps !== null && meta.deps !== 'invalid' ? createCtorDepsType(meta.deps) : o.NONE_TYPE;
        return o.expressionType(o.importExpr(r3_identifiers_1.Identifiers.FactoryDeclaration, [util_1.typeWithParameters(meta.type.type, meta.typeArgumentCount), ctorDepsType]));
    }
    exports.createFactoryType = createFactoryType;
    function injectDependencies(deps, target) {
        return deps.map(function (dep, index) { return compileInjectDependency(dep, target, index); });
    }
    function compileInjectDependency(dep, target, index) {
        // Interpret the dependency according to its resolved type.
        if (dep.token === null) {
            return o.importExpr(r3_identifiers_1.Identifiers.invalidFactoryDep).callFn([o.literal(index)]);
        }
        else if (dep.attributeNameType === null) {
            // Build up the injection flags according to the metadata.
            var flags = 0 /* Default */ | (dep.self ? 2 /* Self */ : 0) |
                (dep.skipSelf ? 4 /* SkipSelf */ : 0) | (dep.host ? 1 /* Host */ : 0) |
                (dep.optional ? 8 /* Optional */ : 0) |
                (target === FactoryTarget.Pipe ? 16 /* ForPipe */ : 0);
            // If this dependency is optional or otherwise has non-default flags, then additional
            // parameters describing how to inject the dependency must be passed to the inject function
            // that's being used.
            var flagsParam = (flags !== 0 /* Default */ || dep.optional) ? o.literal(flags) : null;
            // Build up the arguments to the injectFn call.
            var injectArgs = [dep.token];
            if (flagsParam) {
                injectArgs.push(flagsParam);
            }
            var injectFn = getInjectFn(target);
            return o.importExpr(injectFn).callFn(injectArgs);
        }
        else {
            // The `dep.attributeTypeName` value is defined, which indicates that this is an `@Attribute()`
            // type dependency. For the generated JS we still want to use the `dep.token` value in case the
            // name given for the attribute is not a string literal. For example given `@Attribute(foo())`,
            // we want to generate `ɵɵinjectAttribute(foo())`.
            //
            // The `dep.attributeTypeName` is only actually used (in `createCtorDepType()`) to generate
            // typings.
            return o.importExpr(r3_identifiers_1.Identifiers.injectAttribute).callFn([dep.token]);
        }
    }
    function createCtorDepsType(deps) {
        var hasTypes = false;
        var attributeTypes = deps.map(function (dep) {
            var type = createCtorDepType(dep);
            if (type !== null) {
                hasTypes = true;
                return type;
            }
            else {
                return o.literal(null);
            }
        });
        if (hasTypes) {
            return o.expressionType(o.literalArr(attributeTypes));
        }
        else {
            return o.NONE_TYPE;
        }
    }
    function createCtorDepType(dep) {
        var entries = [];
        if (dep.attributeNameType !== null) {
            entries.push({ key: 'attribute', value: dep.attributeNameType, quoted: false });
        }
        if (dep.optional) {
            entries.push({ key: 'optional', value: o.literal(true), quoted: false });
        }
        if (dep.host) {
            entries.push({ key: 'host', value: o.literal(true), quoted: false });
        }
        if (dep.self) {
            entries.push({ key: 'self', value: o.literal(true), quoted: false });
        }
        if (dep.skipSelf) {
            entries.push({ key: 'skipSelf', value: o.literal(true), quoted: false });
        }
        return entries.length > 0 ? o.literalMap(entries) : null;
    }
    function isDelegatedFactoryMetadata(meta) {
        return meta.delegateType !== undefined;
    }
    exports.isDelegatedFactoryMetadata = isDelegatedFactoryMetadata;
    function isExpressionFactoryMetadata(meta) {
        return meta.expression !== undefined;
    }
    exports.isExpressionFactoryMetadata = isExpressionFactoryMetadata;
    function getInjectFn(target) {
        switch (target) {
            case FactoryTarget.Component:
            case FactoryTarget.Directive:
            case FactoryTarget.Pipe:
                return r3_identifiers_1.Identifiers.directiveInject;
            case FactoryTarget.NgModule:
            case FactoryTarget.Injectable:
            default:
                return r3_identifiers_1.Identifiers.inject;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicjNfZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBUUEsMkRBQTBDO0lBQzFDLCtFQUE0RDtJQUM1RCwyREFBNkU7SUE2QzdFLElBQVkscUJBR1g7SUFIRCxXQUFZLHFCQUFxQjtRQUMvQixtRUFBUyxDQUFBO1FBQ1QseUVBQVksQ0FBQTtJQUNkLENBQUMsRUFIVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUdoQztJQWVELElBQVksYUFNWDtJQU5ELFdBQVksYUFBYTtRQUN2QiwyREFBYSxDQUFBO1FBQ2IsMkRBQWEsQ0FBQTtRQUNiLDZEQUFjLENBQUE7UUFDZCxpREFBUSxDQUFBO1FBQ1IseURBQVksQ0FBQTtJQUNkLENBQUMsRUFOVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQU14QjtJQXFDRDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUFDLElBQXVCO1FBQzVELElBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsSUFBSSxjQUFjLEdBQXVCLElBQUksQ0FBQztRQUU5QyxnR0FBZ0c7UUFDaEcseUZBQXlGO1FBQ3pGLDZGQUE2RjtRQUM3Riw4RkFBOEY7UUFDOUYsd0JBQXdCO1FBQ3hCLElBQU0sV0FBVyxHQUFHLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDckUsQ0FBQyxDQUFDO1FBRU4sSUFBSSxRQUFRLEdBQXNCLElBQUksQ0FBQztRQUN2QyxJQUFJLElB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QVMsQ0FBQztZQUM3QixLQUFLLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDN0IsS0FBSyxhQUFhLENBQUMsSUFBSTtnQkFDckIsT0FBTyw0QkFBRSxDQUFDLGVBQWUsQ0FBQztZQUM1QixLQUFLLGFBQWEsQ0FBQyxRQUFRLENBQUM7WUFDNUIsS0FBSyxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQzlCO2dCQUNFLE9BQU8sNEJBQUUsQ0FBQyxNQUFNLENBQUM7U0FDcEI7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0luamVjdEZsYWdzfSBmcm9tICcuLi9jb3JlJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnLi4vb3V0cHV0L291dHB1dF9hc3QnO1xuaW1wb3J0IHtJZGVudGlmaWVycyBhcyBSM30gZnJvbSAnLi4vcmVuZGVyMy9yM19pZGVudGlmaWVycyc7XG5pbXBvcnQge1IzQ29tcGlsZWRFeHByZXNzaW9uLCBSM1JlZmVyZW5jZSwgdHlwZVdpdGhQYXJhbWV0ZXJzfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWV0YWRhdGEgcmVxdWlyZWQgYnkgdGhlIGZhY3RvcnkgZ2VuZXJhdG9yIHRvIGdlbmVyYXRlIGEgYGZhY3RvcnlgIGZ1bmN0aW9uIGZvciBhIHR5cGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUjNDb25zdHJ1Y3RvckZhY3RvcnlNZXRhZGF0YSB7XG4gIC8qKlxuICAgKiBTdHJpbmcgbmFtZSBvZiB0aGUgdHlwZSBiZWluZyBnZW5lcmF0ZWQgKHVzZWQgdG8gbmFtZSB0aGUgZmFjdG9yeSBmdW5jdGlvbikuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSBpbnRlcmZhY2UgdHlwZSBiZWluZyBjb25zdHJ1Y3RlZC5cbiAgICovXG4gIHR5cGU6IFIzUmVmZXJlbmNlO1xuXG4gIC8qKlxuICAgKiBBbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgY29uc3RydWN0b3IgdHlwZSwgaW50ZW5kZWQgZm9yIHVzZSB3aXRoaW4gYSBjbGFzcyBkZWZpbml0aW9uXG4gICAqIGl0c2VsZi5cbiAgICpcbiAgICogVGhpcyBjYW4gZGlmZmVyIGZyb20gdGhlIG91dGVyIGB0eXBlYCBpZiB0aGUgY2xhc3MgaXMgYmVpbmcgY29tcGlsZWQgYnkgbmdjYyBhbmQgaXMgaW5zaWRlXG4gICAqIGFuIElJRkUgc3RydWN0dXJlIHRoYXQgdXNlcyBhIGRpZmZlcmVudCBuYW1lIGludGVybmFsbHkuXG4gICAqL1xuICBpbnRlcm5hbFR5cGU6IG8uRXhwcmVzc2lvbjtcblxuICAvKiogTnVtYmVyIG9mIGFyZ3VtZW50cyBmb3IgdGhlIGB0eXBlYC4gKi9cbiAgdHlwZUFyZ3VtZW50Q291bnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogUmVnYXJkbGVzcyBvZiB3aGV0aGVyIGBmbk9yQ2xhc3NgIGlzIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gb3IgYSB1c2VyLWRlZmluZWQgZmFjdG9yeSwgaXRcbiAgICogbWF5IGhhdmUgMCBvciBtb3JlIHBhcmFtZXRlcnMsIHdoaWNoIHdpbGwgYmUgaW5qZWN0ZWQgYWNjb3JkaW5nIHRvIHRoZSBgUjNEZXBlbmRlbmN5TWV0YWRhdGFgXG4gICAqIGZvciB0aG9zZSBwYXJhbWV0ZXJzLiBJZiB0aGlzIGlzIGBudWxsYCwgdGhlbiB0aGUgdHlwZSdzIGNvbnN0cnVjdG9yIGlzIG5vbmV4aXN0ZW50IGFuZCB3aWxsXG4gICAqIGJlIGluaGVyaXRlZCBmcm9tIGBmbk9yQ2xhc3NgIHdoaWNoIGlzIGludGVycHJldGVkIGFzIHRoZSBjdXJyZW50IHR5cGUuIElmIHRoaXMgaXMgYCdpbnZhbGlkJ2AsXG4gICAqIHRoZW4gb25lIG9yIG1vcmUgb2YgdGhlIHBhcmFtZXRlcnMgd2Fzbid0IHJlc29sdmFibGUgYW5kIGFueSBhdHRlbXB0IHRvIHVzZSB0aGVzZSBkZXBzIHdpbGxcbiAgICogcmVzdWx0IGluIGEgcnVudGltZSBlcnJvci5cbiAgICovXG4gIGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118J2ludmFsaWQnfG51bGw7XG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgdGhlIHRhcmdldCBiZWluZyBjcmVhdGVkIGJ5IHRoZSBmYWN0b3J5LlxuICAgKi9cbiAgdGFyZ2V0OiBGYWN0b3J5VGFyZ2V0O1xufVxuXG5leHBvcnQgZW51bSBSM0ZhY3RvcnlEZWxlZ2F0ZVR5cGUge1xuICBDbGFzcyA9IDAsXG4gIEZ1bmN0aW9uID0gMSxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlbGVnYXRlZEZuT3JDbGFzc01ldGFkYXRhIGV4dGVuZHMgUjNDb25zdHJ1Y3RvckZhY3RvcnlNZXRhZGF0YSB7XG4gIGRlbGVnYXRlOiBvLkV4cHJlc3Npb247XG4gIGRlbGVnYXRlVHlwZTogUjNGYWN0b3J5RGVsZWdhdGVUeXBlO1xuICBkZWxlZ2F0ZURlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNFeHByZXNzaW9uRmFjdG9yeU1ldGFkYXRhIGV4dGVuZHMgUjNDb25zdHJ1Y3RvckZhY3RvcnlNZXRhZGF0YSB7XG4gIGV4cHJlc3Npb246IG8uRXhwcmVzc2lvbjtcbn1cblxuZXhwb3J0IHR5cGUgUjNGYWN0b3J5TWV0YWRhdGEgPVxuICAgIFIzQ29uc3RydWN0b3JGYWN0b3J5TWV0YWRhdGF8UjNEZWxlZ2F0ZWRGbk9yQ2xhc3NNZXRhZGF0YXxSM0V4cHJlc3Npb25GYWN0b3J5TWV0YWRhdGE7XG5cbmV4cG9ydCBlbnVtIEZhY3RvcnlUYXJnZXQge1xuICBEaXJlY3RpdmUgPSAwLFxuICBDb21wb25lbnQgPSAxLFxuICBJbmplY3RhYmxlID0gMixcbiAgUGlwZSA9IDMsXG4gIE5nTW9kdWxlID0gNCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlcGVuZGVuY3lNZXRhZGF0YSB7XG4gIC8qKlxuICAgKiBBbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgdG9rZW4gb3IgdmFsdWUgdG8gYmUgaW5qZWN0ZWQuXG4gICAqIE9yIGBudWxsYCBpZiB0aGUgZGVwZW5kZW5jeSBjb3VsZCBub3QgYmUgcmVzb2x2ZWQgLSBtYWtpbmcgaXQgaW52YWxpZC5cbiAgICovXG4gIHRva2VuOiBvLkV4cHJlc3Npb258bnVsbDtcblxuICAvKipcbiAgICogSWYgYW4gQEF0dHJpYnV0ZSBkZWNvcmF0b3IgaXMgcHJlc2VudCwgdGhpcyBpcyB0aGUgbGl0ZXJhbCB0eXBlIG9mIHRoZSBhdHRyaWJ1dGUgbmFtZSwgb3JcbiAgICogdGhlIHVua25vd24gdHlwZSBpZiBubyBsaXRlcmFsIHR5cGUgaXMgYXZhaWxhYmxlIChlLmcuIHRoZSBhdHRyaWJ1dGUgbmFtZSBpcyBhbiBleHByZXNzaW9uKS5cbiAgICogT3RoZXJ3aXNlIGl0IGlzIG51bGw7XG4gICAqL1xuICBhdHRyaWJ1dGVOYW1lVHlwZTogby5FeHByZXNzaW9ufG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGRlcGVuZGVuY3kgaGFzIGFuIEBIb3N0IHF1YWxpZmllci5cbiAgICovXG4gIGhvc3Q6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGRlcGVuZGVuY3kgaGFzIGFuIEBPcHRpb25hbCBxdWFsaWZpZXIuXG4gICAqL1xuICBvcHRpb25hbDogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgZGVwZW5kZW5jeSBoYXMgYW4gQFNlbGYgcXVhbGlmaWVyLlxuICAgKi9cbiAgc2VsZjogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgZGVwZW5kZW5jeSBoYXMgYW4gQFNraXBTZWxmIHF1YWxpZmllci5cbiAgICovXG4gIHNraXBTZWxmOiBib29sZWFuO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIGZhY3RvcnkgZnVuY3Rpb24gZXhwcmVzc2lvbiBmb3IgdGhlIGdpdmVuIGBSM0ZhY3RvcnlNZXRhZGF0YWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlRmFjdG9yeUZ1bmN0aW9uKG1ldGE6IFIzRmFjdG9yeU1ldGFkYXRhKTogUjNDb21waWxlZEV4cHJlc3Npb24ge1xuICBjb25zdCB0ID0gby52YXJpYWJsZSgndCcpO1xuICBsZXQgYmFzZUZhY3RvcnlWYXI6IG8uUmVhZFZhckV4cHJ8bnVsbCA9IG51bGw7XG5cbiAgLy8gVGhlIHR5cGUgdG8gaW5zdGFudGlhdGUgdmlhIGNvbnN0cnVjdG9yIGludm9jYXRpb24uIElmIHRoZXJlIGlzIG5vIGRlbGVnYXRlZCBmYWN0b3J5LCBtZWFuaW5nXG4gIC8vIHRoaXMgdHlwZSBpcyBhbHdheXMgY3JlYXRlZCBieSBjb25zdHJ1Y3RvciBpbnZvY2F0aW9uLCB0aGVuIHRoaXMgaXMgdGhlIHR5cGUtdG8tY3JlYXRlXG4gIC8vIHBhcmFtZXRlciBwcm92aWRlZCBieSB0aGUgdXNlciAodCkgaWYgc3BlY2lmaWVkLCBvciB0aGUgY3VycmVudCB0eXBlIGlmIG5vdC4gSWYgdGhlcmUgaXMgYVxuICAvLyBkZWxlZ2F0ZWQgZmFjdG9yeSAod2hpY2ggaXMgdXNlZCB0byBjcmVhdGUgdGhlIGN1cnJlbnQgdHlwZSkgdGhlbiB0aGlzIGlzIG9ubHkgdGhlIHR5cGUtdG8tXG4gIC8vIGNyZWF0ZSBwYXJhbWV0ZXIgKHQpLlxuICBjb25zdCB0eXBlRm9yQ3RvciA9ICFpc0RlbGVnYXRlZEZhY3RvcnlNZXRhZGF0YShtZXRhKSA/XG4gICAgICBuZXcgby5CaW5hcnlPcGVyYXRvckV4cHIoby5CaW5hcnlPcGVyYXRvci5PciwgdCwgbWV0YS5pbnRlcm5hbFR5cGUpIDpcbiAgICAgIHQ7XG5cbiAgbGV0IGN0b3JFeHByOiBvLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gIGlmIChtZXRhLmRlcHMgIT09IG51bGwpIHtcbiAgICAvLyBUaGVyZSBpcyBhIGNvbnN0cnVjdG9yIChlaXRoZXIgZXhwbGljaXRseSBvciBpbXBsaWNpdGx5IGRlZmluZWQpLlxuICAgIGlmIChtZXRhLmRlcHMgIT09ICdpbnZhbGlkJykge1xuICAgICAgY3RvckV4cHIgPSBuZXcgby5JbnN0YW50aWF0ZUV4cHIodHlwZUZvckN0b3IsIGluamVjdERlcGVuZGVuY2llcyhtZXRhLmRlcHMsIG1ldGEudGFyZ2V0KSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIFRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLCB1c2UgdGhlIGJhc2UgY2xhc3MnIGZhY3RvcnkgdG8gY29uc3RydWN0IHR5cGVGb3JDdG9yLlxuICAgIGJhc2VGYWN0b3J5VmFyID0gby52YXJpYWJsZShgybUke21ldGEubmFtZX1fQmFzZUZhY3RvcnlgKTtcbiAgICBjdG9yRXhwciA9IGJhc2VGYWN0b3J5VmFyLmNhbGxGbihbdHlwZUZvckN0b3JdKTtcbiAgfVxuXG4gIGNvbnN0IGJvZHk6IG8uU3RhdGVtZW50W10gPSBbXTtcbiAgbGV0IHJldEV4cHI6IG8uRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICBmdW5jdGlvbiBtYWtlQ29uZGl0aW9uYWxGYWN0b3J5KG5vbkN0b3JFeHByOiBvLkV4cHJlc3Npb24pOiBvLlJlYWRWYXJFeHByIHtcbiAgICBjb25zdCByID0gby52YXJpYWJsZSgncicpO1xuICAgIGJvZHkucHVzaChyLnNldChvLk5VTExfRVhQUikudG9EZWNsU3RtdCgpKTtcbiAgICBjb25zdCBjdG9yU3RtdCA9IGN0b3JFeHByICE9PSBudWxsID8gci5zZXQoY3RvckV4cHIpLnRvU3RtdCgpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgby5pbXBvcnRFeHByKFIzLmludmFsaWRGYWN0b3J5KS5jYWxsRm4oW10pLnRvU3RtdCgpO1xuICAgIGJvZHkucHVzaChvLmlmU3RtdCh0LCBbY3RvclN0bXRdLCBbci5zZXQobm9uQ3RvckV4cHIpLnRvU3RtdCgpXSkpO1xuICAgIHJldHVybiByO1xuICB9XG5cbiAgaWYgKGlzRGVsZWdhdGVkRmFjdG9yeU1ldGFkYXRhKG1ldGEpKSB7XG4gICAgLy8gVGhpcyB0eXBlIGlzIGNyZWF0ZWQgd2l0aCBhIGRlbGVnYXRlZCBmYWN0b3J5LiBJZiBhIHR5cGUgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQsIGNhbGxcbiAgICAvLyB0aGUgZmFjdG9yeSBpbnN0ZWFkLlxuICAgIGNvbnN0IGRlbGVnYXRlQXJncyA9IGluamVjdERlcGVuZGVuY2llcyhtZXRhLmRlbGVnYXRlRGVwcywgbWV0YS50YXJnZXQpO1xuICAgIC8vIEVpdGhlciBjYWxsIGBuZXcgZGVsZWdhdGUoLi4uKWAgb3IgYGRlbGVnYXRlKC4uLilgIGRlcGVuZGluZyBvbiBtZXRhLmRlbGVnYXRlVHlwZS5cbiAgICBjb25zdCBmYWN0b3J5RXhwciA9IG5ldyAoXG4gICAgICAgIG1ldGEuZGVsZWdhdGVUeXBlID09PSBSM0ZhY3RvcnlEZWxlZ2F0ZVR5cGUuQ2xhc3MgP1xuICAgICAgICAgICAgby5JbnN0YW50aWF0ZUV4cHIgOlxuICAgICAgICAgICAgby5JbnZva2VGdW5jdGlvbkV4cHIpKG1ldGEuZGVsZWdhdGUsIGRlbGVnYXRlQXJncyk7XG4gICAgcmV0RXhwciA9IG1ha2VDb25kaXRpb25hbEZhY3RvcnkoZmFjdG9yeUV4cHIpO1xuICB9IGVsc2UgaWYgKGlzRXhwcmVzc2lvbkZhY3RvcnlNZXRhZGF0YShtZXRhKSkge1xuICAgIC8vIFRPRE8oYWx4aHViKTogZGVjaWRlIHdoZXRoZXIgdG8gbG93ZXIgdGhlIHZhbHVlIGhlcmUgb3IgaW4gdGhlIGNhbGxlclxuICAgIHJldEV4cHIgPSBtYWtlQ29uZGl0aW9uYWxGYWN0b3J5KG1ldGEuZXhwcmVzc2lvbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0RXhwciA9IGN0b3JFeHByO1xuICB9XG5cblxuICBpZiAocmV0RXhwciA9PT0gbnVsbCkge1xuICAgIC8vIFRoZSBleHByZXNzaW9uIGNhbm5vdCBiZSBmb3JtZWQgc28gcmVuZGVyIGFuIGDJtcm1aW52YWxpZEZhY3RvcnkoKWAgY2FsbC5cbiAgICBib2R5LnB1c2goby5pbXBvcnRFeHByKFIzLmludmFsaWRGYWN0b3J5KS5jYWxsRm4oW10pLnRvU3RtdCgpKTtcbiAgfSBlbHNlIGlmIChiYXNlRmFjdG9yeVZhciAhPT0gbnVsbCkge1xuICAgIC8vIFRoaXMgZmFjdG9yeSB1c2VzIGEgYmFzZSBmYWN0b3J5LCBzbyBjYWxsIGDJtcm1Z2V0SW5oZXJpdGVkRmFjdG9yeSgpYCB0byBjb21wdXRlIGl0LlxuICAgIGNvbnN0IGdldEluaGVyaXRlZEZhY3RvcnlDYWxsID1cbiAgICAgICAgby5pbXBvcnRFeHByKFIzLmdldEluaGVyaXRlZEZhY3RvcnkpLmNhbGxGbihbbWV0YS5pbnRlcm5hbFR5cGVdKTtcbiAgICAvLyBNZW1vaXplIHRoZSBiYXNlIGZhY3RvcnlGbjogYGJhc2VGYWN0b3J5IHx8IChiYXNlRmFjdG9yeSA9IMm1ybVnZXRJbmhlcml0ZWRGYWN0b3J5KC4uLikpYFxuICAgIGNvbnN0IGJhc2VGYWN0b3J5ID0gbmV3IG8uQmluYXJ5T3BlcmF0b3JFeHByKFxuICAgICAgICBvLkJpbmFyeU9wZXJhdG9yLk9yLCBiYXNlRmFjdG9yeVZhciwgYmFzZUZhY3RvcnlWYXIuc2V0KGdldEluaGVyaXRlZEZhY3RvcnlDYWxsKSk7XG4gICAgYm9keS5wdXNoKG5ldyBvLlJldHVyblN0YXRlbWVudChiYXNlRmFjdG9yeS5jYWxsRm4oW3R5cGVGb3JDdG9yXSkpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIGlzIHN0cmFpZ2h0Zm9yd2FyZCBmYWN0b3J5LCBqdXN0IHJldHVybiBpdC5cbiAgICBib2R5LnB1c2gobmV3IG8uUmV0dXJuU3RhdGVtZW50KHJldEV4cHIpKTtcbiAgfVxuXG4gIGxldCBmYWN0b3J5Rm46IG8uRXhwcmVzc2lvbiA9IG8uZm4oXG4gICAgICBbbmV3IG8uRm5QYXJhbSgndCcsIG8uRFlOQU1JQ19UWVBFKV0sIGJvZHksIG8uSU5GRVJSRURfVFlQRSwgdW5kZWZpbmVkLFxuICAgICAgYCR7bWV0YS5uYW1lfV9GYWN0b3J5YCk7XG5cbiAgaWYgKGJhc2VGYWN0b3J5VmFyICE9PSBudWxsKSB7XG4gICAgLy8gVGhlcmUgaXMgYSBiYXNlIGZhY3RvcnkgdmFyaWFibGUgc28gd3JhcCBpdHMgZGVjbGFyYXRpb24gYWxvbmcgd2l0aCB0aGUgZmFjdG9yeSBmdW5jdGlvbiBpbnRvXG4gICAgLy8gYW4gSUlGRS5cbiAgICBmYWN0b3J5Rm4gPSBvLmZuKFtdLCBbXG4gICAgICAgICAgICAgICAgICAgbmV3IG8uRGVjbGFyZVZhclN0bXQoYmFzZUZhY3RvcnlWYXIubmFtZSEpLCBuZXcgby5SZXR1cm5TdGF0ZW1lbnQoZmFjdG9yeUZuKVxuICAgICAgICAgICAgICAgICBdKS5jYWxsRm4oW10sIC8qIHNvdXJjZVNwYW4gKi8gdW5kZWZpbmVkLCAvKiBwdXJlICovIHRydWUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBleHByZXNzaW9uOiBmYWN0b3J5Rm4sXG4gICAgc3RhdGVtZW50czogW10sXG4gICAgdHlwZTogY3JlYXRlRmFjdG9yeVR5cGUobWV0YSksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGYWN0b3J5VHlwZShtZXRhOiBSM0ZhY3RvcnlNZXRhZGF0YSkge1xuICBjb25zdCBjdG9yRGVwc1R5cGUgPVxuICAgICAgbWV0YS5kZXBzICE9PSBudWxsICYmIG1ldGEuZGVwcyAhPT0gJ2ludmFsaWQnID8gY3JlYXRlQ3RvckRlcHNUeXBlKG1ldGEuZGVwcykgOiBvLk5PTkVfVFlQRTtcbiAgcmV0dXJuIG8uZXhwcmVzc2lvblR5cGUoby5pbXBvcnRFeHByKFxuICAgICAgUjMuRmFjdG9yeURlY2xhcmF0aW9uLFxuICAgICAgW3R5cGVXaXRoUGFyYW1ldGVycyhtZXRhLnR5cGUudHlwZSwgbWV0YS50eXBlQXJndW1lbnRDb3VudCksIGN0b3JEZXBzVHlwZV0pKTtcbn1cblxuZnVuY3Rpb24gaW5qZWN0RGVwZW5kZW5jaWVzKGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW10sIHRhcmdldDogRmFjdG9yeVRhcmdldCk6IG8uRXhwcmVzc2lvbltdIHtcbiAgcmV0dXJuIGRlcHMubWFwKChkZXAsIGluZGV4KSA9PiBjb21waWxlSW5qZWN0RGVwZW5kZW5jeShkZXAsIHRhcmdldCwgaW5kZXgpKTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUluamVjdERlcGVuZGVuY3koXG4gICAgZGVwOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgdGFyZ2V0OiBGYWN0b3J5VGFyZ2V0LCBpbmRleDogbnVtYmVyKTogby5FeHByZXNzaW9uIHtcbiAgLy8gSW50ZXJwcmV0IHRoZSBkZXBlbmRlbmN5IGFjY29yZGluZyB0byBpdHMgcmVzb2x2ZWQgdHlwZS5cbiAgaWYgKGRlcC50b2tlbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBvLmltcG9ydEV4cHIoUjMuaW52YWxpZEZhY3RvcnlEZXApLmNhbGxGbihbby5saXRlcmFsKGluZGV4KV0pO1xuICB9IGVsc2UgaWYgKGRlcC5hdHRyaWJ1dGVOYW1lVHlwZSA9PT0gbnVsbCkge1xuICAgIC8vIEJ1aWxkIHVwIHRoZSBpbmplY3Rpb24gZmxhZ3MgYWNjb3JkaW5nIHRvIHRoZSBtZXRhZGF0YS5cbiAgICBjb25zdCBmbGFncyA9IEluamVjdEZsYWdzLkRlZmF1bHQgfCAoZGVwLnNlbGYgPyBJbmplY3RGbGFncy5TZWxmIDogMCkgfFxuICAgICAgICAoZGVwLnNraXBTZWxmID8gSW5qZWN0RmxhZ3MuU2tpcFNlbGYgOiAwKSB8IChkZXAuaG9zdCA/IEluamVjdEZsYWdzLkhvc3QgOiAwKSB8XG4gICAgICAgIChkZXAub3B0aW9uYWwgPyBJbmplY3RGbGFncy5PcHRpb25hbCA6IDApIHxcbiAgICAgICAgKHRhcmdldCA9PT0gRmFjdG9yeVRhcmdldC5QaXBlID8gSW5qZWN0RmxhZ3MuRm9yUGlwZSA6IDApO1xuXG4gICAgLy8gSWYgdGhpcyBkZXBlbmRlbmN5IGlzIG9wdGlvbmFsIG9yIG90aGVyd2lzZSBoYXMgbm9uLWRlZmF1bHQgZmxhZ3MsIHRoZW4gYWRkaXRpb25hbFxuICAgIC8vIHBhcmFtZXRlcnMgZGVzY3JpYmluZyBob3cgdG8gaW5qZWN0IHRoZSBkZXBlbmRlbmN5IG11c3QgYmUgcGFzc2VkIHRvIHRoZSBpbmplY3QgZnVuY3Rpb25cbiAgICAvLyB0aGF0J3MgYmVpbmcgdXNlZC5cbiAgICBsZXQgZmxhZ3NQYXJhbTogby5MaXRlcmFsRXhwcnxudWxsID1cbiAgICAgICAgKGZsYWdzICE9PSBJbmplY3RGbGFncy5EZWZhdWx0IHx8IGRlcC5vcHRpb25hbCkgPyBvLmxpdGVyYWwoZmxhZ3MpIDogbnVsbDtcblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBhcmd1bWVudHMgdG8gdGhlIGluamVjdEZuIGNhbGwuXG4gICAgY29uc3QgaW5qZWN0QXJncyA9IFtkZXAudG9rZW5dO1xuICAgIGlmIChmbGFnc1BhcmFtKSB7XG4gICAgICBpbmplY3RBcmdzLnB1c2goZmxhZ3NQYXJhbSk7XG4gICAgfVxuICAgIGNvbnN0IGluamVjdEZuID0gZ2V0SW5qZWN0Rm4odGFyZ2V0KTtcbiAgICByZXR1cm4gby5pbXBvcnRFeHByKGluamVjdEZuKS5jYWxsRm4oaW5qZWN0QXJncyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlIGBkZXAuYXR0cmlidXRlVHlwZU5hbWVgIHZhbHVlIGlzIGRlZmluZWQsIHdoaWNoIGluZGljYXRlcyB0aGF0IHRoaXMgaXMgYW4gYEBBdHRyaWJ1dGUoKWBcbiAgICAvLyB0eXBlIGRlcGVuZGVuY3kuIEZvciB0aGUgZ2VuZXJhdGVkIEpTIHdlIHN0aWxsIHdhbnQgdG8gdXNlIHRoZSBgZGVwLnRva2VuYCB2YWx1ZSBpbiBjYXNlIHRoZVxuICAgIC8vIG5hbWUgZ2l2ZW4gZm9yIHRoZSBhdHRyaWJ1dGUgaXMgbm90IGEgc3RyaW5nIGxpdGVyYWwuIEZvciBleGFtcGxlIGdpdmVuIGBAQXR0cmlidXRlKGZvbygpKWAsXG4gICAgLy8gd2Ugd2FudCB0byBnZW5lcmF0ZSBgybXJtWluamVjdEF0dHJpYnV0ZShmb28oKSlgLlxuICAgIC8vXG4gICAgLy8gVGhlIGBkZXAuYXR0cmlidXRlVHlwZU5hbWVgIGlzIG9ubHkgYWN0dWFsbHkgdXNlZCAoaW4gYGNyZWF0ZUN0b3JEZXBUeXBlKClgKSB0byBnZW5lcmF0ZVxuICAgIC8vIHR5cGluZ3MuXG4gICAgcmV0dXJuIG8uaW1wb3J0RXhwcihSMy5pbmplY3RBdHRyaWJ1dGUpLmNhbGxGbihbZGVwLnRva2VuXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlQ3RvckRlcHNUeXBlKGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW10pOiBvLlR5cGUge1xuICBsZXQgaGFzVHlwZXMgPSBmYWxzZTtcbiAgY29uc3QgYXR0cmlidXRlVHlwZXMgPSBkZXBzLm1hcChkZXAgPT4ge1xuICAgIGNvbnN0IHR5cGUgPSBjcmVhdGVDdG9yRGVwVHlwZShkZXApO1xuICAgIGlmICh0eXBlICE9PSBudWxsKSB7XG4gICAgICBoYXNUeXBlcyA9IHRydWU7XG4gICAgICByZXR1cm4gdHlwZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG8ubGl0ZXJhbChudWxsKTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChoYXNUeXBlcykge1xuICAgIHJldHVybiBvLmV4cHJlc3Npb25UeXBlKG8ubGl0ZXJhbEFycihhdHRyaWJ1dGVUeXBlcykpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvLk5PTkVfVFlQRTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVDdG9yRGVwVHlwZShkZXA6IFIzRGVwZW5kZW5jeU1ldGFkYXRhKTogby5MaXRlcmFsTWFwRXhwcnxudWxsIHtcbiAgY29uc3QgZW50cmllczoge2tleTogc3RyaW5nLCBxdW90ZWQ6IGJvb2xlYW4sIHZhbHVlOiBvLkV4cHJlc3Npb259W10gPSBbXTtcblxuICBpZiAoZGVwLmF0dHJpYnV0ZU5hbWVUeXBlICE9PSBudWxsKSB7XG4gICAgZW50cmllcy5wdXNoKHtrZXk6ICdhdHRyaWJ1dGUnLCB2YWx1ZTogZGVwLmF0dHJpYnV0ZU5hbWVUeXBlLCBxdW90ZWQ6IGZhbHNlfSk7XG4gIH1cbiAgaWYgKGRlcC5vcHRpb25hbCkge1xuICAgIGVudHJpZXMucHVzaCh7a2V5OiAnb3B0aW9uYWwnLCB2YWx1ZTogby5saXRlcmFsKHRydWUpLCBxdW90ZWQ6IGZhbHNlfSk7XG4gIH1cbiAgaWYgKGRlcC5ob3N0KSB7XG4gICAgZW50cmllcy5wdXNoKHtrZXk6ICdob3N0JywgdmFsdWU6IG8ubGl0ZXJhbCh0cnVlKSwgcXVvdGVkOiBmYWxzZX0pO1xuICB9XG4gIGlmIChkZXAuc2VsZikge1xuICAgIGVudHJpZXMucHVzaCh7a2V5OiAnc2VsZicsIHZhbHVlOiBvLmxpdGVyYWwodHJ1ZSksIHF1b3RlZDogZmFsc2V9KTtcbiAgfVxuICBpZiAoZGVwLnNraXBTZWxmKSB7XG4gICAgZW50cmllcy5wdXNoKHtrZXk6ICdza2lwU2VsZicsIHZhbHVlOiBvLmxpdGVyYWwodHJ1ZSksIHF1b3RlZDogZmFsc2V9KTtcbiAgfVxuXG4gIHJldHVybiBlbnRyaWVzLmxlbmd0aCA+IDAgPyBvLmxpdGVyYWxNYXAoZW50cmllcykgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEZWxlZ2F0ZWRGYWN0b3J5TWV0YWRhdGEobWV0YTogUjNGYWN0b3J5TWV0YWRhdGEpOlxuICAgIG1ldGEgaXMgUjNEZWxlZ2F0ZWRGbk9yQ2xhc3NNZXRhZGF0YSB7XG4gIHJldHVybiAobWV0YSBhcyBhbnkpLmRlbGVnYXRlVHlwZSAhPT0gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uRmFjdG9yeU1ldGFkYXRhKG1ldGE6IFIzRmFjdG9yeU1ldGFkYXRhKTpcbiAgICBtZXRhIGlzIFIzRXhwcmVzc2lvbkZhY3RvcnlNZXRhZGF0YSB7XG4gIHJldHVybiAobWV0YSBhcyBhbnkpLmV4cHJlc3Npb24gIT09IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0SW5qZWN0Rm4odGFyZ2V0OiBGYWN0b3J5VGFyZ2V0KTogby5FeHRlcm5hbFJlZmVyZW5jZSB7XG4gIHN3aXRjaCAodGFyZ2V0KSB7XG4gICAgY2FzZSBGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudDpcbiAgICBjYXNlIEZhY3RvcnlUYXJnZXQuRGlyZWN0aXZlOlxuICAgIGNhc2UgRmFjdG9yeVRhcmdldC5QaXBlOlxuICAgICAgcmV0dXJuIFIzLmRpcmVjdGl2ZUluamVjdDtcbiAgICBjYXNlIEZhY3RvcnlUYXJnZXQuTmdNb2R1bGU6XG4gICAgY2FzZSBGYWN0b3J5VGFyZ2V0LkluamVjdGFibGU6XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBSMy5pbmplY3Q7XG4gIH1cbn1cbiJdfQ==