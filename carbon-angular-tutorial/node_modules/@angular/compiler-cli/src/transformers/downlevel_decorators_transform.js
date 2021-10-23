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
        define("@angular/compiler-cli/src/transformers/downlevel_decorators_transform", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/patch_alias_reference_resolution"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getDownlevelDecoratorsTransform = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var patch_alias_reference_resolution_1 = require("@angular/compiler-cli/src/transformers/patch_alias_reference_resolution");
    /**
     * Whether a given decorator should be treated as an Angular decorator.
     * Either it's used in @angular/core, or it's imported from there.
     */
    function isAngularDecorator(decorator, isCore) {
        return isCore || (decorator.import !== null && decorator.import.from === '@angular/core');
    }
    /*
     #####################################################################
      Code below has been extracted from the tsickle decorator downlevel transformer
      and a few local modifications have been applied:
    
        1. Tsickle by default processed all decorators that had the `@Annotation` JSDoc.
           We modified the transform to only be concerned with known Angular decorators.
        2. Tsickle by default added `@nocollapse` to all generated `ctorParameters` properties.
           We only do this when `annotateForClosureCompiler` is enabled.
        3. Tsickle does not handle union types for dependency injection. i.e. if a injected type
           is denoted with `@Optional`, the actual type could be set to `T | null`.
           See: https://github.com/angular/angular-cli/commit/826803d0736b807867caff9f8903e508970ad5e4.
        4. Tsickle relied on `emitDecoratorMetadata` to be set to `true`. This is due to a limitation
           in TypeScript transformers that never has been fixed. We were able to work around this
           limitation so that `emitDecoratorMetadata` doesn't need to be specified.
           See: `patchAliasReferenceResolution` for more details.
    
      Here is a link to the tsickle revision on which this transformer is based:
      https://github.com/angular/tsickle/blob/fae06becb1570f491806060d83f29f2d50c43cdd/src/decorator_downlevel_transformer.ts
     #####################################################################
    */
    var DECORATOR_INVOCATION_JSDOC_TYPE = '!Array<{type: !Function, args: (undefined|!Array<?>)}>';
    /**
     * Extracts the type of the decorator (the function or expression invoked), as well as all the
     * arguments passed to the decorator. Returns an AST with the form:
     *
     *     // For @decorator(arg1, arg2)
     *     { type: decorator, args: [arg1, arg2] }
     */
    function extractMetadataFromSingleDecorator(decorator, diagnostics) {
        var e_1, _a;
        var metadataProperties = [];
        var expr = decorator.expression;
        switch (expr.kind) {
            case ts.SyntaxKind.Identifier:
                // The decorator was a plain @Foo.
                metadataProperties.push(ts.createPropertyAssignment('type', expr));
                break;
            case ts.SyntaxKind.CallExpression:
                // The decorator was a call, like @Foo(bar).
                var call = expr;
                metadataProperties.push(ts.createPropertyAssignment('type', call.expression));
                if (call.arguments.length) {
                    var args = [];
                    try {
                        for (var _b = tslib_1.__values(call.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var arg = _c.value;
                            args.push(arg);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    var argsArrayLiteral = ts.createArrayLiteral(args);
                    argsArrayLiteral.elements.hasTrailingComma = true;
                    metadataProperties.push(ts.createPropertyAssignment('args', argsArrayLiteral));
                }
                break;
            default:
                diagnostics.push({
                    file: decorator.getSourceFile(),
                    start: decorator.getStart(),
                    length: decorator.getEnd() - decorator.getStart(),
                    messageText: ts.SyntaxKind[decorator.kind] + " not implemented in gathering decorator metadata.",
                    category: ts.DiagnosticCategory.Error,
                    code: 0,
                });
                break;
        }
        return ts.createObjectLiteral(metadataProperties);
    }
    /**
     * createCtorParametersClassProperty creates a static 'ctorParameters' property containing
     * downleveled decorator information.
     *
     * The property contains an arrow function that returns an array of object literals of the shape:
     *     static ctorParameters = () => [{
     *       type: SomeClass|undefined,  // the type of the param that's decorated, if it's a value.
     *       decorators: [{
     *         type: DecoratorFn,  // the type of the decorator that's invoked.
     *         args: [ARGS],       // the arguments passed to the decorator.
     *       }]
     *     }];
     */
    function createCtorParametersClassProperty(diagnostics, entityNameToExpression, ctorParameters, isClosureCompilerEnabled) {
        var e_2, _a, e_3, _b;
        var params = [];
        try {
            for (var ctorParameters_1 = tslib_1.__values(ctorParameters), ctorParameters_1_1 = ctorParameters_1.next(); !ctorParameters_1_1.done; ctorParameters_1_1 = ctorParameters_1.next()) {
                var ctorParam = ctorParameters_1_1.value;
                if (!ctorParam.type && ctorParam.decorators.length === 0) {
                    params.push(ts.createNull());
                    continue;
                }
                var paramType = ctorParam.type ?
                    typeReferenceToExpression(entityNameToExpression, ctorParam.type) :
                    undefined;
                var members = [ts.createPropertyAssignment('type', paramType || ts.createIdentifier('undefined'))];
                var decorators = [];
                try {
                    for (var _c = (e_3 = void 0, tslib_1.__values(ctorParam.decorators)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var deco = _d.value;
                        decorators.push(extractMetadataFromSingleDecorator(deco, diagnostics));
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                if (decorators.length) {
                    members.push(ts.createPropertyAssignment('decorators', ts.createArrayLiteral(decorators)));
                }
                params.push(ts.createObjectLiteral(members));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (ctorParameters_1_1 && !ctorParameters_1_1.done && (_a = ctorParameters_1.return)) _a.call(ctorParameters_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var initializer = ts.createArrowFunction(undefined, undefined, [], undefined, ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ts.createArrayLiteral(params, true));
        var ctorProp = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], 'ctorParameters', undefined, undefined, initializer);
        if (isClosureCompilerEnabled) {
            ts.setSyntheticLeadingComments(ctorProp, [
                {
                    kind: ts.SyntaxKind.MultiLineCommentTrivia,
                    text: [
                        "*",
                        " * @type {function(): !Array<(null|{",
                        " *   type: ?,",
                        " *   decorators: (undefined|" + DECORATOR_INVOCATION_JSDOC_TYPE + "),",
                        " * })>}",
                        " * @nocollapse",
                        " ",
                    ].join('\n'),
                    pos: -1,
                    end: -1,
                    hasTrailingNewLine: true,
                },
            ]);
        }
        return ctorProp;
    }
    /**
     * Returns an expression representing the (potentially) value part for the given node.
     *
     * This is a partial re-implementation of TypeScript's serializeTypeReferenceNode. This is a
     * workaround for https://github.com/Microsoft/TypeScript/issues/17516 (serializeTypeReferenceNode
     * not being exposed). In practice this implementation is sufficient for Angular's use of type
     * metadata.
     */
    function typeReferenceToExpression(entityNameToExpression, node) {
        var kind = node.kind;
        if (ts.isLiteralTypeNode(node)) {
            // Treat literal types like their base type (boolean, string, number).
            kind = node.literal.kind;
        }
        switch (kind) {
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.ConstructorType:
                return ts.createIdentifier('Function');
            case ts.SyntaxKind.ArrayType:
            case ts.SyntaxKind.TupleType:
                return ts.createIdentifier('Array');
            case ts.SyntaxKind.TypePredicate:
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword:
            case ts.SyntaxKind.BooleanKeyword:
                return ts.createIdentifier('Boolean');
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.StringKeyword:
                return ts.createIdentifier('String');
            case ts.SyntaxKind.ObjectKeyword:
                return ts.createIdentifier('Object');
            case ts.SyntaxKind.NumberKeyword:
            case ts.SyntaxKind.NumericLiteral:
                return ts.createIdentifier('Number');
            case ts.SyntaxKind.TypeReference:
                var typeRef = node;
                // Ignore any generic types, just return the base type.
                return entityNameToExpression(typeRef.typeName);
            case ts.SyntaxKind.UnionType:
                var childTypeNodes = node
                    .types.filter(function (t) { return !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword); });
                return childTypeNodes.length === 1 ?
                    typeReferenceToExpression(entityNameToExpression, childTypeNodes[0]) :
                    undefined;
            default:
                return undefined;
        }
    }
    /**
     * Checks whether a given symbol refers to a value that exists at runtime (as distinct from a type).
     *
     * Expands aliases, which is important for the case where
     *   import * as x from 'some-module';
     * and x is now a value (the module object).
     */
    function symbolIsRuntimeValue(typeChecker, symbol) {
        if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = typeChecker.getAliasedSymbol(symbol);
        }
        // Note that const enums are a special case, because
        // while they have a value, they don't exist at runtime.
        return (symbol.flags & ts.SymbolFlags.Value & ts.SymbolFlags.ConstEnumExcludes) !== 0;
    }
    /**
     * Gets a transformer for downleveling Angular decorators.
     * @param typeChecker Reference to the program's type checker.
     * @param host Reflection host that is used for determining decorators.
     * @param diagnostics List which will be populated with diagnostics if any.
     * @param isCore Whether the current TypeScript program is for the `@angular/core` package.
     * @param isClosureCompilerEnabled Whether closure annotations need to be added where needed.
     * @param skipClassDecorators Whether class decorators should be skipped from downleveling.
     *   This is useful for JIT mode where class decorators should be preserved as they could rely
     *   on immediate execution. e.g. downleveling `@Injectable` means that the injectable factory
     *   is not created, and injecting the token will not work. If this decorator would not be
     *   downleveled, the `Injectable` decorator will execute immediately on file load, and
     *   Angular will generate the corresponding injectable factory.
     */
    function getDownlevelDecoratorsTransform(typeChecker, host, diagnostics, isCore, isClosureCompilerEnabled, skipClassDecorators) {
        function addJSDocTypeAnnotation(node, jsdocType) {
            if (!isClosureCompilerEnabled) {
                return;
            }
            ts.setSyntheticLeadingComments(node, [
                {
                    kind: ts.SyntaxKind.MultiLineCommentTrivia,
                    text: "* @type {" + jsdocType + "} ",
                    pos: -1,
                    end: -1,
                    hasTrailingNewLine: true,
                },
            ]);
        }
        /**
         * Takes a list of decorator metadata object ASTs and produces an AST for a
         * static class property of an array of those metadata objects.
         */
        function createDecoratorClassProperty(decoratorList) {
            var modifier = ts.createToken(ts.SyntaxKind.StaticKeyword);
            var initializer = ts.createArrayLiteral(decoratorList, true);
            // NB: the .decorators property does not get a @nocollapse property. There
            // is no good reason why - it means .decorators is not runtime accessible
            // if you compile with collapse properties, whereas propDecorators is,
            // which doesn't follow any stringent logic. However this has been the
            // case previously, and adding it back in leads to substantial code size
            // increases as Closure fails to tree shake these props
            // without @nocollapse.
            var prop = ts.createProperty(undefined, [modifier], 'decorators', undefined, undefined, initializer);
            addJSDocTypeAnnotation(prop, DECORATOR_INVOCATION_JSDOC_TYPE);
            return prop;
        }
        /**
         * createPropDecoratorsClassProperty creates a static 'propDecorators'
         * property containing type information for every property that has a
         * decorator applied.
         *
         *     static propDecorators: {[key: string]: {type: Function, args?:
         * any[]}[]} = { propA: [{type: MyDecorator, args: [1, 2]}, ...],
         *       ...
         *     };
         */
        function createPropDecoratorsClassProperty(diagnostics, properties) {
            var e_4, _a;
            //  `static propDecorators: {[key: string]: ` + {type: Function, args?:
            //  any[]}[] + `} = {\n`);
            var entries = [];
            try {
                for (var _b = tslib_1.__values(properties.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), name = _d[0], decorators = _d[1];
                    entries.push(ts.createPropertyAssignment(name, ts.createArrayLiteral(decorators.map(function (deco) { return extractMetadataFromSingleDecorator(deco, diagnostics); }))));
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            var initializer = ts.createObjectLiteral(entries, true);
            var prop = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], 'propDecorators', undefined, undefined, initializer);
            addJSDocTypeAnnotation(prop, "!Object<string, " + DECORATOR_INVOCATION_JSDOC_TYPE + ">");
            return prop;
        }
        return function (context) {
            // Ensure that referenced type symbols are not elided by TypeScript. Imports for
            // such parameter type symbols previously could be type-only, but now might be also
            // used in the `ctorParameters` static property as a value. We want to make sure
            // that TypeScript does not elide imports for such type references. Read more
            // about this in the description for `loadIsReferencedAliasDeclarationPatch`.
            var referencedParameterTypes = patch_alias_reference_resolution_1.loadIsReferencedAliasDeclarationPatch(context);
            /**
             * Converts an EntityName (from a type annotation) to an expression (accessing a value).
             *
             * For a given qualified name, this walks depth first to find the leftmost identifier,
             * and then converts the path into a property access that can be used as expression.
             */
            function entityNameToExpression(name) {
                var symbol = typeChecker.getSymbolAtLocation(name);
                // Check if the entity name references a symbol that is an actual value. If it is not, it
                // cannot be referenced by an expression, so return undefined.
                if (!symbol || !symbolIsRuntimeValue(typeChecker, symbol) || !symbol.declarations ||
                    symbol.declarations.length === 0) {
                    return undefined;
                }
                // If we deal with a qualified name, build up a property access expression
                // that could be used in the JavaScript output.
                if (ts.isQualifiedName(name)) {
                    var containerExpr = entityNameToExpression(name.left);
                    if (containerExpr === undefined) {
                        return undefined;
                    }
                    return ts.createPropertyAccess(containerExpr, name.right);
                }
                var decl = symbol.declarations[0];
                // If the given entity name has been resolved to an alias import declaration,
                // ensure that the alias declaration is not elided by TypeScript, and use its
                // name identifier to reference it at runtime.
                if (patch_alias_reference_resolution_1.isAliasImportDeclaration(decl)) {
                    referencedParameterTypes.add(decl);
                    // If the entity name resolves to an alias import declaration, we reference the
                    // entity based on the alias import name. This ensures that TypeScript properly
                    // resolves the link to the import. Cloning the original entity name identifier
                    // could lead to an incorrect resolution at local scope. e.g. Consider the following
                    // snippet: `constructor(Dep: Dep) {}`. In such a case, the local `Dep` identifier
                    // would resolve to the actual parameter name, and not to the desired import.
                    // This happens because the entity name identifier symbol is internally considered
                    // as type-only and therefore TypeScript tries to resolve it as value manually.
                    // We can help TypeScript and avoid this non-reliable resolution by using an identifier
                    // that is not type-only and is directly linked to the import alias declaration.
                    if (decl.name !== undefined) {
                        return ts.getMutableClone(decl.name);
                    }
                }
                // Clone the original entity name identifier so that it can be used to reference
                // its value at runtime. This is used when the identifier is resolving to a file
                // local declaration (otherwise it would resolve to an alias import declaration).
                return ts.getMutableClone(name);
            }
            /**
             * Transforms a class element. Returns a three tuple of name, transformed element, and
             * decorators found. Returns an undefined name if there are no decorators to lower on the
             * element, or the element has an exotic name.
             */
            function transformClassElement(element) {
                var e_5, _a;
                element = ts.visitEachChild(element, decoratorDownlevelVisitor, context);
                var decoratorsToKeep = [];
                var toLower = [];
                var decorators = host.getDecoratorsOfDeclaration(element) || [];
                try {
                    for (var decorators_1 = tslib_1.__values(decorators), decorators_1_1 = decorators_1.next(); !decorators_1_1.done; decorators_1_1 = decorators_1.next()) {
                        var decorator = decorators_1_1.value;
                        // We only deal with concrete nodes in TypeScript sources, so we don't
                        // need to handle synthetically created decorators.
                        var decoratorNode = decorator.node;
                        if (!isAngularDecorator(decorator, isCore)) {
                            decoratorsToKeep.push(decoratorNode);
                            continue;
                        }
                        toLower.push(decoratorNode);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (decorators_1_1 && !decorators_1_1.done && (_a = decorators_1.return)) _a.call(decorators_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                if (!toLower.length)
                    return [undefined, element, []];
                if (!element.name || !ts.isIdentifier(element.name)) {
                    // Method has a weird name, e.g.
                    //   [Symbol.foo]() {...}
                    diagnostics.push({
                        file: element.getSourceFile(),
                        start: element.getStart(),
                        length: element.getEnd() - element.getStart(),
                        messageText: "Cannot process decorators for class element with non-analyzable name.",
                        category: ts.DiagnosticCategory.Error,
                        code: 0,
                    });
                    return [undefined, element, []];
                }
                var name = element.name.text;
                var mutable = ts.getMutableClone(element);
                mutable.decorators = decoratorsToKeep.length ?
                    ts.setTextRange(ts.createNodeArray(decoratorsToKeep), mutable.decorators) :
                    undefined;
                return [name, mutable, toLower];
            }
            /**
             * Transforms a constructor. Returns the transformed constructor and the list of parameter
             * information collected, consisting of decorators and optional type.
             */
            function transformConstructor(ctor) {
                var e_6, _a, e_7, _b;
                ctor = ts.visitEachChild(ctor, decoratorDownlevelVisitor, context);
                var newParameters = [];
                var oldParameters = ts.visitParameterList(ctor.parameters, decoratorDownlevelVisitor, context);
                var parametersInfo = [];
                try {
                    for (var oldParameters_1 = tslib_1.__values(oldParameters), oldParameters_1_1 = oldParameters_1.next(); !oldParameters_1_1.done; oldParameters_1_1 = oldParameters_1.next()) {
                        var param = oldParameters_1_1.value;
                        var decoratorsToKeep = [];
                        var paramInfo = { decorators: [], type: null };
                        var decorators = host.getDecoratorsOfDeclaration(param) || [];
                        try {
                            for (var decorators_2 = (e_7 = void 0, tslib_1.__values(decorators)), decorators_2_1 = decorators_2.next(); !decorators_2_1.done; decorators_2_1 = decorators_2.next()) {
                                var decorator = decorators_2_1.value;
                                // We only deal with concrete nodes in TypeScript sources, so we don't
                                // need to handle synthetically created decorators.
                                var decoratorNode = decorator.node;
                                if (!isAngularDecorator(decorator, isCore)) {
                                    decoratorsToKeep.push(decoratorNode);
                                    continue;
                                }
                                paramInfo.decorators.push(decoratorNode);
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (decorators_2_1 && !decorators_2_1.done && (_b = decorators_2.return)) _b.call(decorators_2);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                        if (param.type) {
                            // param has a type provided, e.g. "foo: Bar".
                            // The type will be emitted as a value expression in entityNameToExpression, which takes
                            // care not to emit anything for types that cannot be expressed as a value (e.g.
                            // interfaces).
                            paramInfo.type = param.type;
                        }
                        parametersInfo.push(paramInfo);
                        var newParam = ts.updateParameter(param, 
                        // Must pass 'undefined' to avoid emitting decorator metadata.
                        decoratorsToKeep.length ? decoratorsToKeep : undefined, param.modifiers, param.dotDotDotToken, param.name, param.questionToken, param.type, param.initializer);
                        newParameters.push(newParam);
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (oldParameters_1_1 && !oldParameters_1_1.done && (_a = oldParameters_1.return)) _a.call(oldParameters_1);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                var updated = ts.updateConstructor(ctor, ctor.decorators, ctor.modifiers, newParameters, ts.visitFunctionBody(ctor.body, decoratorDownlevelVisitor, context));
                return [updated, parametersInfo];
            }
            /**
             * Transforms a single class declaration:
             * - dispatches to strip decorators on members
             * - converts decorators on the class to annotations
             * - creates a ctorParameters property
             * - creates a propDecorators property
             */
            function transformClassDeclaration(classDecl) {
                var e_8, _a, e_9, _b;
                classDecl = ts.getMutableClone(classDecl);
                var newMembers = [];
                var decoratedProperties = new Map();
                var classParameters = null;
                try {
                    for (var _c = tslib_1.__values(classDecl.members), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var member = _d.value;
                        switch (member.kind) {
                            case ts.SyntaxKind.PropertyDeclaration:
                            case ts.SyntaxKind.GetAccessor:
                            case ts.SyntaxKind.SetAccessor:
                            case ts.SyntaxKind.MethodDeclaration: {
                                var _e = tslib_1.__read(transformClassElement(member), 3), name = _e[0], newMember = _e[1], decorators = _e[2];
                                newMembers.push(newMember);
                                if (name)
                                    decoratedProperties.set(name, decorators);
                                continue;
                            }
                            case ts.SyntaxKind.Constructor: {
                                var ctor = member;
                                if (!ctor.body)
                                    break;
                                var _f = tslib_1.__read(transformConstructor(member), 2), newMember = _f[0], parametersInfo = _f[1];
                                classParameters = parametersInfo;
                                newMembers.push(newMember);
                                continue;
                            }
                            default:
                                break;
                        }
                        newMembers.push(ts.visitEachChild(member, decoratorDownlevelVisitor, context));
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
                // The `ReflectionHost.getDecoratorsOfDeclaration()` method will not return certain kinds of
                // decorators that will never be Angular decorators. So we cannot rely on it to capture all
                // the decorators that should be kept. Instead we start off with a set of the raw decorators
                // on the class, and only remove the ones that have been identified for downleveling.
                var decoratorsToKeep = new Set(classDecl.decorators);
                var possibleAngularDecorators = host.getDecoratorsOfDeclaration(classDecl) || [];
                var hasAngularDecorator = false;
                var decoratorsToLower = [];
                try {
                    for (var possibleAngularDecorators_1 = tslib_1.__values(possibleAngularDecorators), possibleAngularDecorators_1_1 = possibleAngularDecorators_1.next(); !possibleAngularDecorators_1_1.done; possibleAngularDecorators_1_1 = possibleAngularDecorators_1.next()) {
                        var decorator = possibleAngularDecorators_1_1.value;
                        // We only deal with concrete nodes in TypeScript sources, so we don't
                        // need to handle synthetically created decorators.
                        var decoratorNode = decorator.node;
                        var isNgDecorator = isAngularDecorator(decorator, isCore);
                        // Keep track if we come across an Angular class decorator. This is used
                        // for to determine whether constructor parameters should be captured or not.
                        if (isNgDecorator) {
                            hasAngularDecorator = true;
                        }
                        if (isNgDecorator && !skipClassDecorators) {
                            decoratorsToLower.push(extractMetadataFromSingleDecorator(decoratorNode, diagnostics));
                            decoratorsToKeep.delete(decoratorNode);
                        }
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (possibleAngularDecorators_1_1 && !possibleAngularDecorators_1_1.done && (_b = possibleAngularDecorators_1.return)) _b.call(possibleAngularDecorators_1);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
                if (decoratorsToLower.length) {
                    newMembers.push(createDecoratorClassProperty(decoratorsToLower));
                }
                if (classParameters) {
                    if (hasAngularDecorator || classParameters.some(function (p) { return !!p.decorators.length; })) {
                        // Capture constructor parameters if the class has Angular decorator applied,
                        // or if any of the parameters has decorators applied directly.
                        newMembers.push(createCtorParametersClassProperty(diagnostics, entityNameToExpression, classParameters, isClosureCompilerEnabled));
                    }
                }
                if (decoratedProperties.size) {
                    newMembers.push(createPropDecoratorsClassProperty(diagnostics, decoratedProperties));
                }
                var members = ts.setTextRange(ts.createNodeArray(newMembers, classDecl.members.hasTrailingComma), classDecl.members);
                return ts.updateClassDeclaration(classDecl, decoratorsToKeep.size ? Array.from(decoratorsToKeep) : undefined, classDecl.modifiers, classDecl.name, classDecl.typeParameters, classDecl.heritageClauses, members);
            }
            /**
             * Transformer visitor that looks for Angular decorators and replaces them with
             * downleveled static properties. Also collects constructor type metadata for
             * class declaration that are decorated with an Angular decorator.
             */
            function decoratorDownlevelVisitor(node) {
                if (ts.isClassDeclaration(node)) {
                    return transformClassDeclaration(node);
                }
                return ts.visitEachChild(node, decoratorDownlevelVisitor, context);
            }
            return function (sf) {
                // Downlevel decorators and constructor parameter types. We will keep track of all
                // referenced constructor parameter types so that we can instruct TypeScript to
                // not elide their imports if they previously were only type-only.
                return ts.visitEachChild(sf, decoratorDownlevelVisitor, context);
            };
        };
    }
    exports.getDownlevelDecoratorsTransform = getDownlevelDecoratorsTransform;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNEhBQW1IO0lBRW5IOzs7T0FHRztJQUNILFNBQVMsa0JBQWtCLENBQUMsU0FBb0IsRUFBRSxNQUFlO1FBQy9ELE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQW9CRTtJQUVGLElBQU0sK0JBQStCLEdBQUcsd0RBQXdELENBQUM7SUFFakc7Ozs7OztPQU1HO0lBQ0gsU0FBUyxrQ0FBa0MsQ0FDdkMsU0FBdUIsRUFBRSxXQUE0Qjs7UUFDdkQsSUFBTSxrQkFBa0IsR0FBa0MsRUFBRSxDQUFDO1FBQzdELElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUM7UUFDbEMsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO2dCQUMzQixrQ0FBa0M7Z0JBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ25FLE1BQU07WUFDUixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYztnQkFDL0IsNENBQTRDO2dCQUM1QyxJQUFNLElBQUksR0FBRyxJQUF5QixDQUFDO2dCQUN2QyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDOUUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtvQkFDekIsSUFBTSxJQUFJLEdBQW9CLEVBQUUsQ0FBQzs7d0JBQ2pDLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFOzRCQUE3QixJQUFNLEdBQUcsV0FBQTs0QkFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUNoQjs7Ozs7Ozs7O29CQUNELElBQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNyRCxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO29CQUNsRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7aUJBQ2hGO2dCQUNELE1BQU07WUFDUjtnQkFDRSxXQUFXLENBQUMsSUFBSSxDQUFDO29CQUNmLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFO29CQUMvQixLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRTtvQkFDM0IsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUNqRCxXQUFXLEVBQ0osRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHNEQUFtRDtvQkFDdkYsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO29CQUNyQyxJQUFJLEVBQUUsQ0FBQztpQkFDUixDQUFDLENBQUM7Z0JBQ0gsTUFBTTtTQUNUO1FBQ0QsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7OztPQVlHO0lBQ0gsU0FBUyxpQ0FBaUMsQ0FDdEMsV0FBNEIsRUFDNUIsc0JBQXVFLEVBQ3ZFLGNBQXlDLEVBQ3pDLHdCQUFpQzs7UUFDbkMsSUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQzs7WUFFbkMsS0FBd0IsSUFBQSxtQkFBQSxpQkFBQSxjQUFjLENBQUEsOENBQUEsMEVBQUU7Z0JBQW5DLElBQU0sU0FBUywyQkFBQTtnQkFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUN4RCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO29CQUM3QixTQUFTO2lCQUNWO2dCQUVELElBQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUIseUJBQXlCLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ25FLFNBQVMsQ0FBQztnQkFDZCxJQUFNLE9BQU8sR0FDVCxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXpGLElBQU0sVUFBVSxHQUFpQyxFQUFFLENBQUM7O29CQUNwRCxLQUFtQixJQUFBLG9CQUFBLGlCQUFBLFNBQVMsQ0FBQyxVQUFVLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTt3QkFBcEMsSUFBTSxJQUFJLFdBQUE7d0JBQ2IsVUFBVSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztxQkFDeEU7Ozs7Ozs7OztnQkFDRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUU7b0JBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM1RjtnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQzlDOzs7Ozs7Ozs7UUFFRCxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQ3RDLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsRUFDekYsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQzlCLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFDckYsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzVCLElBQUksd0JBQXdCLEVBQUU7WUFDNUIsRUFBRSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRTtnQkFDdkM7b0JBQ0UsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCO29CQUMxQyxJQUFJLEVBQUU7d0JBQ0osR0FBRzt3QkFDSCxzQ0FBc0M7d0JBQ3RDLGVBQWU7d0JBQ2YsaUNBQStCLCtCQUErQixPQUFJO3dCQUNsRSxTQUFTO3dCQUNULGdCQUFnQjt3QkFDaEIsR0FBRztxQkFDSixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ1osR0FBRyxFQUFFLENBQUMsQ0FBQztvQkFDUCxHQUFHLEVBQUUsQ0FBQyxDQUFDO29CQUNQLGtCQUFrQixFQUFFLElBQUk7aUJBQ3pCO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQVMseUJBQXlCLENBQzlCLHNCQUF1RSxFQUN2RSxJQUFpQjtRQUNuQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3JCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlCLHNFQUFzRTtZQUN0RSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDMUI7UUFDRCxRQUFRLElBQUksRUFBRTtZQUNaLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7WUFDaEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWU7Z0JBQ2hDLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7WUFDN0IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVM7Z0JBQzFCLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUMvQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO1lBQ2hDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjO2dCQUMvQixPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ2pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhO2dCQUM5QixPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYTtnQkFDOUIsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYztnQkFDL0IsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWE7Z0JBQzlCLElBQU0sT0FBTyxHQUFHLElBQTRCLENBQUM7Z0JBQzdDLHVEQUF1RDtnQkFDdkQsT0FBTyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVM7Z0JBQzFCLElBQU0sY0FBYyxHQUNmLElBQXlCO3FCQUNyQixLQUFLLENBQUMsTUFBTSxDQUNULFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUExRSxDQUEwRSxDQUFDLENBQUM7Z0JBQzdGLE9BQU8sY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDaEMseUJBQXlCLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEUsU0FBUyxDQUFDO1lBQ2hCO2dCQUNFLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQVMsb0JBQW9CLENBQUMsV0FBMkIsRUFBRSxNQUFpQjtRQUMxRSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7WUFDdkMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUMvQztRQUVELG9EQUFvRDtRQUNwRCx3REFBd0Q7UUFDeEQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBYUQ7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFNBQWdCLCtCQUErQixDQUMzQyxXQUEyQixFQUFFLElBQW9CLEVBQUUsV0FBNEIsRUFDL0UsTUFBZSxFQUFFLHdCQUFpQyxFQUNsRCxtQkFBNEI7UUFDOUIsU0FBUyxzQkFBc0IsQ0FBQyxJQUFhLEVBQUUsU0FBaUI7WUFDOUQsSUFBSSxDQUFDLHdCQUF3QixFQUFFO2dCQUM3QixPQUFPO2FBQ1I7WUFFRCxFQUFFLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFO2dCQUNuQztvQkFDRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0I7b0JBQzFDLElBQUksRUFBRSxjQUFZLFNBQVMsT0FBSTtvQkFDL0IsR0FBRyxFQUFFLENBQUMsQ0FBQztvQkFDUCxHQUFHLEVBQUUsQ0FBQyxDQUFDO29CQUNQLGtCQUFrQixFQUFFLElBQUk7aUJBQ3pCO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVEOzs7V0FHRztRQUNILFNBQVMsNEJBQTRCLENBQUMsYUFBMkM7WUFDL0UsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdELElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0QsMEVBQTBFO1lBQzFFLHlFQUF5RTtZQUN6RSxzRUFBc0U7WUFDdEUsc0VBQXNFO1lBQ3RFLHdFQUF3RTtZQUN4RSx1REFBdUQ7WUFDdkQsdUJBQXVCO1lBQ3ZCLElBQU0sSUFBSSxHQUNOLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDOUYsc0JBQXNCLENBQUMsSUFBSSxFQUFFLCtCQUErQixDQUFDLENBQUM7WUFDOUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQ7Ozs7Ozs7OztXQVNHO1FBQ0gsU0FBUyxpQ0FBaUMsQ0FDdEMsV0FBNEIsRUFDNUIsVUFBdUM7O1lBQ3pDLHVFQUF1RTtZQUN2RSwwQkFBMEI7WUFDMUIsSUFBTSxPQUFPLEdBQWtDLEVBQUUsQ0FBQzs7Z0JBQ2xELEtBQWlDLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTVDLElBQUEsS0FBQSwyQkFBa0IsRUFBakIsSUFBSSxRQUFBLEVBQUUsVUFBVSxRQUFBO29CQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FDcEMsSUFBSSxFQUNKLEVBQUUsQ0FBQyxrQkFBa0IsQ0FDakIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLGtDQUFrQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUMxRjs7Ozs7Ozs7O1lBQ0QsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxRCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsY0FBYyxDQUMxQixTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQ3JGLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM1QixzQkFBc0IsQ0FBQyxJQUFJLEVBQUUscUJBQW1CLCtCQUErQixNQUFHLENBQUMsQ0FBQztZQUNwRixPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsZ0ZBQWdGO1lBQ2hGLG1GQUFtRjtZQUNuRixnRkFBZ0Y7WUFDaEYsNkVBQTZFO1lBQzdFLDZFQUE2RTtZQUM3RSxJQUFNLHdCQUF3QixHQUFHLHdFQUFxQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWhGOzs7OztlQUtHO1lBQ0gsU0FBUyxzQkFBc0IsQ0FBQyxJQUFtQjtnQkFDakQsSUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyRCx5RkFBeUY7Z0JBQ3pGLDhEQUE4RDtnQkFDOUQsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZO29CQUM3RSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQ3BDLE9BQU8sU0FBUyxDQUFDO2lCQUNsQjtnQkFDRCwwRUFBMEU7Z0JBQzFFLCtDQUErQztnQkFDL0MsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUM1QixJQUFNLGFBQWEsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3hELElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRTt3QkFDL0IsT0FBTyxTQUFTLENBQUM7cUJBQ2xCO29CQUNELE9BQU8sRUFBRSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQzNEO2dCQUNELElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLDZFQUE2RTtnQkFDN0UsNkVBQTZFO2dCQUM3RSw4Q0FBOEM7Z0JBQzlDLElBQUksMkRBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2xDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbkMsK0VBQStFO29CQUMvRSwrRUFBK0U7b0JBQy9FLCtFQUErRTtvQkFDL0Usb0ZBQW9GO29CQUNwRixrRkFBa0Y7b0JBQ2xGLDZFQUE2RTtvQkFDN0Usa0ZBQWtGO29CQUNsRiwrRUFBK0U7b0JBQy9FLHVGQUF1RjtvQkFDdkYsZ0ZBQWdGO29CQUNoRixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO3dCQUMzQixPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN0QztpQkFDRjtnQkFDRCxnRkFBZ0Y7Z0JBQ2hGLGdGQUFnRjtnQkFDaEYsaUZBQWlGO2dCQUNqRixPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsQ0FBQztZQUVEOzs7O2VBSUc7WUFDSCxTQUFTLHFCQUFxQixDQUFDLE9BQXdCOztnQkFFckQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN6RSxJQUFNLGdCQUFnQixHQUFtQixFQUFFLENBQUM7Z0JBQzVDLElBQU0sT0FBTyxHQUFtQixFQUFFLENBQUM7Z0JBQ25DLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7O29CQUNsRSxLQUF3QixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO3dCQUEvQixJQUFNLFNBQVMsdUJBQUE7d0JBQ2xCLHNFQUFzRTt3QkFDdEUsbURBQW1EO3dCQUNuRCxJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsSUFBcUIsQ0FBQzt3QkFDdEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRTs0QkFDMUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDOzRCQUNyQyxTQUFTO3lCQUNWO3dCQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7cUJBQzdCOzs7Ozs7Ozs7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNO29CQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUVyRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNuRCxnQ0FBZ0M7b0JBQ2hDLHlCQUF5QjtvQkFDekIsV0FBVyxDQUFDLElBQUksQ0FBQzt3QkFDZixJQUFJLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRTt3QkFDN0IsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUU7d0JBQ3pCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDN0MsV0FBVyxFQUFFLHVFQUF1RTt3QkFDcEYsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUsQ0FBQztxQkFDUixDQUFDLENBQUM7b0JBQ0gsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ2pDO2dCQUVELElBQU0sSUFBSSxHQUFJLE9BQU8sQ0FBQyxJQUFzQixDQUFDLElBQUksQ0FBQztnQkFDbEQsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDM0MsT0FBZSxDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzNFLFNBQVMsQ0FBQztnQkFDZCxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBRUQ7OztlQUdHO1lBQ0gsU0FBUyxvQkFBb0IsQ0FBQyxJQUErQjs7Z0JBRTNELElBQUksR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFFbkUsSUFBTSxhQUFhLEdBQThCLEVBQUUsQ0FBQztnQkFDcEQsSUFBTSxhQUFhLEdBQ2YsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQy9FLElBQU0sY0FBYyxHQUE4QixFQUFFLENBQUM7O29CQUNyRCxLQUFvQixJQUFBLGtCQUFBLGlCQUFBLGFBQWEsQ0FBQSw0Q0FBQSx1RUFBRTt3QkFBOUIsSUFBTSxLQUFLLDBCQUFBO3dCQUNkLElBQU0sZ0JBQWdCLEdBQW1CLEVBQUUsQ0FBQzt3QkFDNUMsSUFBTSxTQUFTLEdBQTRCLEVBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUM7d0JBQ3hFLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7OzRCQUVoRSxLQUF3QixJQUFBLDhCQUFBLGlCQUFBLFVBQVUsQ0FBQSxDQUFBLHNDQUFBLDhEQUFFO2dDQUEvQixJQUFNLFNBQVMsdUJBQUE7Z0NBQ2xCLHNFQUFzRTtnQ0FDdEUsbURBQW1EO2dDQUNuRCxJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsSUFBcUIsQ0FBQztnQ0FDdEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRTtvQ0FDMUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO29DQUNyQyxTQUFTO2lDQUNWO2dDQUNELFNBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDOzZCQUMzQzs7Ozs7Ozs7O3dCQUNELElBQUksS0FBSyxDQUFDLElBQUksRUFBRTs0QkFDZCw4Q0FBOEM7NEJBQzlDLHdGQUF3Rjs0QkFDeEYsZ0ZBQWdGOzRCQUNoRixlQUFlOzRCQUNmLFNBQVUsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQzt5QkFDOUI7d0JBQ0QsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDL0IsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FDL0IsS0FBSzt3QkFDTCw4REFBOEQ7d0JBQzlELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUN2RSxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDMUYsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztxQkFDOUI7Ozs7Ozs7OztnQkFDRCxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQ2hDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUNwRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN6RSxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFFRDs7Ozs7O2VBTUc7WUFDSCxTQUFTLHlCQUF5QixDQUFDLFNBQThCOztnQkFDL0QsU0FBUyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRTFDLElBQU0sVUFBVSxHQUFzQixFQUFFLENBQUM7Z0JBQ3pDLElBQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7Z0JBQzlELElBQUksZUFBZSxHQUFtQyxJQUFJLENBQUM7O29CQUUzRCxLQUFxQixJQUFBLEtBQUEsaUJBQUEsU0FBUyxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTt3QkFBbkMsSUFBTSxNQUFNLFdBQUE7d0JBQ2YsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFOzRCQUNuQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUM7NEJBQ3ZDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7NEJBQy9CLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7NEJBQy9CLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dDQUM5QixJQUFBLEtBQUEsZUFBZ0MscUJBQXFCLENBQUMsTUFBTSxDQUFDLElBQUEsRUFBNUQsSUFBSSxRQUFBLEVBQUUsU0FBUyxRQUFBLEVBQUUsVUFBVSxRQUFpQyxDQUFDO2dDQUNwRSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUMzQixJQUFJLElBQUk7b0NBQUUsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztnQ0FDcEQsU0FBUzs2QkFDVjs0QkFDRCxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7Z0NBQzlCLElBQU0sSUFBSSxHQUFHLE1BQW1DLENBQUM7Z0NBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtvQ0FBRSxNQUFNO2dDQUNoQixJQUFBLEtBQUEsZUFDRixvQkFBb0IsQ0FBQyxNQUFtQyxDQUFDLElBQUEsRUFEdEQsU0FBUyxRQUFBLEVBQUUsY0FBYyxRQUM2QixDQUFDO2dDQUM5RCxlQUFlLEdBQUcsY0FBYyxDQUFDO2dDQUNqQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUMzQixTQUFTOzZCQUNWOzRCQUNEO2dDQUNFLE1BQU07eUJBQ1Q7d0JBQ0QsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNoRjs7Ozs7Ozs7O2dCQUVELDRGQUE0RjtnQkFDNUYsMkZBQTJGO2dCQUMzRiw0RkFBNEY7Z0JBQzVGLHFGQUFxRjtnQkFDckYsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBZSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3JFLElBQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFbkYsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7Z0JBQ2hDLElBQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDOztvQkFDN0IsS0FBd0IsSUFBQSw4QkFBQSxpQkFBQSx5QkFBeUIsQ0FBQSxvRUFBQSwyR0FBRTt3QkFBOUMsSUFBTSxTQUFTLHNDQUFBO3dCQUNsQixzRUFBc0U7d0JBQ3RFLG1EQUFtRDt3QkFDbkQsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLElBQXFCLENBQUM7d0JBQ3RELElBQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFFNUQsd0VBQXdFO3dCQUN4RSw2RUFBNkU7d0JBQzdFLElBQUksYUFBYSxFQUFFOzRCQUNqQixtQkFBbUIsR0FBRyxJQUFJLENBQUM7eUJBQzVCO3dCQUVELElBQUksYUFBYSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7NEJBQ3pDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQzs0QkFDdkYsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO3lCQUN4QztxQkFDRjs7Ozs7Ozs7O2dCQUVELElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFO29CQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztpQkFDbEU7Z0JBQ0QsSUFBSSxlQUFlLEVBQUU7b0JBQ25CLElBQUksbUJBQW1CLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBckIsQ0FBcUIsQ0FBQyxFQUFFO3dCQUMzRSw2RUFBNkU7d0JBQzdFLCtEQUErRDt3QkFDL0QsVUFBVSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FDN0MsV0FBVyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7cUJBQ3RGO2lCQUNGO2dCQUNELElBQUksbUJBQW1CLENBQUMsSUFBSSxFQUFFO29CQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7aUJBQ3RGO2dCQUVELElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQzNCLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRTNGLE9BQU8sRUFBRSxDQUFDLHNCQUFzQixDQUM1QixTQUFTLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFDM0UsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFDeEYsT0FBTyxDQUFDLENBQUM7WUFDZixDQUFDO1lBRUQ7Ozs7ZUFJRztZQUNILFNBQVMseUJBQXlCLENBQUMsSUFBYTtnQkFDOUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQy9CLE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3hDO2dCQUNELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckUsQ0FBQztZQUVELE9BQU8sVUFBQyxFQUFpQjtnQkFDdkIsa0ZBQWtGO2dCQUNsRiwrRUFBK0U7Z0JBQy9FLGtFQUFrRTtnQkFDbEUsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBMVVELDBFQTBVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzQWxpYXNJbXBvcnREZWNsYXJhdGlvbiwgbG9hZElzUmVmZXJlbmNlZEFsaWFzRGVjbGFyYXRpb25QYXRjaH0gZnJvbSAnLi9wYXRjaF9hbGlhc19yZWZlcmVuY2VfcmVzb2x1dGlvbic7XG5cbi8qKlxuICogV2hldGhlciBhIGdpdmVuIGRlY29yYXRvciBzaG91bGQgYmUgdHJlYXRlZCBhcyBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAqIEVpdGhlciBpdCdzIHVzZWQgaW4gQGFuZ3VsYXIvY29yZSwgb3IgaXQncyBpbXBvcnRlZCBmcm9tIHRoZXJlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNDb3JlIHx8IChkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKTtcbn1cblxuLypcbiAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgQ29kZSBiZWxvdyBoYXMgYmVlbiBleHRyYWN0ZWQgZnJvbSB0aGUgdHNpY2tsZSBkZWNvcmF0b3IgZG93bmxldmVsIHRyYW5zZm9ybWVyXG4gIGFuZCBhIGZldyBsb2NhbCBtb2RpZmljYXRpb25zIGhhdmUgYmVlbiBhcHBsaWVkOlxuXG4gICAgMS4gVHNpY2tsZSBieSBkZWZhdWx0IHByb2Nlc3NlZCBhbGwgZGVjb3JhdG9ycyB0aGF0IGhhZCB0aGUgYEBBbm5vdGF0aW9uYCBKU0RvYy5cbiAgICAgICBXZSBtb2RpZmllZCB0aGUgdHJhbnNmb3JtIHRvIG9ubHkgYmUgY29uY2VybmVkIHdpdGgga25vd24gQW5ndWxhciBkZWNvcmF0b3JzLlxuICAgIDIuIFRzaWNrbGUgYnkgZGVmYXVsdCBhZGRlZCBgQG5vY29sbGFwc2VgIHRvIGFsbCBnZW5lcmF0ZWQgYGN0b3JQYXJhbWV0ZXJzYCBwcm9wZXJ0aWVzLlxuICAgICAgIFdlIG9ubHkgZG8gdGhpcyB3aGVuIGBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcmAgaXMgZW5hYmxlZC5cbiAgICAzLiBUc2lja2xlIGRvZXMgbm90IGhhbmRsZSB1bmlvbiB0eXBlcyBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uIGkuZS4gaWYgYSBpbmplY3RlZCB0eXBlXG4gICAgICAgaXMgZGVub3RlZCB3aXRoIGBAT3B0aW9uYWxgLCB0aGUgYWN0dWFsIHR5cGUgY291bGQgYmUgc2V0IHRvIGBUIHwgbnVsbGAuXG4gICAgICAgU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9jb21taXQvODI2ODAzZDA3MzZiODA3ODY3Y2FmZjlmODkwM2U1MDg5NzBhZDVlNC5cbiAgICA0LiBUc2lja2xlIHJlbGllZCBvbiBgZW1pdERlY29yYXRvck1ldGFkYXRhYCB0byBiZSBzZXQgdG8gYHRydWVgLiBUaGlzIGlzIGR1ZSB0byBhIGxpbWl0YXRpb25cbiAgICAgICBpbiBUeXBlU2NyaXB0IHRyYW5zZm9ybWVycyB0aGF0IG5ldmVyIGhhcyBiZWVuIGZpeGVkLiBXZSB3ZXJlIGFibGUgdG8gd29yayBhcm91bmQgdGhpc1xuICAgICAgIGxpbWl0YXRpb24gc28gdGhhdCBgZW1pdERlY29yYXRvck1ldGFkYXRhYCBkb2Vzbid0IG5lZWQgdG8gYmUgc3BlY2lmaWVkLlxuICAgICAgIFNlZTogYHBhdGNoQWxpYXNSZWZlcmVuY2VSZXNvbHV0aW9uYCBmb3IgbW9yZSBkZXRhaWxzLlxuXG4gIEhlcmUgaXMgYSBsaW5rIHRvIHRoZSB0c2lja2xlIHJldmlzaW9uIG9uIHdoaWNoIHRoaXMgdHJhbnNmb3JtZXIgaXMgYmFzZWQ6XG4gIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3RzaWNrbGUvYmxvYi9mYWUwNmJlY2IxNTcwZjQ5MTgwNjA2MGQ4M2YyOWYyZDUwYzQzY2RkL3NyYy9kZWNvcmF0b3JfZG93bmxldmVsX3RyYW5zZm9ybWVyLnRzXG4gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4qL1xuXG5jb25zdCBERUNPUkFUT1JfSU5WT0NBVElPTl9KU0RPQ19UWVBFID0gJyFBcnJheTx7dHlwZTogIUZ1bmN0aW9uLCBhcmdzOiAodW5kZWZpbmVkfCFBcnJheTw/Pil9Pic7XG5cbi8qKlxuICogRXh0cmFjdHMgdGhlIHR5cGUgb2YgdGhlIGRlY29yYXRvciAodGhlIGZ1bmN0aW9uIG9yIGV4cHJlc3Npb24gaW52b2tlZCksIGFzIHdlbGwgYXMgYWxsIHRoZVxuICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZGVjb3JhdG9yLiBSZXR1cm5zIGFuIEFTVCB3aXRoIHRoZSBmb3JtOlxuICpcbiAqICAgICAvLyBGb3IgQGRlY29yYXRvcihhcmcxLCBhcmcyKVxuICogICAgIHsgdHlwZTogZGVjb3JhdG9yLCBhcmdzOiBbYXJnMSwgYXJnMl0gfVxuICovXG5mdW5jdGlvbiBleHRyYWN0TWV0YWRhdGFGcm9tU2luZ2xlRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcjogdHMuRGVjb3JhdG9yLCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICBjb25zdCBtZXRhZGF0YVByb3BlcnRpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW107XG4gIGNvbnN0IGV4cHIgPSBkZWNvcmF0b3IuZXhwcmVzc2lvbjtcbiAgc3dpdGNoIChleHByLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcjpcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3Igd2FzIGEgcGxhaW4gQEZvby5cbiAgICAgIG1ldGFkYXRhUHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIGV4cHIpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3Igd2FzIGEgY2FsbCwgbGlrZSBARm9vKGJhcikuXG4gICAgICBjb25zdCBjYWxsID0gZXhwciBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIG1ldGFkYXRhUHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIGNhbGwuZXhwcmVzc2lvbikpO1xuICAgICAgaWYgKGNhbGwuYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhcmdzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBhcmcgb2YgY2FsbC5hcmd1bWVudHMpIHtcbiAgICAgICAgICBhcmdzLnB1c2goYXJnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhcmdzQXJyYXlMaXRlcmFsID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFyZ3MpO1xuICAgICAgICBhcmdzQXJyYXlMaXRlcmFsLmVsZW1lbnRzLmhhc1RyYWlsaW5nQ29tbWEgPSB0cnVlO1xuICAgICAgICBtZXRhZGF0YVByb3BlcnRpZXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ2FyZ3MnLCBhcmdzQXJyYXlMaXRlcmFsKSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIGZpbGU6IGRlY29yYXRvci5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgIHN0YXJ0OiBkZWNvcmF0b3IuZ2V0U3RhcnQoKSxcbiAgICAgICAgbGVuZ3RoOiBkZWNvcmF0b3IuZ2V0RW5kKCkgLSBkZWNvcmF0b3IuZ2V0U3RhcnQoKSxcbiAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICBgJHt0cy5TeW50YXhLaW5kW2RlY29yYXRvci5raW5kXX0gbm90IGltcGxlbWVudGVkIGluIGdhdGhlcmluZyBkZWNvcmF0b3IgbWV0YWRhdGEuYCxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgY29kZTogMCxcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwobWV0YWRhdGFQcm9wZXJ0aWVzKTtcbn1cblxuLyoqXG4gKiBjcmVhdGVDdG9yUGFyYW1ldGVyc0NsYXNzUHJvcGVydHkgY3JlYXRlcyBhIHN0YXRpYyAnY3RvclBhcmFtZXRlcnMnIHByb3BlcnR5IGNvbnRhaW5pbmdcbiAqIGRvd25sZXZlbGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbi5cbiAqXG4gKiBUaGUgcHJvcGVydHkgY29udGFpbnMgYW4gYXJyb3cgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdCBsaXRlcmFscyBvZiB0aGUgc2hhcGU6XG4gKiAgICAgc3RhdGljIGN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW3tcbiAqICAgICAgIHR5cGU6IFNvbWVDbGFzc3x1bmRlZmluZWQsICAvLyB0aGUgdHlwZSBvZiB0aGUgcGFyYW0gdGhhdCdzIGRlY29yYXRlZCwgaWYgaXQncyBhIHZhbHVlLlxuICogICAgICAgZGVjb3JhdG9yczogW3tcbiAqICAgICAgICAgdHlwZTogRGVjb3JhdG9yRm4sICAvLyB0aGUgdHlwZSBvZiB0aGUgZGVjb3JhdG9yIHRoYXQncyBpbnZva2VkLlxuICogICAgICAgICBhcmdzOiBbQVJHU10sICAgICAgIC8vIHRoZSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBkZWNvcmF0b3IuXG4gKiAgICAgICB9XVxuICogICAgIH1dO1xuICovXG5mdW5jdGlvbiBjcmVhdGVDdG9yUGFyYW1ldGVyc0NsYXNzUHJvcGVydHkoXG4gICAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSxcbiAgICBlbnRpdHlOYW1lVG9FeHByZXNzaW9uOiAobjogdHMuRW50aXR5TmFtZSkgPT4gdHMuRXhwcmVzc2lvbiB8IHVuZGVmaW5lZCxcbiAgICBjdG9yUGFyYW1ldGVyczogUGFyYW1ldGVyRGVjb3JhdGlvbkluZm9bXSxcbiAgICBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW4pOiB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uIHtcbiAgY29uc3QgcGFyYW1zOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGN0b3JQYXJhbSBvZiBjdG9yUGFyYW1ldGVycykge1xuICAgIGlmICghY3RvclBhcmFtLnR5cGUgJiYgY3RvclBhcmFtLmRlY29yYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBwYXJhbXMucHVzaCh0cy5jcmVhdGVOdWxsKCkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyYW1UeXBlID0gY3RvclBhcmFtLnR5cGUgP1xuICAgICAgICB0eXBlUmVmZXJlbmNlVG9FeHByZXNzaW9uKGVudGl0eU5hbWVUb0V4cHJlc3Npb24sIGN0b3JQYXJhbS50eXBlKSA6XG4gICAgICAgIHVuZGVmaW5lZDtcbiAgICBjb25zdCBtZW1iZXJzID1cbiAgICAgICAgW3RzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIHBhcmFtVHlwZSB8fCB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKSldO1xuXG4gICAgY29uc3QgZGVjb3JhdG9yczogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb25bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZGVjbyBvZiBjdG9yUGFyYW0uZGVjb3JhdG9ycykge1xuICAgICAgZGVjb3JhdG9ycy5wdXNoKGV4dHJhY3RNZXRhZGF0YUZyb21TaW5nbGVEZWNvcmF0b3IoZGVjbywgZGlhZ25vc3RpY3MpKTtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICBtZW1iZXJzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdkZWNvcmF0b3JzJywgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGRlY29yYXRvcnMpKSk7XG4gICAgfVxuICAgIHBhcmFtcy5wdXNoKHRzLmNyZWF0ZU9iamVjdExpdGVyYWwobWVtYmVycykpO1xuICB9XG5cbiAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVBcnJvd0Z1bmN0aW9uKFxuICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIFtdLCB1bmRlZmluZWQsIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuRXF1YWxzR3JlYXRlclRoYW5Ub2tlbiksXG4gICAgICB0cy5jcmVhdGVBcnJheUxpdGVyYWwocGFyYW1zLCB0cnVlKSk7XG4gIGNvbnN0IGN0b3JQcm9wID0gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgJ2N0b3JQYXJhbWV0ZXJzJywgdW5kZWZpbmVkLFxuICAgICAgdW5kZWZpbmVkLCBpbml0aWFsaXplcik7XG4gIGlmIChpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQpIHtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoY3RvclByb3AsIFtcbiAgICAgIHtcbiAgICAgICAga2luZDogdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLFxuICAgICAgICB0ZXh0OiBbXG4gICAgICAgICAgYCpgLFxuICAgICAgICAgIGAgKiBAdHlwZSB7ZnVuY3Rpb24oKTogIUFycmF5PChudWxsfHtgLFxuICAgICAgICAgIGAgKiAgIHR5cGU6ID8sYCxcbiAgICAgICAgICBgICogICBkZWNvcmF0b3JzOiAodW5kZWZpbmVkfCR7REVDT1JBVE9SX0lOVk9DQVRJT05fSlNET0NfVFlQRX0pLGAsXG4gICAgICAgICAgYCAqIH0pPn1gLFxuICAgICAgICAgIGAgKiBAbm9jb2xsYXBzZWAsXG4gICAgICAgICAgYCBgLFxuICAgICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgICBwb3M6IC0xLFxuICAgICAgICBlbmQ6IC0xLFxuICAgICAgICBoYXNUcmFpbGluZ05ld0xpbmU6IHRydWUsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG4gIHJldHVybiBjdG9yUHJvcDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSAocG90ZW50aWFsbHkpIHZhbHVlIHBhcnQgZm9yIHRoZSBnaXZlbiBub2RlLlxuICpcbiAqIFRoaXMgaXMgYSBwYXJ0aWFsIHJlLWltcGxlbWVudGF0aW9uIG9mIFR5cGVTY3JpcHQncyBzZXJpYWxpemVUeXBlUmVmZXJlbmNlTm9kZS4gVGhpcyBpcyBhXG4gKiB3b3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzE3NTE2IChzZXJpYWxpemVUeXBlUmVmZXJlbmNlTm9kZVxuICogbm90IGJlaW5nIGV4cG9zZWQpLiBJbiBwcmFjdGljZSB0aGlzIGltcGxlbWVudGF0aW9uIGlzIHN1ZmZpY2llbnQgZm9yIEFuZ3VsYXIncyB1c2Ugb2YgdHlwZVxuICogbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIHR5cGVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgZW50aXR5TmFtZVRvRXhwcmVzc2lvbjogKG46IHRzLkVudGl0eU5hbWUpID0+IHRzLkV4cHJlc3Npb24gfCB1bmRlZmluZWQsXG4gICAgbm9kZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCB7XG4gIGxldCBraW5kID0gbm9kZS5raW5kO1xuICBpZiAodHMuaXNMaXRlcmFsVHlwZU5vZGUobm9kZSkpIHtcbiAgICAvLyBUcmVhdCBsaXRlcmFsIHR5cGVzIGxpa2UgdGhlaXIgYmFzZSB0eXBlIChib29sZWFuLCBzdHJpbmcsIG51bWJlcikuXG4gICAga2luZCA9IG5vZGUubGl0ZXJhbC5raW5kO1xuICB9XG4gIHN3aXRjaCAoa2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvblR5cGU6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yVHlwZTpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdGdW5jdGlvbicpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5BcnJheVR5cGU6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlR1cGxlVHlwZTpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdBcnJheScpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5UeXBlUHJlZGljYXRlOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRmFsc2VLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5Cb29sZWFuS2V5d29yZDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdCb29sZWFuJyk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0tleXdvcmQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignU3RyaW5nJyk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk9iamVjdEtleXdvcmQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignT2JqZWN0Jyk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk51bWVyaWNMaXRlcmFsOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ051bWJlcicpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5UeXBlUmVmZXJlbmNlOlxuICAgICAgY29uc3QgdHlwZVJlZiA9IG5vZGUgYXMgdHMuVHlwZVJlZmVyZW5jZU5vZGU7XG4gICAgICAvLyBJZ25vcmUgYW55IGdlbmVyaWMgdHlwZXMsIGp1c3QgcmV0dXJuIHRoZSBiYXNlIHR5cGUuXG4gICAgICByZXR1cm4gZW50aXR5TmFtZVRvRXhwcmVzc2lvbih0eXBlUmVmLnR5cGVOYW1lKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVW5pb25UeXBlOlxuICAgICAgY29uc3QgY2hpbGRUeXBlTm9kZXMgPVxuICAgICAgICAgIChub2RlIGFzIHRzLlVuaW9uVHlwZU5vZGUpXG4gICAgICAgICAgICAgIC50eXBlcy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICB0ID0+ICEodHMuaXNMaXRlcmFsVHlwZU5vZGUodCkgJiYgdC5saXRlcmFsLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQpKTtcbiAgICAgIHJldHVybiBjaGlsZFR5cGVOb2Rlcy5sZW5ndGggPT09IDEgP1xuICAgICAgICAgIHR5cGVSZWZlcmVuY2VUb0V4cHJlc3Npb24oZW50aXR5TmFtZVRvRXhwcmVzc2lvbiwgY2hpbGRUeXBlTm9kZXNbMF0pIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIHN5bWJvbCByZWZlcnMgdG8gYSB2YWx1ZSB0aGF0IGV4aXN0cyBhdCBydW50aW1lIChhcyBkaXN0aW5jdCBmcm9tIGEgdHlwZSkuXG4gKlxuICogRXhwYW5kcyBhbGlhc2VzLCB3aGljaCBpcyBpbXBvcnRhbnQgZm9yIHRoZSBjYXNlIHdoZXJlXG4gKiAgIGltcG9ydCAqIGFzIHggZnJvbSAnc29tZS1tb2R1bGUnO1xuICogYW5kIHggaXMgbm93IGEgdmFsdWUgKHRoZSBtb2R1bGUgb2JqZWN0KS5cbiAqL1xuZnVuY3Rpb24gc3ltYm9sSXNSdW50aW1lVmFsdWUodHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzeW1ib2w6IHRzLlN5bWJvbCk6IGJvb2xlYW4ge1xuICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICBzeW1ib2wgPSB0eXBlQ2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvLyBOb3RlIHRoYXQgY29uc3QgZW51bXMgYXJlIGEgc3BlY2lhbCBjYXNlLCBiZWNhdXNlXG4gIC8vIHdoaWxlIHRoZXkgaGF2ZSBhIHZhbHVlLCB0aGV5IGRvbid0IGV4aXN0IGF0IHJ1bnRpbWUuXG4gIHJldHVybiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuVmFsdWUgJiB0cy5TeW1ib2xGbGFncy5Db25zdEVudW1FeGNsdWRlcykgIT09IDA7XG59XG5cbi8qKiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mbyBkZXNjcmliZXMgdGhlIGluZm9ybWF0aW9uIGZvciBhIHNpbmdsZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIuICovXG5pbnRlcmZhY2UgUGFyYW1ldGVyRGVjb3JhdGlvbkluZm8ge1xuICAvKipcbiAgICogVGhlIHR5cGUgZGVjbGFyYXRpb24gZm9yIHRoZSBwYXJhbWV0ZXIuIE9ubHkgc2V0IGlmIHRoZSB0eXBlIGlzIGEgdmFsdWUgKGUuZy4gYSBjbGFzcywgbm90IGFuXG4gICAqIGludGVyZmFjZSkuXG4gICAqL1xuICB0eXBlOiB0cy5UeXBlTm9kZXxudWxsO1xuICAvKiogVGhlIGxpc3Qgb2YgZGVjb3JhdG9ycyBmb3VuZCBvbiB0aGUgcGFyYW1ldGVyLCBudWxsIGlmIG5vbmUuICovXG4gIGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdO1xufVxuXG4vKipcbiAqIEdldHMgYSB0cmFuc2Zvcm1lciBmb3IgZG93bmxldmVsaW5nIEFuZ3VsYXIgZGVjb3JhdG9ycy5cbiAqIEBwYXJhbSB0eXBlQ2hlY2tlciBSZWZlcmVuY2UgdG8gdGhlIHByb2dyYW0ncyB0eXBlIGNoZWNrZXIuXG4gKiBAcGFyYW0gaG9zdCBSZWZsZWN0aW9uIGhvc3QgdGhhdCBpcyB1c2VkIGZvciBkZXRlcm1pbmluZyBkZWNvcmF0b3JzLlxuICogQHBhcmFtIGRpYWdub3N0aWNzIExpc3Qgd2hpY2ggd2lsbCBiZSBwb3B1bGF0ZWQgd2l0aCBkaWFnbm9zdGljcyBpZiBhbnkuXG4gKiBAcGFyYW0gaXNDb3JlIFdoZXRoZXIgdGhlIGN1cnJlbnQgVHlwZVNjcmlwdCBwcm9ncmFtIGlzIGZvciB0aGUgYEBhbmd1bGFyL2NvcmVgIHBhY2thZ2UuXG4gKiBAcGFyYW0gaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkIFdoZXRoZXIgY2xvc3VyZSBhbm5vdGF0aW9ucyBuZWVkIHRvIGJlIGFkZGVkIHdoZXJlIG5lZWRlZC5cbiAqIEBwYXJhbSBza2lwQ2xhc3NEZWNvcmF0b3JzIFdoZXRoZXIgY2xhc3MgZGVjb3JhdG9ycyBzaG91bGQgYmUgc2tpcHBlZCBmcm9tIGRvd25sZXZlbGluZy5cbiAqICAgVGhpcyBpcyB1c2VmdWwgZm9yIEpJVCBtb2RlIHdoZXJlIGNsYXNzIGRlY29yYXRvcnMgc2hvdWxkIGJlIHByZXNlcnZlZCBhcyB0aGV5IGNvdWxkIHJlbHlcbiAqICAgb24gaW1tZWRpYXRlIGV4ZWN1dGlvbi4gZS5nLiBkb3dubGV2ZWxpbmcgYEBJbmplY3RhYmxlYCBtZWFucyB0aGF0IHRoZSBpbmplY3RhYmxlIGZhY3RvcnlcbiAqICAgaXMgbm90IGNyZWF0ZWQsIGFuZCBpbmplY3RpbmcgdGhlIHRva2VuIHdpbGwgbm90IHdvcmsuIElmIHRoaXMgZGVjb3JhdG9yIHdvdWxkIG5vdCBiZVxuICogICBkb3dubGV2ZWxlZCwgdGhlIGBJbmplY3RhYmxlYCBkZWNvcmF0b3Igd2lsbCBleGVjdXRlIGltbWVkaWF0ZWx5IG9uIGZpbGUgbG9hZCwgYW5kXG4gKiAgIEFuZ3VsYXIgd2lsbCBnZW5lcmF0ZSB0aGUgY29ycmVzcG9uZGluZyBpbmplY3RhYmxlIGZhY3RvcnkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREb3dubGV2ZWxEZWNvcmF0b3JzVHJhbnNmb3JtKFxuICAgIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgaG9zdDogUmVmbGVjdGlvbkhvc3QsIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgaXNDb3JlOiBib29sZWFuLCBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW4sXG4gICAgc2tpcENsYXNzRGVjb3JhdG9yczogYm9vbGVhbik6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIGZ1bmN0aW9uIGFkZEpTRG9jVHlwZUFubm90YXRpb24obm9kZTogdHMuTm9kZSwganNkb2NUeXBlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIWlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhub2RlLCBbXG4gICAgICB7XG4gICAgICAgIGtpbmQ6IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSxcbiAgICAgICAgdGV4dDogYCogQHR5cGUgeyR7anNkb2NUeXBlfX0gYCxcbiAgICAgICAgcG9zOiAtMSxcbiAgICAgICAgZW5kOiAtMSxcbiAgICAgICAgaGFzVHJhaWxpbmdOZXdMaW5lOiB0cnVlLFxuICAgICAgfSxcbiAgICBdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBhIGxpc3Qgb2YgZGVjb3JhdG9yIG1ldGFkYXRhIG9iamVjdCBBU1RzIGFuZCBwcm9kdWNlcyBhbiBBU1QgZm9yIGFcbiAgICogc3RhdGljIGNsYXNzIHByb3BlcnR5IG9mIGFuIGFycmF5IG9mIHRob3NlIG1ldGFkYXRhIG9iamVjdHMuXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVEZWNvcmF0b3JDbGFzc1Byb3BlcnR5KGRlY29yYXRvckxpc3Q6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uW10pIHtcbiAgICBjb25zdCBtb2RpZmllciA9IHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZGVjb3JhdG9yTGlzdCwgdHJ1ZSk7XG4gICAgLy8gTkI6IHRoZSAuZGVjb3JhdG9ycyBwcm9wZXJ0eSBkb2VzIG5vdCBnZXQgYSBAbm9jb2xsYXBzZSBwcm9wZXJ0eS4gVGhlcmVcbiAgICAvLyBpcyBubyBnb29kIHJlYXNvbiB3aHkgLSBpdCBtZWFucyAuZGVjb3JhdG9ycyBpcyBub3QgcnVudGltZSBhY2Nlc3NpYmxlXG4gICAgLy8gaWYgeW91IGNvbXBpbGUgd2l0aCBjb2xsYXBzZSBwcm9wZXJ0aWVzLCB3aGVyZWFzIHByb3BEZWNvcmF0b3JzIGlzLFxuICAgIC8vIHdoaWNoIGRvZXNuJ3QgZm9sbG93IGFueSBzdHJpbmdlbnQgbG9naWMuIEhvd2V2ZXIgdGhpcyBoYXMgYmVlbiB0aGVcbiAgICAvLyBjYXNlIHByZXZpb3VzbHksIGFuZCBhZGRpbmcgaXQgYmFjayBpbiBsZWFkcyB0byBzdWJzdGFudGlhbCBjb2RlIHNpemVcbiAgICAvLyBpbmNyZWFzZXMgYXMgQ2xvc3VyZSBmYWlscyB0byB0cmVlIHNoYWtlIHRoZXNlIHByb3BzXG4gICAgLy8gd2l0aG91dCBAbm9jb2xsYXBzZS5cbiAgICBjb25zdCBwcm9wID1cbiAgICAgICAgdHMuY3JlYXRlUHJvcGVydHkodW5kZWZpbmVkLCBbbW9kaWZpZXJdLCAnZGVjb3JhdG9ycycsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBpbml0aWFsaXplcik7XG4gICAgYWRkSlNEb2NUeXBlQW5ub3RhdGlvbihwcm9wLCBERUNPUkFUT1JfSU5WT0NBVElPTl9KU0RPQ19UWVBFKTtcbiAgICByZXR1cm4gcHJvcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBjcmVhdGVQcm9wRGVjb3JhdG9yc0NsYXNzUHJvcGVydHkgY3JlYXRlcyBhIHN0YXRpYyAncHJvcERlY29yYXRvcnMnXG4gICAqIHByb3BlcnR5IGNvbnRhaW5pbmcgdHlwZSBpbmZvcm1hdGlvbiBmb3IgZXZlcnkgcHJvcGVydHkgdGhhdCBoYXMgYVxuICAgKiBkZWNvcmF0b3IgYXBwbGllZC5cbiAgICpcbiAgICogICAgIHN0YXRpYyBwcm9wRGVjb3JhdG9yczoge1trZXk6IHN0cmluZ106IHt0eXBlOiBGdW5jdGlvbiwgYXJncz86XG4gICAqIGFueVtdfVtdfSA9IHsgcHJvcEE6IFt7dHlwZTogTXlEZWNvcmF0b3IsIGFyZ3M6IFsxLCAyXX0sIC4uLl0sXG4gICAqICAgICAgIC4uLlxuICAgKiAgICAgfTtcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVByb3BEZWNvcmF0b3JzQ2xhc3NQcm9wZXJ0eShcbiAgICAgIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgICBwcm9wZXJ0aWVzOiBNYXA8c3RyaW5nLCB0cy5EZWNvcmF0b3JbXT4pOiB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uIHtcbiAgICAvLyAgYHN0YXRpYyBwcm9wRGVjb3JhdG9yczoge1trZXk6IHN0cmluZ106IGAgKyB7dHlwZTogRnVuY3Rpb24sIGFyZ3M/OlxuICAgIC8vICBhbnlbXX1bXSArIGB9ID0ge1xcbmApO1xuICAgIGNvbnN0IGVudHJpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW107XG4gICAgZm9yIChjb25zdCBbbmFtZSwgZGVjb3JhdG9yc10gb2YgcHJvcGVydGllcy5lbnRyaWVzKCkpIHtcbiAgICAgIGVudHJpZXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB0cy5jcmVhdGVBcnJheUxpdGVyYWwoXG4gICAgICAgICAgICAgIGRlY29yYXRvcnMubWFwKGRlY28gPT4gZXh0cmFjdE1ldGFkYXRhRnJvbVNpbmdsZURlY29yYXRvcihkZWNvLCBkaWFnbm9zdGljcykpKSkpO1xuICAgIH1cbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZW50cmllcywgdHJ1ZSk7XG4gICAgY29uc3QgcHJvcCA9IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgJ3Byb3BEZWNvcmF0b3JzJywgdW5kZWZpbmVkLFxuICAgICAgICB1bmRlZmluZWQsIGluaXRpYWxpemVyKTtcbiAgICBhZGRKU0RvY1R5cGVBbm5vdGF0aW9uKHByb3AsIGAhT2JqZWN0PHN0cmluZywgJHtERUNPUkFUT1JfSU5WT0NBVElPTl9KU0RPQ19UWVBFfT5gKTtcbiAgICByZXR1cm4gcHJvcDtcbiAgfVxuXG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgLy8gRW5zdXJlIHRoYXQgcmVmZXJlbmNlZCB0eXBlIHN5bWJvbHMgYXJlIG5vdCBlbGlkZWQgYnkgVHlwZVNjcmlwdC4gSW1wb3J0cyBmb3JcbiAgICAvLyBzdWNoIHBhcmFtZXRlciB0eXBlIHN5bWJvbHMgcHJldmlvdXNseSBjb3VsZCBiZSB0eXBlLW9ubHksIGJ1dCBub3cgbWlnaHQgYmUgYWxzb1xuICAgIC8vIHVzZWQgaW4gdGhlIGBjdG9yUGFyYW1ldGVyc2Agc3RhdGljIHByb3BlcnR5IGFzIGEgdmFsdWUuIFdlIHdhbnQgdG8gbWFrZSBzdXJlXG4gICAgLy8gdGhhdCBUeXBlU2NyaXB0IGRvZXMgbm90IGVsaWRlIGltcG9ydHMgZm9yIHN1Y2ggdHlwZSByZWZlcmVuY2VzLiBSZWFkIG1vcmVcbiAgICAvLyBhYm91dCB0aGlzIGluIHRoZSBkZXNjcmlwdGlvbiBmb3IgYGxvYWRJc1JlZmVyZW5jZWRBbGlhc0RlY2xhcmF0aW9uUGF0Y2hgLlxuICAgIGNvbnN0IHJlZmVyZW5jZWRQYXJhbWV0ZXJUeXBlcyA9IGxvYWRJc1JlZmVyZW5jZWRBbGlhc0RlY2xhcmF0aW9uUGF0Y2goY29udGV4dCk7XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbiBFbnRpdHlOYW1lIChmcm9tIGEgdHlwZSBhbm5vdGF0aW9uKSB0byBhbiBleHByZXNzaW9uIChhY2Nlc3NpbmcgYSB2YWx1ZSkuXG4gICAgICpcbiAgICAgKiBGb3IgYSBnaXZlbiBxdWFsaWZpZWQgbmFtZSwgdGhpcyB3YWxrcyBkZXB0aCBmaXJzdCB0byBmaW5kIHRoZSBsZWZ0bW9zdCBpZGVudGlmaWVyLFxuICAgICAqIGFuZCB0aGVuIGNvbnZlcnRzIHRoZSBwYXRoIGludG8gYSBwcm9wZXJ0eSBhY2Nlc3MgdGhhdCBjYW4gYmUgdXNlZCBhcyBleHByZXNzaW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVudGl0eU5hbWVUb0V4cHJlc3Npb24obmFtZTogdHMuRW50aXR5TmFtZSk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgICAgIGNvbnN0IHN5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obmFtZSk7XG4gICAgICAvLyBDaGVjayBpZiB0aGUgZW50aXR5IG5hbWUgcmVmZXJlbmNlcyBhIHN5bWJvbCB0aGF0IGlzIGFuIGFjdHVhbCB2YWx1ZS4gSWYgaXQgaXMgbm90LCBpdFxuICAgICAgLy8gY2Fubm90IGJlIHJlZmVyZW5jZWQgYnkgYW4gZXhwcmVzc2lvbiwgc28gcmV0dXJuIHVuZGVmaW5lZC5cbiAgICAgIGlmICghc3ltYm9sIHx8ICFzeW1ib2xJc1J1bnRpbWVWYWx1ZSh0eXBlQ2hlY2tlciwgc3ltYm9sKSB8fCAhc3ltYm9sLmRlY2xhcmF0aW9ucyB8fFxuICAgICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICAvLyBJZiB3ZSBkZWFsIHdpdGggYSBxdWFsaWZpZWQgbmFtZSwgYnVpbGQgdXAgYSBwcm9wZXJ0eSBhY2Nlc3MgZXhwcmVzc2lvblxuICAgICAgLy8gdGhhdCBjb3VsZCBiZSB1c2VkIGluIHRoZSBKYXZhU2NyaXB0IG91dHB1dC5cbiAgICAgIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobmFtZSkpIHtcbiAgICAgICAgY29uc3QgY29udGFpbmVyRXhwciA9IGVudGl0eU5hbWVUb0V4cHJlc3Npb24obmFtZS5sZWZ0KTtcbiAgICAgICAgaWYgKGNvbnRhaW5lckV4cHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGNvbnRhaW5lckV4cHIsIG5hbWUucmlnaHQpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbCA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICAvLyBJZiB0aGUgZ2l2ZW4gZW50aXR5IG5hbWUgaGFzIGJlZW4gcmVzb2x2ZWQgdG8gYW4gYWxpYXMgaW1wb3J0IGRlY2xhcmF0aW9uLFxuICAgICAgLy8gZW5zdXJlIHRoYXQgdGhlIGFsaWFzIGRlY2xhcmF0aW9uIGlzIG5vdCBlbGlkZWQgYnkgVHlwZVNjcmlwdCwgYW5kIHVzZSBpdHNcbiAgICAgIC8vIG5hbWUgaWRlbnRpZmllciB0byByZWZlcmVuY2UgaXQgYXQgcnVudGltZS5cbiAgICAgIGlmIChpc0FsaWFzSW1wb3J0RGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICAgICAgcmVmZXJlbmNlZFBhcmFtZXRlclR5cGVzLmFkZChkZWNsKTtcbiAgICAgICAgLy8gSWYgdGhlIGVudGl0eSBuYW1lIHJlc29sdmVzIHRvIGFuIGFsaWFzIGltcG9ydCBkZWNsYXJhdGlvbiwgd2UgcmVmZXJlbmNlIHRoZVxuICAgICAgICAvLyBlbnRpdHkgYmFzZWQgb24gdGhlIGFsaWFzIGltcG9ydCBuYW1lLiBUaGlzIGVuc3VyZXMgdGhhdCBUeXBlU2NyaXB0IHByb3Blcmx5XG4gICAgICAgIC8vIHJlc29sdmVzIHRoZSBsaW5rIHRvIHRoZSBpbXBvcnQuIENsb25pbmcgdGhlIG9yaWdpbmFsIGVudGl0eSBuYW1lIGlkZW50aWZpZXJcbiAgICAgICAgLy8gY291bGQgbGVhZCB0byBhbiBpbmNvcnJlY3QgcmVzb2x1dGlvbiBhdCBsb2NhbCBzY29wZS4gZS5nLiBDb25zaWRlciB0aGUgZm9sbG93aW5nXG4gICAgICAgIC8vIHNuaXBwZXQ6IGBjb25zdHJ1Y3RvcihEZXA6IERlcCkge31gLiBJbiBzdWNoIGEgY2FzZSwgdGhlIGxvY2FsIGBEZXBgIGlkZW50aWZpZXJcbiAgICAgICAgLy8gd291bGQgcmVzb2x2ZSB0byB0aGUgYWN0dWFsIHBhcmFtZXRlciBuYW1lLCBhbmQgbm90IHRvIHRoZSBkZXNpcmVkIGltcG9ydC5cbiAgICAgICAgLy8gVGhpcyBoYXBwZW5zIGJlY2F1c2UgdGhlIGVudGl0eSBuYW1lIGlkZW50aWZpZXIgc3ltYm9sIGlzIGludGVybmFsbHkgY29uc2lkZXJlZFxuICAgICAgICAvLyBhcyB0eXBlLW9ubHkgYW5kIHRoZXJlZm9yZSBUeXBlU2NyaXB0IHRyaWVzIHRvIHJlc29sdmUgaXQgYXMgdmFsdWUgbWFudWFsbHkuXG4gICAgICAgIC8vIFdlIGNhbiBoZWxwIFR5cGVTY3JpcHQgYW5kIGF2b2lkIHRoaXMgbm9uLXJlbGlhYmxlIHJlc29sdXRpb24gYnkgdXNpbmcgYW4gaWRlbnRpZmllclxuICAgICAgICAvLyB0aGF0IGlzIG5vdCB0eXBlLW9ubHkgYW5kIGlzIGRpcmVjdGx5IGxpbmtlZCB0byB0aGUgaW1wb3J0IGFsaWFzIGRlY2xhcmF0aW9uLlxuICAgICAgICBpZiAoZGVjbC5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKGRlY2wubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIENsb25lIHRoZSBvcmlnaW5hbCBlbnRpdHkgbmFtZSBpZGVudGlmaWVyIHNvIHRoYXQgaXQgY2FuIGJlIHVzZWQgdG8gcmVmZXJlbmNlXG4gICAgICAvLyBpdHMgdmFsdWUgYXQgcnVudGltZS4gVGhpcyBpcyB1c2VkIHdoZW4gdGhlIGlkZW50aWZpZXIgaXMgcmVzb2x2aW5nIHRvIGEgZmlsZVxuICAgICAgLy8gbG9jYWwgZGVjbGFyYXRpb24gKG90aGVyd2lzZSBpdCB3b3VsZCByZXNvbHZlIHRvIGFuIGFsaWFzIGltcG9ydCBkZWNsYXJhdGlvbikuXG4gICAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKG5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybXMgYSBjbGFzcyBlbGVtZW50LiBSZXR1cm5zIGEgdGhyZWUgdHVwbGUgb2YgbmFtZSwgdHJhbnNmb3JtZWQgZWxlbWVudCwgYW5kXG4gICAgICogZGVjb3JhdG9ycyBmb3VuZC4gUmV0dXJucyBhbiB1bmRlZmluZWQgbmFtZSBpZiB0aGVyZSBhcmUgbm8gZGVjb3JhdG9ycyB0byBsb3dlciBvbiB0aGVcbiAgICAgKiBlbGVtZW50LCBvciB0aGUgZWxlbWVudCBoYXMgYW4gZXhvdGljIG5hbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdHJhbnNmb3JtQ2xhc3NFbGVtZW50KGVsZW1lbnQ6IHRzLkNsYXNzRWxlbWVudCk6XG4gICAgICAgIFtzdHJpbmd8dW5kZWZpbmVkLCB0cy5DbGFzc0VsZW1lbnQsIHRzLkRlY29yYXRvcltdXSB7XG4gICAgICBlbGVtZW50ID0gdHMudmlzaXRFYWNoQ2hpbGQoZWxlbWVudCwgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCk7XG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9LZWVwOiB0cy5EZWNvcmF0b3JbXSA9IFtdO1xuICAgICAgY29uc3QgdG9Mb3dlcjogdHMuRGVjb3JhdG9yW10gPSBbXTtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGVsZW1lbnQpIHx8IFtdO1xuICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2YgZGVjb3JhdG9ycykge1xuICAgICAgICAvLyBXZSBvbmx5IGRlYWwgd2l0aCBjb25jcmV0ZSBub2RlcyBpbiBUeXBlU2NyaXB0IHNvdXJjZXMsIHNvIHdlIGRvbid0XG4gICAgICAgIC8vIG5lZWQgdG8gaGFuZGxlIHN5bnRoZXRpY2FsbHkgY3JlYXRlZCBkZWNvcmF0b3JzLlxuICAgICAgICBjb25zdCBkZWNvcmF0b3JOb2RlID0gZGVjb3JhdG9yLm5vZGUhIGFzIHRzLkRlY29yYXRvcjtcbiAgICAgICAgaWYgKCFpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCBpc0NvcmUpKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5wdXNoKGRlY29yYXRvck5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRvTG93ZXIucHVzaChkZWNvcmF0b3JOb2RlKTtcbiAgICAgIH1cbiAgICAgIGlmICghdG9Mb3dlci5sZW5ndGgpIHJldHVybiBbdW5kZWZpbmVkLCBlbGVtZW50LCBbXV07XG5cbiAgICAgIGlmICghZWxlbWVudC5uYW1lIHx8ICF0cy5pc0lkZW50aWZpZXIoZWxlbWVudC5uYW1lKSkge1xuICAgICAgICAvLyBNZXRob2QgaGFzIGEgd2VpcmQgbmFtZSwgZS5nLlxuICAgICAgICAvLyAgIFtTeW1ib2wuZm9vXSgpIHsuLi59XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgIGZpbGU6IGVsZW1lbnQuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgICAgIHN0YXJ0OiBlbGVtZW50LmdldFN0YXJ0KCksXG4gICAgICAgICAgbGVuZ3RoOiBlbGVtZW50LmdldEVuZCgpIC0gZWxlbWVudC5nZXRTdGFydCgpLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiBgQ2Fubm90IHByb2Nlc3MgZGVjb3JhdG9ycyBmb3IgY2xhc3MgZWxlbWVudCB3aXRoIG5vbi1hbmFseXphYmxlIG5hbWUuYCxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIGNvZGU6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gW3VuZGVmaW5lZCwgZWxlbWVudCwgW11dO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBuYW1lID0gKGVsZW1lbnQubmFtZSBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuICAgICAgY29uc3QgbXV0YWJsZSA9IHRzLmdldE11dGFibGVDbG9uZShlbGVtZW50KTtcbiAgICAgIChtdXRhYmxlIGFzIGFueSkuZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNUb0tlZXAubGVuZ3RoID9cbiAgICAgICAgICB0cy5zZXRUZXh0UmFuZ2UodHMuY3JlYXRlTm9kZUFycmF5KGRlY29yYXRvcnNUb0tlZXApLCBtdXRhYmxlLmRlY29yYXRvcnMpIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4gW25hbWUsIG11dGFibGUsIHRvTG93ZXJdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybXMgYSBjb25zdHJ1Y3Rvci4gUmV0dXJucyB0aGUgdHJhbnNmb3JtZWQgY29uc3RydWN0b3IgYW5kIHRoZSBsaXN0IG9mIHBhcmFtZXRlclxuICAgICAqIGluZm9ybWF0aW9uIGNvbGxlY3RlZCwgY29uc2lzdGluZyBvZiBkZWNvcmF0b3JzIGFuZCBvcHRpb25hbCB0eXBlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUNvbnN0cnVjdG9yKGN0b3I6IHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pOlxuICAgICAgICBbdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbiwgUGFyYW1ldGVyRGVjb3JhdGlvbkluZm9bXV0ge1xuICAgICAgY3RvciA9IHRzLnZpc2l0RWFjaENoaWxkKGN0b3IsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpO1xuXG4gICAgICBjb25zdCBuZXdQYXJhbWV0ZXJzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdID0gW107XG4gICAgICBjb25zdCBvbGRQYXJhbWV0ZXJzID1cbiAgICAgICAgICB0cy52aXNpdFBhcmFtZXRlckxpc3QoY3Rvci5wYXJhbWV0ZXJzLCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KTtcbiAgICAgIGNvbnN0IHBhcmFtZXRlcnNJbmZvOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mb1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIG9sZFBhcmFtZXRlcnMpIHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc1RvS2VlcDogdHMuRGVjb3JhdG9yW10gPSBbXTtcbiAgICAgICAgY29uc3QgcGFyYW1JbmZvOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mbyA9IHtkZWNvcmF0b3JzOiBbXSwgdHlwZTogbnVsbH07XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKHBhcmFtKSB8fCBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRvciBvZiBkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgLy8gV2Ugb25seSBkZWFsIHdpdGggY29uY3JldGUgbm9kZXMgaW4gVHlwZVNjcmlwdCBzb3VyY2VzLCBzbyB3ZSBkb24ndFxuICAgICAgICAgIC8vIG5lZWQgdG8gaGFuZGxlIHN5bnRoZXRpY2FsbHkgY3JlYXRlZCBkZWNvcmF0b3JzLlxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvck5vZGUgPSBkZWNvcmF0b3Iubm9kZSEgYXMgdHMuRGVjb3JhdG9yO1xuICAgICAgICAgIGlmICghaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgaXNDb3JlKSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5wdXNoKGRlY29yYXRvck5vZGUpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmFtSW5mbyEuZGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvck5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbS50eXBlKSB7XG4gICAgICAgICAgLy8gcGFyYW0gaGFzIGEgdHlwZSBwcm92aWRlZCwgZS5nLiBcImZvbzogQmFyXCIuXG4gICAgICAgICAgLy8gVGhlIHR5cGUgd2lsbCBiZSBlbWl0dGVkIGFzIGEgdmFsdWUgZXhwcmVzc2lvbiBpbiBlbnRpdHlOYW1lVG9FeHByZXNzaW9uLCB3aGljaCB0YWtlc1xuICAgICAgICAgIC8vIGNhcmUgbm90IHRvIGVtaXQgYW55dGhpbmcgZm9yIHR5cGVzIHRoYXQgY2Fubm90IGJlIGV4cHJlc3NlZCBhcyBhIHZhbHVlIChlLmcuXG4gICAgICAgICAgLy8gaW50ZXJmYWNlcykuXG4gICAgICAgICAgcGFyYW1JbmZvIS50eXBlID0gcGFyYW0udHlwZTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbWV0ZXJzSW5mby5wdXNoKHBhcmFtSW5mbyk7XG4gICAgICAgIGNvbnN0IG5ld1BhcmFtID0gdHMudXBkYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgcGFyYW0sXG4gICAgICAgICAgICAvLyBNdXN0IHBhc3MgJ3VuZGVmaW5lZCcgdG8gYXZvaWQgZW1pdHRpbmcgZGVjb3JhdG9yIG1ldGFkYXRhLlxuICAgICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5sZW5ndGggPyBkZWNvcmF0b3JzVG9LZWVwIDogdW5kZWZpbmVkLCBwYXJhbS5tb2RpZmllcnMsXG4gICAgICAgICAgICBwYXJhbS5kb3REb3REb3RUb2tlbiwgcGFyYW0ubmFtZSwgcGFyYW0ucXVlc3Rpb25Ub2tlbiwgcGFyYW0udHlwZSwgcGFyYW0uaW5pdGlhbGl6ZXIpO1xuICAgICAgICBuZXdQYXJhbWV0ZXJzLnB1c2gobmV3UGFyYW0pO1xuICAgICAgfVxuICAgICAgY29uc3QgdXBkYXRlZCA9IHRzLnVwZGF0ZUNvbnN0cnVjdG9yKFxuICAgICAgICAgIGN0b3IsIGN0b3IuZGVjb3JhdG9ycywgY3Rvci5tb2RpZmllcnMsIG5ld1BhcmFtZXRlcnMsXG4gICAgICAgICAgdHMudmlzaXRGdW5jdGlvbkJvZHkoY3Rvci5ib2R5LCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KSk7XG4gICAgICByZXR1cm4gW3VwZGF0ZWQsIHBhcmFtZXRlcnNJbmZvXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIGEgc2luZ2xlIGNsYXNzIGRlY2xhcmF0aW9uOlxuICAgICAqIC0gZGlzcGF0Y2hlcyB0byBzdHJpcCBkZWNvcmF0b3JzIG9uIG1lbWJlcnNcbiAgICAgKiAtIGNvbnZlcnRzIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzIHRvIGFubm90YXRpb25zXG4gICAgICogLSBjcmVhdGVzIGEgY3RvclBhcmFtZXRlcnMgcHJvcGVydHlcbiAgICAgKiAtIGNyZWF0ZXMgYSBwcm9wRGVjb3JhdG9ycyBwcm9wZXJ0eVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24oY2xhc3NEZWNsOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgICBjbGFzc0RlY2wgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoY2xhc3NEZWNsKTtcblxuICAgICAgY29uc3QgbmV3TWVtYmVyczogdHMuQ2xhc3NFbGVtZW50W10gPSBbXTtcbiAgICAgIGNvbnN0IGRlY29yYXRlZFByb3BlcnRpZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjb3JhdG9yW10+KCk7XG4gICAgICBsZXQgY2xhc3NQYXJhbWV0ZXJzOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mb1tdfG51bGwgPSBudWxsO1xuXG4gICAgICBmb3IgKGNvbnN0IG1lbWJlciBvZiBjbGFzc0RlY2wubWVtYmVycykge1xuICAgICAgICBzd2l0Y2ggKG1lbWJlci5raW5kKSB7XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlByb3BlcnR5RGVjbGFyYXRpb246XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkdldEFjY2Vzc29yOlxuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TZXRBY2Nlc3NvcjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuTWV0aG9kRGVjbGFyYXRpb246IHtcbiAgICAgICAgICAgIGNvbnN0IFtuYW1lLCBuZXdNZW1iZXIsIGRlY29yYXRvcnNdID0gdHJhbnNmb3JtQ2xhc3NFbGVtZW50KG1lbWJlcik7XG4gICAgICAgICAgICBuZXdNZW1iZXJzLnB1c2gobmV3TWVtYmVyKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSBkZWNvcmF0ZWRQcm9wZXJ0aWVzLnNldChuYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3I6IHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtZW1iZXIgYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGlmICghY3Rvci5ib2R5KSBicmVhaztcbiAgICAgICAgICAgIGNvbnN0IFtuZXdNZW1iZXIsIHBhcmFtZXRlcnNJbmZvXSA9XG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtQ29uc3RydWN0b3IobWVtYmVyIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgY2xhc3NQYXJhbWV0ZXJzID0gcGFyYW1ldGVyc0luZm87XG4gICAgICAgICAgICBuZXdNZW1iZXJzLnB1c2gobmV3TWVtYmVyKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbmV3TWVtYmVycy5wdXNoKHRzLnZpc2l0RWFjaENoaWxkKG1lbWJlciwgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgYFJlZmxlY3Rpb25Ib3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKClgIG1ldGhvZCB3aWxsIG5vdCByZXR1cm4gY2VydGFpbiBraW5kcyBvZlxuICAgICAgLy8gZGVjb3JhdG9ycyB0aGF0IHdpbGwgbmV2ZXIgYmUgQW5ndWxhciBkZWNvcmF0b3JzLiBTbyB3ZSBjYW5ub3QgcmVseSBvbiBpdCB0byBjYXB0dXJlIGFsbFxuICAgICAgLy8gdGhlIGRlY29yYXRvcnMgdGhhdCBzaG91bGQgYmUga2VwdC4gSW5zdGVhZCB3ZSBzdGFydCBvZmYgd2l0aCBhIHNldCBvZiB0aGUgcmF3IGRlY29yYXRvcnNcbiAgICAgIC8vIG9uIHRoZSBjbGFzcywgYW5kIG9ubHkgcmVtb3ZlIHRoZSBvbmVzIHRoYXQgaGF2ZSBiZWVuIGlkZW50aWZpZWQgZm9yIGRvd25sZXZlbGluZy5cbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb0tlZXAgPSBuZXcgU2V0PHRzLkRlY29yYXRvcj4oY2xhc3NEZWNsLmRlY29yYXRvcnMpO1xuICAgICAgY29uc3QgcG9zc2libGVBbmd1bGFyRGVjb3JhdG9ycyA9IGhvc3QuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oY2xhc3NEZWNsKSB8fCBbXTtcblxuICAgICAgbGV0IGhhc0FuZ3VsYXJEZWNvcmF0b3IgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb0xvd2VyID0gW107XG4gICAgICBmb3IgKGNvbnN0IGRlY29yYXRvciBvZiBwb3NzaWJsZUFuZ3VsYXJEZWNvcmF0b3JzKSB7XG4gICAgICAgIC8vIFdlIG9ubHkgZGVhbCB3aXRoIGNvbmNyZXRlIG5vZGVzIGluIFR5cGVTY3JpcHQgc291cmNlcywgc28gd2UgZG9uJ3RcbiAgICAgICAgLy8gbmVlZCB0byBoYW5kbGUgc3ludGhldGljYWxseSBjcmVhdGVkIGRlY29yYXRvcnMuXG4gICAgICAgIGNvbnN0IGRlY29yYXRvck5vZGUgPSBkZWNvcmF0b3Iubm9kZSEgYXMgdHMuRGVjb3JhdG9yO1xuICAgICAgICBjb25zdCBpc05nRGVjb3JhdG9yID0gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgaXNDb3JlKTtcblxuICAgICAgICAvLyBLZWVwIHRyYWNrIGlmIHdlIGNvbWUgYWNyb3NzIGFuIEFuZ3VsYXIgY2xhc3MgZGVjb3JhdG9yLiBUaGlzIGlzIHVzZWRcbiAgICAgICAgLy8gZm9yIHRvIGRldGVybWluZSB3aGV0aGVyIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgc2hvdWxkIGJlIGNhcHR1cmVkIG9yIG5vdC5cbiAgICAgICAgaWYgKGlzTmdEZWNvcmF0b3IpIHtcbiAgICAgICAgICBoYXNBbmd1bGFyRGVjb3JhdG9yID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc05nRGVjb3JhdG9yICYmICFza2lwQ2xhc3NEZWNvcmF0b3JzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvTG93ZXIucHVzaChleHRyYWN0TWV0YWRhdGFGcm9tU2luZ2xlRGVjb3JhdG9yKGRlY29yYXRvck5vZGUsIGRpYWdub3N0aWNzKSk7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5kZWxldGUoZGVjb3JhdG9yTm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGRlY29yYXRvcnNUb0xvd2VyLmxlbmd0aCkge1xuICAgICAgICBuZXdNZW1iZXJzLnB1c2goY3JlYXRlRGVjb3JhdG9yQ2xhc3NQcm9wZXJ0eShkZWNvcmF0b3JzVG9Mb3dlcikpO1xuICAgICAgfVxuICAgICAgaWYgKGNsYXNzUGFyYW1ldGVycykge1xuICAgICAgICBpZiAoaGFzQW5ndWxhckRlY29yYXRvciB8fCBjbGFzc1BhcmFtZXRlcnMuc29tZShwID0+ICEhcC5kZWNvcmF0b3JzLmxlbmd0aCkpIHtcbiAgICAgICAgICAvLyBDYXB0dXJlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgaWYgdGhlIGNsYXNzIGhhcyBBbmd1bGFyIGRlY29yYXRvciBhcHBsaWVkLFxuICAgICAgICAgIC8vIG9yIGlmIGFueSBvZiB0aGUgcGFyYW1ldGVycyBoYXMgZGVjb3JhdG9ycyBhcHBsaWVkIGRpcmVjdGx5LlxuICAgICAgICAgIG5ld01lbWJlcnMucHVzaChjcmVhdGVDdG9yUGFyYW1ldGVyc0NsYXNzUHJvcGVydHkoXG4gICAgICAgICAgICAgIGRpYWdub3N0aWNzLCBlbnRpdHlOYW1lVG9FeHByZXNzaW9uLCBjbGFzc1BhcmFtZXRlcnMsIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZGVjb3JhdGVkUHJvcGVydGllcy5zaXplKSB7XG4gICAgICAgIG5ld01lbWJlcnMucHVzaChjcmVhdGVQcm9wRGVjb3JhdG9yc0NsYXNzUHJvcGVydHkoZGlhZ25vc3RpY3MsIGRlY29yYXRlZFByb3BlcnRpZXMpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWVtYmVycyA9IHRzLnNldFRleHRSYW5nZShcbiAgICAgICAgICB0cy5jcmVhdGVOb2RlQXJyYXkobmV3TWVtYmVycywgY2xhc3NEZWNsLm1lbWJlcnMuaGFzVHJhaWxpbmdDb21tYSksIGNsYXNzRGVjbC5tZW1iZXJzKTtcblxuICAgICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgY2xhc3NEZWNsLCBkZWNvcmF0b3JzVG9LZWVwLnNpemUgPyBBcnJheS5mcm9tKGRlY29yYXRvcnNUb0tlZXApIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGNsYXNzRGVjbC5tb2RpZmllcnMsIGNsYXNzRGVjbC5uYW1lLCBjbGFzc0RlY2wudHlwZVBhcmFtZXRlcnMsIGNsYXNzRGVjbC5oZXJpdGFnZUNsYXVzZXMsXG4gICAgICAgICAgbWVtYmVycyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtZXIgdmlzaXRvciB0aGF0IGxvb2tzIGZvciBBbmd1bGFyIGRlY29yYXRvcnMgYW5kIHJlcGxhY2VzIHRoZW0gd2l0aFxuICAgICAqIGRvd25sZXZlbGVkIHN0YXRpYyBwcm9wZXJ0aWVzLiBBbHNvIGNvbGxlY3RzIGNvbnN0cnVjdG9yIHR5cGUgbWV0YWRhdGEgZm9yXG4gICAgICogY2xhc3MgZGVjbGFyYXRpb24gdGhhdCBhcmUgZGVjb3JhdGVkIHdpdGggYW4gQW5ndWxhciBkZWNvcmF0b3IuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvcihub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1DbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiAoc2Y6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgIC8vIERvd25sZXZlbCBkZWNvcmF0b3JzIGFuZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgdHlwZXMuIFdlIHdpbGwga2VlcCB0cmFjayBvZiBhbGxcbiAgICAgIC8vIHJlZmVyZW5jZWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIHR5cGVzIHNvIHRoYXQgd2UgY2FuIGluc3RydWN0IFR5cGVTY3JpcHQgdG9cbiAgICAgIC8vIG5vdCBlbGlkZSB0aGVpciBpbXBvcnRzIGlmIHRoZXkgcHJldmlvdXNseSB3ZXJlIG9ubHkgdHlwZS1vbmx5LlxuICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKHNmLCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KTtcbiAgICB9O1xuICB9O1xufVxuIl19