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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/trait"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TraitCompiler = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/api");
    var trait_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/trait");
    /**
     * The heart of Angular compilation.
     *
     * The `TraitCompiler` is responsible for processing all classes in the program. Any time a
     * `DecoratorHandler` matches a class, a "trait" is created to represent that Angular aspect of the
     * class (such as the class having a component definition).
     *
     * The `TraitCompiler` transitions each trait through the various phases of compilation, culminating
     * in the production of `CompileResult`s instructing the compiler to apply various mutations to the
     * class (like adding fields or type declarations).
     */
    var TraitCompiler = /** @class */ (function () {
        function TraitCompiler(handlers, reflector, perf, incrementalBuild, compileNonExportedClasses, compilationMode, dtsTransforms, semanticDepGraphUpdater) {
            var e_1, _a;
            this.handlers = handlers;
            this.reflector = reflector;
            this.perf = perf;
            this.incrementalBuild = incrementalBuild;
            this.compileNonExportedClasses = compileNonExportedClasses;
            this.compilationMode = compilationMode;
            this.dtsTransforms = dtsTransforms;
            this.semanticDepGraphUpdater = semanticDepGraphUpdater;
            /**
             * Maps class declarations to their `ClassRecord`, which tracks the Ivy traits being applied to
             * those classes.
             */
            this.classes = new Map();
            /**
             * Maps source files to any class declaration(s) within them which have been discovered to contain
             * Ivy traits.
             */
            this.fileToClasses = new Map();
            /**
             * Tracks which source files have been analyzed but did not contain any traits. This set allows
             * the compiler to skip analyzing these files in an incremental rebuild.
             */
            this.filesWithoutTraits = new Set();
            this.reexportMap = new Map();
            this.handlersByName = new Map();
            try {
                for (var handlers_1 = tslib_1.__values(handlers), handlers_1_1 = handlers_1.next(); !handlers_1_1.done; handlers_1_1 = handlers_1.next()) {
                    var handler = handlers_1_1.value;
                    this.handlersByName.set(handler.name, handler);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (handlers_1_1 && !handlers_1_1.done && (_a = handlers_1.return)) _a.call(handlers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        TraitCompiler.prototype.analyzeSync = function (sf) {
            this.analyze(sf, false);
        };
        TraitCompiler.prototype.analyzeAsync = function (sf) {
            return this.analyze(sf, true);
        };
        TraitCompiler.prototype.analyze = function (sf, preanalyze) {
            var e_2, _a;
            var _this = this;
            // We shouldn't analyze declaration files.
            if (sf.isDeclarationFile) {
                return undefined;
            }
            // analyze() really wants to return `Promise<void>|void`, but TypeScript cannot narrow a return
            // type of 'void', so `undefined` is used instead.
            var promises = [];
            var priorWork = this.incrementalBuild.priorAnalysisFor(sf);
            if (priorWork !== null) {
                this.perf.eventCount(perf_1.PerfEvent.SourceFileReuseAnalysis);
                if (priorWork.length > 0) {
                    try {
                        for (var priorWork_1 = tslib_1.__values(priorWork), priorWork_1_1 = priorWork_1.next(); !priorWork_1_1.done; priorWork_1_1 = priorWork_1.next()) {
                            var priorRecord = priorWork_1_1.value;
                            this.adopt(priorRecord);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (priorWork_1_1 && !priorWork_1_1.done && (_a = priorWork_1.return)) _a.call(priorWork_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    this.perf.eventCount(perf_1.PerfEvent.TraitReuseAnalysis, priorWork.length);
                }
                else {
                    this.filesWithoutTraits.add(sf);
                }
                // Skip the rest of analysis, as this file's prior traits are being reused.
                return;
            }
            var visit = function (node) {
                if (_this.reflector.isClass(node)) {
                    _this.analyzeClass(node, preanalyze ? promises : null);
                }
                ts.forEachChild(node, visit);
            };
            visit(sf);
            if (preanalyze && promises.length > 0) {
                return Promise.all(promises).then(function () { return undefined; });
            }
            else {
                return undefined;
            }
        };
        TraitCompiler.prototype.recordFor = function (clazz) {
            if (this.classes.has(clazz)) {
                return this.classes.get(clazz);
            }
            else {
                return null;
            }
        };
        TraitCompiler.prototype.recordsFor = function (sf) {
            var e_3, _a;
            if (!this.fileToClasses.has(sf)) {
                return null;
            }
            var records = [];
            try {
                for (var _b = tslib_1.__values(this.fileToClasses.get(sf)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var clazz = _c.value;
                    records.push(this.classes.get(clazz));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return records;
        };
        TraitCompiler.prototype.getAnalyzedRecords = function () {
            var e_4, _a, e_5, _b, e_6, _c;
            var result = new Map();
            try {
                for (var _d = tslib_1.__values(this.fileToClasses), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var _f = tslib_1.__read(_e.value, 2), sf = _f[0], classes = _f[1];
                    var records = [];
                    try {
                        for (var classes_1 = (e_5 = void 0, tslib_1.__values(classes)), classes_1_1 = classes_1.next(); !classes_1_1.done; classes_1_1 = classes_1.next()) {
                            var clazz = classes_1_1.value;
                            records.push(this.classes.get(clazz));
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (classes_1_1 && !classes_1_1.done && (_b = classes_1.return)) _b.call(classes_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    result.set(sf, records);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_4) throw e_4.error; }
            }
            try {
                for (var _g = tslib_1.__values(this.filesWithoutTraits), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var sf = _h.value;
                    result.set(sf, []);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return result;
        };
        /**
         * Import a `ClassRecord` from a previous compilation.
         *
         * Traits from the `ClassRecord` have accurate metadata, but the `handler` is from the old program
         * and needs to be updated (matching is done by name). A new pending trait is created and then
         * transitioned to analyzed using the previous analysis. If the trait is in the errored state,
         * instead the errors are copied over.
         */
        TraitCompiler.prototype.adopt = function (priorRecord) {
            var e_7, _a;
            var record = {
                hasPrimaryHandler: priorRecord.hasPrimaryHandler,
                hasWeakHandlers: priorRecord.hasWeakHandlers,
                metaDiagnostics: priorRecord.metaDiagnostics,
                node: priorRecord.node,
                traits: [],
            };
            try {
                for (var _b = tslib_1.__values(priorRecord.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var priorTrait = _c.value;
                    var handler = this.handlersByName.get(priorTrait.handler.name);
                    var trait = trait_1.Trait.pending(handler, priorTrait.detected);
                    if (priorTrait.state === trait_1.TraitState.Analyzed || priorTrait.state === trait_1.TraitState.Resolved) {
                        var symbol = this.makeSymbolForTrait(handler, record.node, priorTrait.analysis);
                        trait = trait.toAnalyzed(priorTrait.analysis, priorTrait.analysisDiagnostics, symbol);
                        if (trait.analysis !== null && trait.handler.register !== undefined) {
                            trait.handler.register(record.node, trait.analysis);
                        }
                    }
                    else if (priorTrait.state === trait_1.TraitState.Skipped) {
                        trait = trait.toSkipped();
                    }
                    record.traits.push(trait);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            this.classes.set(record.node, record);
            var sf = record.node.getSourceFile();
            if (!this.fileToClasses.has(sf)) {
                this.fileToClasses.set(sf, new Set());
            }
            this.fileToClasses.get(sf).add(record.node);
        };
        TraitCompiler.prototype.scanClassForTraits = function (clazz) {
            if (!this.compileNonExportedClasses && !this.reflector.isStaticallyExported(clazz)) {
                return null;
            }
            var decorators = this.reflector.getDecoratorsOfDeclaration(clazz);
            return this.detectTraits(clazz, decorators);
        };
        TraitCompiler.prototype.detectTraits = function (clazz, decorators) {
            var e_8, _a;
            var record = this.recordFor(clazz);
            var foundTraits = [];
            try {
                for (var _b = tslib_1.__values(this.handlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var handler = _c.value;
                    var result = handler.detect(clazz, decorators);
                    if (result === undefined) {
                        continue;
                    }
                    var isPrimaryHandler = handler.precedence === api_1.HandlerPrecedence.PRIMARY;
                    var isWeakHandler = handler.precedence === api_1.HandlerPrecedence.WEAK;
                    var trait = trait_1.Trait.pending(handler, result);
                    foundTraits.push(trait);
                    if (record === null) {
                        // This is the first handler to match this class. This path is a fast path through which
                        // most classes will flow.
                        record = {
                            node: clazz,
                            traits: [trait],
                            metaDiagnostics: null,
                            hasPrimaryHandler: isPrimaryHandler,
                            hasWeakHandlers: isWeakHandler,
                        };
                        this.classes.set(clazz, record);
                        var sf = clazz.getSourceFile();
                        if (!this.fileToClasses.has(sf)) {
                            this.fileToClasses.set(sf, new Set());
                        }
                        this.fileToClasses.get(sf).add(clazz);
                    }
                    else {
                        // This is at least the second handler to match this class. This is a slower path that some
                        // classes will go through, which validates that the set of decorators applied to the class
                        // is valid.
                        // Validate according to rules as follows:
                        //
                        // * WEAK handlers are removed if a non-WEAK handler matches.
                        // * Only one PRIMARY handler can match at a time. Any other PRIMARY handler matching a
                        //   class with an existing PRIMARY handler is an error.
                        if (!isWeakHandler && record.hasWeakHandlers) {
                            // The current handler is not a WEAK handler, but the class has other WEAK handlers.
                            // Remove them.
                            record.traits =
                                record.traits.filter(function (field) { return field.handler.precedence !== api_1.HandlerPrecedence.WEAK; });
                            record.hasWeakHandlers = false;
                        }
                        else if (isWeakHandler && !record.hasWeakHandlers) {
                            // The current handler is a WEAK handler, but the class has non-WEAK handlers already.
                            // Drop the current one.
                            continue;
                        }
                        if (isPrimaryHandler && record.hasPrimaryHandler) {
                            // The class already has a PRIMARY handler, and another one just matched.
                            record.metaDiagnostics = [{
                                    category: ts.DiagnosticCategory.Error,
                                    code: Number('-99' + diagnostics_1.ErrorCode.DECORATOR_COLLISION),
                                    file: typescript_1.getSourceFile(clazz),
                                    start: clazz.getStart(undefined, false),
                                    length: clazz.getWidth(),
                                    messageText: 'Two incompatible decorators on class',
                                }];
                            record.traits = foundTraits = [];
                            break;
                        }
                        // Otherwise, it's safe to accept the multiple decorators here. Update some of the metadata
                        // regarding this class.
                        record.traits.push(trait);
                        record.hasPrimaryHandler = record.hasPrimaryHandler || isPrimaryHandler;
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return foundTraits.length > 0 ? foundTraits : null;
        };
        TraitCompiler.prototype.makeSymbolForTrait = function (handler, decl, analysis) {
            if (analysis === null) {
                return null;
            }
            var symbol = handler.symbol(decl, analysis);
            if (symbol !== null && this.semanticDepGraphUpdater !== null) {
                var isPrimary = handler.precedence === api_1.HandlerPrecedence.PRIMARY;
                if (!isPrimary) {
                    throw new Error("AssertionError: " + handler.name + " returned a symbol but is not a primary handler.");
                }
                this.semanticDepGraphUpdater.registerSymbol(symbol);
            }
            return symbol;
        };
        TraitCompiler.prototype.analyzeClass = function (clazz, preanalyzeQueue) {
            var e_9, _a;
            var _this = this;
            var traits = this.scanClassForTraits(clazz);
            if (traits === null) {
                // There are no Ivy traits on the class, so it can safely be skipped.
                return;
            }
            var _loop_1 = function (trait) {
                var analyze = function () { return _this.analyzeTrait(clazz, trait); };
                var preanalysis = null;
                if (preanalyzeQueue !== null && trait.handler.preanalyze !== undefined) {
                    // Attempt to run preanalysis. This could fail with a `FatalDiagnosticError`; catch it if it
                    // does.
                    try {
                        preanalysis = trait.handler.preanalyze(clazz, trait.detected.metadata) || null;
                    }
                    catch (err) {
                        if (err instanceof diagnostics_1.FatalDiagnosticError) {
                            trait.toAnalyzed(null, [err.toDiagnostic()], null);
                            return { value: void 0 };
                        }
                        else {
                            throw err;
                        }
                    }
                }
                if (preanalysis !== null) {
                    preanalyzeQueue.push(preanalysis.then(analyze));
                }
                else {
                    analyze();
                }
            };
            try {
                for (var traits_1 = tslib_1.__values(traits), traits_1_1 = traits_1.next(); !traits_1_1.done; traits_1_1 = traits_1.next()) {
                    var trait = traits_1_1.value;
                    var state_1 = _loop_1(trait);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (traits_1_1 && !traits_1_1.done && (_a = traits_1.return)) _a.call(traits_1);
                }
                finally { if (e_9) throw e_9.error; }
            }
        };
        TraitCompiler.prototype.analyzeTrait = function (clazz, trait, flags) {
            var _a, _b, _c;
            if (trait.state !== trait_1.TraitState.Pending) {
                throw new Error("Attempt to analyze trait of " + clazz.name.text + " in state " + trait_1.TraitState[trait.state] + " (expected DETECTED)");
            }
            this.perf.eventCount(perf_1.PerfEvent.TraitAnalyze);
            // Attempt analysis. This could fail with a `FatalDiagnosticError`; catch it if it does.
            var result;
            try {
                result = trait.handler.analyze(clazz, trait.detected.metadata, flags);
            }
            catch (err) {
                if (err instanceof diagnostics_1.FatalDiagnosticError) {
                    trait.toAnalyzed(null, [err.toDiagnostic()], null);
                    return;
                }
                else {
                    throw err;
                }
            }
            var symbol = this.makeSymbolForTrait(trait.handler, clazz, (_a = result.analysis) !== null && _a !== void 0 ? _a : null);
            if (result.analysis !== undefined && trait.handler.register !== undefined) {
                trait.handler.register(clazz, result.analysis);
            }
            trait = trait.toAnalyzed((_b = result.analysis) !== null && _b !== void 0 ? _b : null, (_c = result.diagnostics) !== null && _c !== void 0 ? _c : null, symbol);
        };
        TraitCompiler.prototype.resolve = function () {
            var e_10, _a, e_11, _b, e_12, _c;
            var _d, _e;
            var classes = Array.from(this.classes.keys());
            try {
                for (var classes_2 = tslib_1.__values(classes), classes_2_1 = classes_2.next(); !classes_2_1.done; classes_2_1 = classes_2.next()) {
                    var clazz = classes_2_1.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _f = (e_11 = void 0, tslib_1.__values(record.traits)), _g = _f.next(); !_g.done; _g = _f.next()) {
                            var trait = _g.value;
                            var handler = trait.handler;
                            switch (trait.state) {
                                case trait_1.TraitState.Skipped:
                                    continue;
                                case trait_1.TraitState.Pending:
                                    throw new Error("Resolving a trait that hasn't been analyzed: " + clazz.name.text + " / " + Object.getPrototypeOf(trait.handler).constructor.name);
                                case trait_1.TraitState.Resolved:
                                    throw new Error("Resolving an already resolved trait");
                            }
                            if (trait.analysis === null) {
                                // No analysis results, cannot further process this trait.
                                continue;
                            }
                            if (handler.resolve === undefined) {
                                // No resolution of this trait needed - it's considered successful by default.
                                trait = trait.toResolved(null, null);
                                continue;
                            }
                            var result = void 0;
                            try {
                                result = handler.resolve(clazz, trait.analysis, trait.symbol);
                            }
                            catch (err) {
                                if (err instanceof diagnostics_1.FatalDiagnosticError) {
                                    trait = trait.toResolved(null, [err.toDiagnostic()]);
                                    continue;
                                }
                                else {
                                    throw err;
                                }
                            }
                            trait = trait.toResolved((_d = result.data) !== null && _d !== void 0 ? _d : null, (_e = result.diagnostics) !== null && _e !== void 0 ? _e : null);
                            if (result.reexports !== undefined) {
                                var fileName = clazz.getSourceFile().fileName;
                                if (!this.reexportMap.has(fileName)) {
                                    this.reexportMap.set(fileName, new Map());
                                }
                                var fileReexports = this.reexportMap.get(fileName);
                                try {
                                    for (var _h = (e_12 = void 0, tslib_1.__values(result.reexports)), _j = _h.next(); !_j.done; _j = _h.next()) {
                                        var reexport = _j.value;
                                        fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                                    }
                                }
                                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                                finally {
                                    try {
                                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                                    }
                                    finally { if (e_12) throw e_12.error; }
                                }
                            }
                        }
                    }
                    catch (e_11_1) { e_11 = { error: e_11_1 }; }
                    finally {
                        try {
                            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                        }
                        finally { if (e_11) throw e_11.error; }
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (classes_2_1 && !classes_2_1.done && (_a = classes_2.return)) _a.call(classes_2);
                }
                finally { if (e_10) throw e_10.error; }
            }
        };
        /**
         * Generate type-checking code into the `TypeCheckContext` for any components within the given
         * `ts.SourceFile`.
         */
        TraitCompiler.prototype.typeCheck = function (sf, ctx) {
            var e_13, _a, e_14, _b;
            if (!this.fileToClasses.has(sf)) {
                return;
            }
            try {
                for (var _c = tslib_1.__values(this.fileToClasses.get(sf)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var clazz = _d.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _e = (e_14 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var trait = _f.value;
                            if (trait.state !== trait_1.TraitState.Resolved) {
                                continue;
                            }
                            else if (trait.handler.typeCheck === undefined) {
                                continue;
                            }
                            if (trait.resolution !== null) {
                                trait.handler.typeCheck(ctx, clazz, trait.analysis, trait.resolution);
                            }
                        }
                    }
                    catch (e_14_1) { e_14 = { error: e_14_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_14) throw e_14.error; }
                    }
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_13) throw e_13.error; }
            }
        };
        TraitCompiler.prototype.extendedTemplateCheck = function (sf, extendedTemplateChecker) {
            var e_15, _a, e_16, _b;
            var classes = this.fileToClasses.get(sf);
            if (classes === undefined) {
                return [];
            }
            var diagnostics = [];
            try {
                for (var classes_3 = tslib_1.__values(classes), classes_3_1 = classes_3.next(); !classes_3_1.done; classes_3_1 = classes_3.next()) {
                    var clazz = classes_3_1.value;
                    if (!reflection_1.isNamedClassDeclaration(clazz)) {
                        continue;
                    }
                    var record = this.classes.get(clazz);
                    try {
                        for (var _c = (e_16 = void 0, tslib_1.__values(record.traits)), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var trait = _d.value;
                            if (trait.handler.extendedTemplateCheck === undefined) {
                                continue;
                            }
                            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(trait.handler.extendedTemplateCheck(clazz, extendedTemplateChecker))));
                        }
                    }
                    catch (e_16_1) { e_16 = { error: e_16_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_16) throw e_16.error; }
                    }
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (classes_3_1 && !classes_3_1.done && (_a = classes_3.return)) _a.call(classes_3);
                }
                finally { if (e_15) throw e_15.error; }
            }
            return diagnostics;
        };
        TraitCompiler.prototype.index = function (ctx) {
            var e_17, _a, e_18, _b;
            try {
                for (var _c = tslib_1.__values(this.classes.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var clazz = _d.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _e = (e_18 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var trait = _f.value;
                            if (trait.state !== trait_1.TraitState.Resolved) {
                                // Skip traits that haven't been resolved successfully.
                                continue;
                            }
                            else if (trait.handler.index === undefined) {
                                // Skip traits that don't affect indexing.
                                continue;
                            }
                            if (trait.resolution !== null) {
                                trait.handler.index(ctx, clazz, trait.analysis, trait.resolution);
                            }
                        }
                    }
                    catch (e_18_1) { e_18 = { error: e_18_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_18) throw e_18.error; }
                    }
                }
            }
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_17) throw e_17.error; }
            }
        };
        TraitCompiler.prototype.xi18n = function (bundle) {
            var e_19, _a, e_20, _b;
            try {
                for (var _c = tslib_1.__values(this.classes.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var clazz = _d.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _e = (e_20 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var trait = _f.value;
                            if (trait.state !== trait_1.TraitState.Analyzed && trait.state !== trait_1.TraitState.Resolved) {
                                // Skip traits that haven't been analyzed successfully.
                                continue;
                            }
                            else if (trait.handler.xi18n === undefined) {
                                // Skip traits that don't support xi18n.
                                continue;
                            }
                            if (trait.analysis !== null) {
                                trait.handler.xi18n(bundle, clazz, trait.analysis);
                            }
                        }
                    }
                    catch (e_20_1) { e_20 = { error: e_20_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_20) throw e_20.error; }
                    }
                }
            }
            catch (e_19_1) { e_19 = { error: e_19_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_19) throw e_19.error; }
            }
        };
        TraitCompiler.prototype.updateResources = function (clazz) {
            var e_21, _a;
            if (!this.reflector.isClass(clazz) || !this.classes.has(clazz)) {
                return;
            }
            var record = this.classes.get(clazz);
            try {
                for (var _b = tslib_1.__values(record.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    if (trait.state !== trait_1.TraitState.Resolved || trait.handler.updateResources === undefined) {
                        continue;
                    }
                    trait.handler.updateResources(clazz, trait.analysis, trait.resolution);
                }
            }
            catch (e_21_1) { e_21 = { error: e_21_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_21) throw e_21.error; }
            }
        };
        TraitCompiler.prototype.compile = function (clazz, constantPool) {
            var e_22, _a;
            var original = ts.getOriginalNode(clazz);
            if (!this.reflector.isClass(clazz) || !this.reflector.isClass(original) ||
                !this.classes.has(original)) {
                return null;
            }
            var record = this.classes.get(original);
            var res = [];
            var _loop_2 = function (trait) {
                var e_23, _d;
                if (trait.state !== trait_1.TraitState.Resolved || trait.analysisDiagnostics !== null ||
                    trait.resolveDiagnostics !== null) {
                    return "continue";
                }
                // `trait.resolution` is non-null asserted here because TypeScript does not recognize that
                // `Readonly<unknown>` is nullable (as `unknown` itself is nullable) due to the way that
                // `Readonly` works.
                var compileRes = void 0;
                if (this_1.compilationMode === api_1.CompilationMode.PARTIAL &&
                    trait.handler.compilePartial !== undefined) {
                    compileRes = trait.handler.compilePartial(clazz, trait.analysis, trait.resolution);
                }
                else {
                    compileRes =
                        trait.handler.compileFull(clazz, trait.analysis, trait.resolution, constantPool);
                }
                var compileMatchRes = compileRes;
                if (Array.isArray(compileMatchRes)) {
                    var _loop_3 = function (result) {
                        if (!res.some(function (r) { return r.name === result.name; })) {
                            res.push(result);
                        }
                    };
                    try {
                        for (var compileMatchRes_1 = (e_23 = void 0, tslib_1.__values(compileMatchRes)), compileMatchRes_1_1 = compileMatchRes_1.next(); !compileMatchRes_1_1.done; compileMatchRes_1_1 = compileMatchRes_1.next()) {
                            var result = compileMatchRes_1_1.value;
                            _loop_3(result);
                        }
                    }
                    catch (e_23_1) { e_23 = { error: e_23_1 }; }
                    finally {
                        try {
                            if (compileMatchRes_1_1 && !compileMatchRes_1_1.done && (_d = compileMatchRes_1.return)) _d.call(compileMatchRes_1);
                        }
                        finally { if (e_23) throw e_23.error; }
                    }
                }
                else if (!res.some(function (result) { return result.name === compileMatchRes.name; })) {
                    res.push(compileMatchRes);
                }
            };
            var this_1 = this;
            try {
                for (var _b = tslib_1.__values(record.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    _loop_2(trait);
                }
            }
            catch (e_22_1) { e_22 = { error: e_22_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_22) throw e_22.error; }
            }
            // Look up the .d.ts transformer for the input file and record that at least one field was
            // generated, which will allow the .d.ts to be transformed later.
            this.dtsTransforms.getIvyDeclarationTransform(original.getSourceFile())
                .addFields(original, res);
            // Return the instruction to the transformer so the fields will be added.
            return res.length > 0 ? res : null;
        };
        TraitCompiler.prototype.decoratorsFor = function (node) {
            var e_24, _a;
            var original = ts.getOriginalNode(node);
            if (!this.reflector.isClass(original) || !this.classes.has(original)) {
                return [];
            }
            var record = this.classes.get(original);
            var decorators = [];
            try {
                for (var _b = tslib_1.__values(record.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    if (trait.state !== trait_1.TraitState.Resolved) {
                        continue;
                    }
                    if (trait.detected.trigger !== null && ts.isDecorator(trait.detected.trigger)) {
                        decorators.push(trait.detected.trigger);
                    }
                }
            }
            catch (e_24_1) { e_24 = { error: e_24_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_24) throw e_24.error; }
            }
            return decorators;
        };
        Object.defineProperty(TraitCompiler.prototype, "diagnostics", {
            get: function () {
                var e_25, _a, e_26, _b;
                var diagnostics = [];
                try {
                    for (var _c = tslib_1.__values(this.classes.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var clazz = _d.value;
                        var record = this.classes.get(clazz);
                        if (record.metaDiagnostics !== null) {
                            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(record.metaDiagnostics)));
                        }
                        try {
                            for (var _e = (e_26 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var trait = _f.value;
                                if ((trait.state === trait_1.TraitState.Analyzed || trait.state === trait_1.TraitState.Resolved) &&
                                    trait.analysisDiagnostics !== null) {
                                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(trait.analysisDiagnostics)));
                                }
                                if (trait.state === trait_1.TraitState.Resolved && trait.resolveDiagnostics !== null) {
                                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(trait.resolveDiagnostics)));
                                }
                            }
                        }
                        catch (e_26_1) { e_26 = { error: e_26_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_26) throw e_26.error; }
                        }
                    }
                }
                catch (e_25_1) { e_25 = { error: e_25_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_25) throw e_25.error; }
                }
                return diagnostics;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TraitCompiler.prototype, "exportStatements", {
            get: function () {
                return this.reexportMap;
            },
            enumerable: false,
            configurable: true
        });
        return TraitCompiler;
    }());
    exports.TraitCompiler = TraitCompiler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBa0U7SUFJbEUsNkRBQW1EO0lBQ25ELHlFQUF1SDtJQUd2SCxrRkFBb0U7SUFHcEUseUVBQXVJO0lBRXZJLDZFQUF3RDtJQXFDeEQ7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBd0JFLHVCQUNZLFFBQTRFLEVBQzVFLFNBQXlCLEVBQVUsSUFBa0IsRUFDckQsZ0JBQXdELEVBQ3hELHlCQUFrQyxFQUFVLGVBQWdDLEVBQzVFLGFBQW1DLEVBQ25DLHVCQUFxRDs7WUFMckQsYUFBUSxHQUFSLFFBQVEsQ0FBb0U7WUFDNUUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQ3JELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0M7WUFDeEQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFTO1lBQVUsb0JBQWUsR0FBZixlQUFlLENBQWlCO1lBQzVFLGtCQUFhLEdBQWIsYUFBYSxDQUFzQjtZQUNuQyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQThCO1lBN0JqRTs7O2VBR0c7WUFDSyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFM0Q7OztlQUdHO1lBQ08sa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQztZQUUxRTs7O2VBR0c7WUFDTyx1QkFBa0IsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUVoRCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1lBRS9ELG1CQUFjLEdBQ2xCLElBQUksR0FBRyxFQUE0RSxDQUFDOztnQkFTdEYsS0FBc0IsSUFB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QU0sQ0FBQyxlQUFlLEtBQUssSUFBSSxFQUFFOzRCQUNuQyxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLDJDQUFTLE1BQU0sQ0FBQyxlQUFlLElBQUU7eUJBQzdDOzs0QkFDRCxLQUFvQixJQUFBLHFCQUFBLGlCQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtnQ0FBOUIsSUFBTSxLQUFLLFdBQUE7Z0NBQ2QsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssa0JBQVUsQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxrQkFBVSxDQUFDLFFBQVEsQ0FBQztvQ0FDNUUsS0FBSyxDQUFDLG1CQUFtQixLQUFLLElBQUksRUFBRTtvQ0FDdEMsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVywyQ0FBUyxLQUFLLENBQUMsbUJBQW1CLElBQUU7aUNBQ2hEO2dDQUNELElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxrQkFBVSxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsa0JBQWtCLEtBQUssSUFBSSxFQUFFO29DQUM1RSxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLDJDQUFTLEtBQUssQ0FBQyxrQkFBa0IsSUFBRTtpQ0FDL0M7NkJBQ0Y7Ozs7Ozs7OztxQkFDRjs7Ozs7Ozs7O2dCQUNELE9BQU8sV0FBVyxDQUFDO1lBQ3JCLENBQUM7OztXQUFBO1FBRUQsc0JBQUksMkNBQWdCO2lCQUFwQjtnQkFDRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDMUIsQ0FBQzs7O1dBQUE7UUFDSCxvQkFBQztJQUFELENBQUMsQUFqbEJELElBaWxCQztJQWpsQlksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7U2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIFNlbWFudGljU3ltYm9sfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaCc7XG5pbXBvcnQge0luZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge1BlcmZFdmVudCwgUGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25Ob2RlLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1Byb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXJ9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9leHRlbmRlZC9hcGknO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlLCBpc0V4cG9ydGVkfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7WGkxOG5Db250ZXh0fSBmcm9tICcuLi8uLi94aTE4bic7XG5cbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGF0aW9uTW9kZSwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNUcmFuc2Zvcm1SZWdpc3RyeX0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5pbXBvcnQge1BlbmRpbmdUcmFpdCwgVHJhaXQsIFRyYWl0U3RhdGV9IGZyb20gJy4vdHJhaXQnO1xuXG5cbi8qKlxuICogUmVjb3JkcyBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIGNsYXNzIHRoYXQgaGFzIG1hdGNoZWQgdHJhaXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzUmVjb3JkIHtcbiAgLyoqXG4gICAqIFRoZSBgQ2xhc3NEZWNsYXJhdGlvbmAgb2YgdGhlIGNsYXNzIHdoaWNoIGhhcyBBbmd1bGFyIHRyYWl0cyBhcHBsaWVkLlxuICAgKi9cbiAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjtcblxuICAvKipcbiAgICogQWxsIHRyYWl0cyB3aGljaCBtYXRjaGVkIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHRyYWl0czogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXTtcblxuICAvKipcbiAgICogTWV0YS1kaWFnbm9zdGljcyBhYm91dCB0aGUgY2xhc3MsIHdoaWNoIGFyZSB1c3VhbGx5IHJlbGF0ZWQgdG8gd2hldGhlciBjZXJ0YWluIGNvbWJpbmF0aW9ucyBvZlxuICAgKiBBbmd1bGFyIGRlY29yYXRvcnMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAqL1xuICBtZXRhRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsO1xuXG4gIC8vIFN1YnNlcXVlbnQgZmllbGRzIGFyZSBcImludGVybmFsXCIgYW5kIHVzZWQgZHVyaW5nIHRoZSBtYXRjaGluZyBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzLiBUaGlzIGlzXG4gIC8vIG11dGFibGUgc3RhdGUgZHVyaW5nIHRoZSBgZGV0ZWN0YC9gYW5hbHl6ZWAgcGhhc2VzIG9mIGNvbXBpbGF0aW9uLlxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIHRyYWl0cyBtYXRjaGVkIGZyb20gYERlY29yYXRvckhhbmRsZXJgcyBtYXJrZWQgYXMgYFdFQUtgLlxuICAgKi9cbiAgaGFzV2Vha0hhbmRsZXJzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIGEgdHJhaXQgZnJvbSBhIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVkIGFzIGBQUklNQVJZYC5cbiAgICovXG4gIGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiBBbmd1bGFyIGNvbXBpbGF0aW9uLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3NpbmcgYWxsIGNsYXNzZXMgaW4gdGhlIHByb2dyYW0uIEFueSB0aW1lIGFcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVzIGEgY2xhc3MsIGEgXCJ0cmFpdFwiIGlzIGNyZWF0ZWQgdG8gcmVwcmVzZW50IHRoYXQgQW5ndWxhciBhc3BlY3Qgb2YgdGhlXG4gKiBjbGFzcyAoc3VjaCBhcyB0aGUgY2xhc3MgaGF2aW5nIGEgY29tcG9uZW50IGRlZmluaXRpb24pLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgdHJhbnNpdGlvbnMgZWFjaCB0cmFpdCB0aHJvdWdoIHRoZSB2YXJpb3VzIHBoYXNlcyBvZiBjb21waWxhdGlvbiwgY3VsbWluYXRpbmdcbiAqIGluIHRoZSBwcm9kdWN0aW9uIG9mIGBDb21waWxlUmVzdWx0YHMgaW5zdHJ1Y3RpbmcgdGhlIGNvbXBpbGVyIHRvIGFwcGx5IHZhcmlvdXMgbXV0YXRpb25zIHRvIHRoZVxuICogY2xhc3MgKGxpa2UgYWRkaW5nIGZpZWxkcyBvciB0eXBlIGRlY2xhcmF0aW9ucykuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFpdENvbXBpbGVyIGltcGxlbWVudHMgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIge1xuICAvKipcbiAgICogTWFwcyBjbGFzcyBkZWNsYXJhdGlvbnMgdG8gdGhlaXIgYENsYXNzUmVjb3JkYCwgd2hpY2ggdHJhY2tzIHRoZSBJdnkgdHJhaXRzIGJlaW5nIGFwcGxpZWQgdG9cbiAgICogdGhvc2UgY2xhc3Nlcy5cbiAgICovXG4gIHByaXZhdGUgY2xhc3NlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NSZWNvcmQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcHMgc291cmNlIGZpbGVzIHRvIGFueSBjbGFzcyBkZWNsYXJhdGlvbihzKSB3aXRoaW4gdGhlbSB3aGljaCBoYXZlIGJlZW4gZGlzY292ZXJlZCB0byBjb250YWluXG4gICAqIEl2eSB0cmFpdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmlsZVRvQ2xhc3NlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgU2V0PENsYXNzRGVjbGFyYXRpb24+PigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hpY2ggc291cmNlIGZpbGVzIGhhdmUgYmVlbiBhbmFseXplZCBidXQgZGlkIG5vdCBjb250YWluIGFueSB0cmFpdHMuIFRoaXMgc2V0IGFsbG93c1xuICAgKiB0aGUgY29tcGlsZXIgdG8gc2tpcCBhbmFseXppbmcgdGhlc2UgZmlsZXMgaW4gYW4gaW5jcmVtZW50YWwgcmVidWlsZC5cbiAgICovXG4gIHByb3RlY3RlZCBmaWxlc1dpdGhvdXRUcmFpdHMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgcHJpdmF0ZSByZWV4cG9ydE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4oKTtcblxuICBwcml2YXRlIGhhbmRsZXJzQnlOYW1lID1cbiAgICAgIG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+PigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgaW5jcmVtZW50YWxCdWlsZDogSW5jcmVtZW50YWxCdWlsZDxDbGFzc1JlY29yZCwgdW5rbm93bj4sXG4gICAgICBwcml2YXRlIGNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXM6IGJvb2xlYW4sIHByaXZhdGUgY29tcGlsYXRpb25Nb2RlOiBDb21waWxhdGlvbk1vZGUsXG4gICAgICBwcml2YXRlIGR0c1RyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjogU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXJ8bnVsbCkge1xuICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBoYW5kbGVycykge1xuICAgICAgdGhpcy5oYW5kbGVyc0J5TmFtZS5zZXQoaGFuZGxlci5uYW1lLCBoYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplU3luYyhzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuYW5hbHl6ZShzZiwgZmFsc2UpO1xuICB9XG5cbiAgYW5hbHl6ZUFzeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmFuYWx5emUoc2YsIHRydWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBmYWxzZSk6IHZvaWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogdHJ1ZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgLy8gV2Ugc2hvdWxkbid0IGFuYWx5emUgZGVjbGFyYXRpb24gZmlsZXMuXG4gICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIGFuYWx5emUoKSByZWFsbHkgd2FudHMgdG8gcmV0dXJuIGBQcm9taXNlPHZvaWQ+fHZvaWRgLCBidXQgVHlwZVNjcmlwdCBjYW5ub3QgbmFycm93IGEgcmV0dXJuXG4gICAgLy8gdHlwZSBvZiAndm9pZCcsIHNvIGB1bmRlZmluZWRgIGlzIHVzZWQgaW5zdGVhZC5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx2b2lkPltdID0gW107XG5cbiAgICBjb25zdCBwcmlvcldvcmsgPSB0aGlzLmluY3JlbWVudGFsQnVpbGQucHJpb3JBbmFseXNpc0ZvcihzZik7XG4gICAgaWYgKHByaW9yV29yayAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5wZXJmLmV2ZW50Q291bnQoUGVyZkV2ZW50LlNvdXJjZUZpbGVSZXVzZUFuYWx5c2lzKTtcblxuICAgICAgaWYgKHByaW9yV29yay5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJpb3JSZWNvcmQgb2YgcHJpb3JXb3JrKSB7XG4gICAgICAgICAgdGhpcy5hZG9wdChwcmlvclJlY29yZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuVHJhaXRSZXVzZUFuYWx5c2lzLCBwcmlvcldvcmsubGVuZ3RoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZmlsZXNXaXRob3V0VHJhaXRzLmFkZChzZik7XG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdGhlIHJlc3Qgb2YgYW5hbHlzaXMsIGFzIHRoaXMgZmlsZSdzIHByaW9yIHRyYWl0cyBhcmUgYmVpbmcgcmV1c2VkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIGlmICh0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG5vZGUpKSB7XG4gICAgICAgIHRoaXMuYW5hbHl6ZUNsYXNzKG5vZGUsIHByZWFuYWx5emUgPyBwcm9taXNlcyA6IG51bGwpO1xuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuXG4gICAgdmlzaXQoc2YpO1xuXG4gICAgaWYgKHByZWFuYWx5emUgJiYgcHJvbWlzZXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpID0+IHVuZGVmaW5lZCBhcyB2b2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZWNvcmRGb3IoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc1JlY29yZHxudWxsIHtcbiAgICBpZiAodGhpcy5jbGFzc2VzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZHNGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCByZWNvcmRzOiBDbGFzc1JlY29yZFtdID0gW107XG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEpIHtcbiAgICAgIHJlY29yZHMucHVzaCh0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSEpO1xuICAgIH1cbiAgICByZXR1cm4gcmVjb3JkcztcbiAgfVxuXG4gIGdldEFuYWx5emVkUmVjb3JkcygpOiBNYXA8dHMuU291cmNlRmlsZSwgQ2xhc3NSZWNvcmRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgQ2xhc3NSZWNvcmRbXT4oKTtcbiAgICBmb3IgKGNvbnN0IFtzZiwgY2xhc3Nlc10gb2YgdGhpcy5maWxlVG9DbGFzc2VzKSB7XG4gICAgICBjb25zdCByZWNvcmRzOiBDbGFzc1JlY29yZFtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIGNsYXNzZXMpIHtcbiAgICAgICAgcmVjb3Jkcy5wdXNoKHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopISk7XG4gICAgICB9XG4gICAgICByZXN1bHQuc2V0KHNmLCByZWNvcmRzKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmZpbGVzV2l0aG91dFRyYWl0cykge1xuICAgICAgcmVzdWx0LnNldChzZiwgW10pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEltcG9ydCBhIGBDbGFzc1JlY29yZGAgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUcmFpdHMgZnJvbSB0aGUgYENsYXNzUmVjb3JkYCBoYXZlIGFjY3VyYXRlIG1ldGFkYXRhLCBidXQgdGhlIGBoYW5kbGVyYCBpcyBmcm9tIHRoZSBvbGQgcHJvZ3JhbVxuICAgKiBhbmQgbmVlZHMgdG8gYmUgdXBkYXRlZCAobWF0Y2hpbmcgaXMgZG9uZSBieSBuYW1lKS4gQSBuZXcgcGVuZGluZyB0cmFpdCBpcyBjcmVhdGVkIGFuZCB0aGVuXG4gICAqIHRyYW5zaXRpb25lZCB0byBhbmFseXplZCB1c2luZyB0aGUgcHJldmlvdXMgYW5hbHlzaXMuIElmIHRoZSB0cmFpdCBpcyBpbiB0aGUgZXJyb3JlZCBzdGF0ZSxcbiAgICogaW5zdGVhZCB0aGUgZXJyb3JzIGFyZSBjb3BpZWQgb3Zlci5cbiAgICovXG4gIHByaXZhdGUgYWRvcHQocHJpb3JSZWNvcmQ6IENsYXNzUmVjb3JkKTogdm9pZCB7XG4gICAgY29uc3QgcmVjb3JkOiBDbGFzc1JlY29yZCA9IHtcbiAgICAgIGhhc1ByaW1hcnlIYW5kbGVyOiBwcmlvclJlY29yZC5oYXNQcmltYXJ5SGFuZGxlcixcbiAgICAgIGhhc1dlYWtIYW5kbGVyczogcHJpb3JSZWNvcmQuaGFzV2Vha0hhbmRsZXJzLFxuICAgICAgbWV0YURpYWdub3N0aWNzOiBwcmlvclJlY29yZC5tZXRhRGlhZ25vc3RpY3MsXG4gICAgICBub2RlOiBwcmlvclJlY29yZC5ub2RlLFxuICAgICAgdHJhaXRzOiBbXSxcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBwcmlvclRyYWl0IG9mIHByaW9yUmVjb3JkLnRyYWl0cykge1xuICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMuaGFuZGxlcnNCeU5hbWUuZ2V0KHByaW9yVHJhaXQuaGFuZGxlci5uYW1lKSE7XG4gICAgICBsZXQgdHJhaXQ6IFRyYWl0PHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+ID1cbiAgICAgICAgICBUcmFpdC5wZW5kaW5nKGhhbmRsZXIsIHByaW9yVHJhaXQuZGV0ZWN0ZWQpO1xuXG4gICAgICBpZiAocHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5BbmFseXplZCB8fCBwcmlvclRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLlJlc29sdmVkKSB7XG4gICAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMubWFrZVN5bWJvbEZvclRyYWl0KGhhbmRsZXIsIHJlY29yZC5ub2RlLCBwcmlvclRyYWl0LmFuYWx5c2lzKTtcbiAgICAgICAgdHJhaXQgPSB0cmFpdC50b0FuYWx5emVkKHByaW9yVHJhaXQuYW5hbHlzaXMsIHByaW9yVHJhaXQuYW5hbHlzaXNEaWFnbm9zdGljcywgc3ltYm9sKTtcbiAgICAgICAgaWYgKHRyYWl0LmFuYWx5c2lzICE9PSBudWxsICYmIHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIocmVjb3JkLm5vZGUsIHRyYWl0LmFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwcmlvclRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLlNraXBwZWQpIHtcbiAgICAgICAgdHJhaXQgPSB0cmFpdC50b1NraXBwZWQoKTtcbiAgICAgIH1cblxuICAgICAgcmVjb3JkLnRyYWl0cy5wdXNoKHRyYWl0KTtcbiAgICB9XG5cbiAgICB0aGlzLmNsYXNzZXMuc2V0KHJlY29yZC5ub2RlLCByZWNvcmQpO1xuICAgIGNvbnN0IHNmID0gcmVjb3JkLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5zZXQoc2YsIG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKSk7XG4gICAgfVxuICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpIS5hZGQocmVjb3JkLm5vZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2FuQ2xhc3NGb3JUcmFpdHMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOlxuICAgICAgUGVuZGluZ1RyYWl0PHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+W118bnVsbCB7XG4gICAgaWYgKCF0aGlzLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgJiYgIXRoaXMucmVmbGVjdG9yLmlzU3RhdGljYWxseUV4cG9ydGVkKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcblxuICAgIHJldHVybiB0aGlzLmRldGVjdFRyYWl0cyhjbGF6eiwgZGVjb3JhdG9ycyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZGV0ZWN0VHJhaXRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTpcbiAgICAgIFBlbmRpbmdUcmFpdDx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdfG51bGwge1xuICAgIGxldCByZWNvcmQ6IENsYXNzUmVjb3JkfG51bGwgPSB0aGlzLnJlY29yZEZvcihjbGF6eik7XG4gICAgbGV0IGZvdW5kVHJhaXRzOiBQZW5kaW5nVHJhaXQ8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIuZGV0ZWN0KGNsYXp6LCBkZWNvcmF0b3JzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNQcmltYXJ5SGFuZGxlciA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGNvbnN0IGlzV2Vha0hhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUs7XG4gICAgICBjb25zdCB0cmFpdCA9IFRyYWl0LnBlbmRpbmcoaGFuZGxlciwgcmVzdWx0KTtcblxuICAgICAgZm91bmRUcmFpdHMucHVzaCh0cmFpdCk7XG5cbiAgICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIHBhdGggaXMgYSBmYXN0IHBhdGggdGhyb3VnaCB3aGljaFxuICAgICAgICAvLyBtb3N0IGNsYXNzZXMgd2lsbCBmbG93LlxuICAgICAgICByZWNvcmQgPSB7XG4gICAgICAgICAgbm9kZTogY2xhenosXG4gICAgICAgICAgdHJhaXRzOiBbdHJhaXRdLFxuICAgICAgICAgIG1ldGFEaWFnbm9zdGljczogbnVsbCxcbiAgICAgICAgICBoYXNQcmltYXJ5SGFuZGxlcjogaXNQcmltYXJ5SGFuZGxlcixcbiAgICAgICAgICBoYXNXZWFrSGFuZGxlcnM6IGlzV2Vha0hhbmRsZXIsXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jbGFzc2VzLnNldChjbGF6eiwgcmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2YgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuc2V0KHNmLCBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpIS5hZGQoY2xhenopO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhdCBsZWFzdCB0aGUgc2Vjb25kIGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBpcyBhIHNsb3dlciBwYXRoIHRoYXQgc29tZVxuICAgICAgICAvLyBjbGFzc2VzIHdpbGwgZ28gdGhyb3VnaCwgd2hpY2ggdmFsaWRhdGVzIHRoYXQgdGhlIHNldCBvZiBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlIGNsYXNzXG4gICAgICAgIC8vIGlzIHZhbGlkLlxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGFjY29yZGluZyB0byBydWxlcyBhcyBmb2xsb3dzOlxuICAgICAgICAvL1xuICAgICAgICAvLyAqIFdFQUsgaGFuZGxlcnMgYXJlIHJlbW92ZWQgaWYgYSBub24tV0VBSyBoYW5kbGVyIG1hdGNoZXMuXG4gICAgICAgIC8vICogT25seSBvbmUgUFJJTUFSWSBoYW5kbGVyIGNhbiBtYXRjaCBhdCBhIHRpbWUuIEFueSBvdGhlciBQUklNQVJZIGhhbmRsZXIgbWF0Y2hpbmcgYVxuICAgICAgICAvLyAgIGNsYXNzIHdpdGggYW4gZXhpc3RpbmcgUFJJTUFSWSBoYW5kbGVyIGlzIGFuIGVycm9yLlxuXG4gICAgICAgIGlmICghaXNXZWFrSGFuZGxlciAmJiByZWNvcmQuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBub3QgYSBXRUFLIGhhbmRsZXIsIGJ1dCB0aGUgY2xhc3MgaGFzIG90aGVyIFdFQUsgaGFuZGxlcnMuXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZW0uXG4gICAgICAgICAgcmVjb3JkLnRyYWl0cyA9XG4gICAgICAgICAgICAgIHJlY29yZC50cmFpdHMuZmlsdGVyKGZpZWxkID0+IGZpZWxkLmhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSyk7XG4gICAgICAgICAgcmVjb3JkLmhhc1dlYWtIYW5kbGVycyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzV2Vha0hhbmRsZXIgJiYgIXJlY29yZC5oYXNXZWFrSGFuZGxlcnMpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBoYW5kbGVyIGlzIGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBub24tV0VBSyBoYW5kbGVycyBhbHJlYWR5LlxuICAgICAgICAgIC8vIERyb3AgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzUHJpbWFyeUhhbmRsZXIgJiYgcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyKSB7XG4gICAgICAgICAgLy8gVGhlIGNsYXNzIGFscmVhZHkgaGFzIGEgUFJJTUFSWSBoYW5kbGVyLCBhbmQgYW5vdGhlciBvbmUganVzdCBtYXRjaGVkLlxuICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgPSBbe1xuICAgICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICAgIGNvZGU6IE51bWJlcignLTk5JyArIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OKSxcbiAgICAgICAgICAgIGZpbGU6IGdldFNvdXJjZUZpbGUoY2xhenopLFxuICAgICAgICAgICAgc3RhcnQ6IGNsYXp6LmdldFN0YXJ0KHVuZGVmaW5lZCwgZmFsc2UpLFxuICAgICAgICAgICAgbGVuZ3RoOiBjbGF6ei5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWVzc2FnZVRleHQ6ICdUd28gaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gY2xhc3MnLFxuICAgICAgICAgIH1dO1xuICAgICAgICAgIHJlY29yZC50cmFpdHMgPSBmb3VuZFRyYWl0cyA9IFtdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpdCdzIHNhZmUgdG8gYWNjZXB0IHRoZSBtdWx0aXBsZSBkZWNvcmF0b3JzIGhlcmUuIFVwZGF0ZSBzb21lIG9mIHRoZSBtZXRhZGF0YVxuICAgICAgICAvLyByZWdhcmRpbmcgdGhpcyBjbGFzcy5cbiAgICAgICAgcmVjb3JkLnRyYWl0cy5wdXNoKHRyYWl0KTtcbiAgICAgICAgcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyID0gcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyIHx8IGlzUHJpbWFyeUhhbmRsZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvdW5kVHJhaXRzLmxlbmd0aCA+IDAgPyBmb3VuZFRyYWl0cyA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIG1ha2VTeW1ib2xGb3JUcmFpdChcbiAgICAgIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj4sXG4gICAgICBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8dW5rbm93bj58bnVsbCk6IFNlbWFudGljU3ltYm9sfG51bGwge1xuICAgIGlmIChhbmFseXNpcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IGhhbmRsZXIuc3ltYm9sKGRlY2wsIGFuYWx5c2lzKTtcbiAgICBpZiAoc3ltYm9sICE9PSBudWxsICYmIHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGlzUHJpbWFyeSA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGlmICghaXNQcmltYXJ5KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBBc3NlcnRpb25FcnJvcjogJHtoYW5kbGVyLm5hbWV9IHJldHVybmVkIGEgc3ltYm9sIGJ1dCBpcyBub3QgYSBwcmltYXJ5IGhhbmRsZXIuYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLnJlZ2lzdGVyU3ltYm9sKHN5bWJvbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHByZWFuYWx5emVRdWV1ZTogUHJvbWlzZTx2b2lkPltdfG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCB0cmFpdHMgPSB0aGlzLnNjYW5DbGFzc0ZvclRyYWl0cyhjbGF6eik7XG5cbiAgICBpZiAodHJhaXRzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBhcmUgbm8gSXZ5IHRyYWl0cyBvbiB0aGUgY2xhc3MsIHNvIGl0IGNhbiBzYWZlbHkgYmUgc2tpcHBlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHRyYWl0cykge1xuICAgICAgY29uc3QgYW5hbHl6ZSA9ICgpID0+IHRoaXMuYW5hbHl6ZVRyYWl0KGNsYXp6LCB0cmFpdCk7XG5cbiAgICAgIGxldCBwcmVhbmFseXNpczogUHJvbWlzZTx2b2lkPnxudWxsID0gbnVsbDtcbiAgICAgIGlmIChwcmVhbmFseXplUXVldWUgIT09IG51bGwgJiYgdHJhaXQuaGFuZGxlci5wcmVhbmFseXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQXR0ZW1wdCB0byBydW4gcHJlYW5hbHlzaXMuIFRoaXMgY291bGQgZmFpbCB3aXRoIGEgYEZhdGFsRGlhZ25vc3RpY0Vycm9yYDsgY2F0Y2ggaXQgaWYgaXRcbiAgICAgICAgLy8gZG9lcy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwcmVhbmFseXNpcyA9IHRyYWl0LmhhbmRsZXIucHJlYW5hbHl6ZShjbGF6eiwgdHJhaXQuZGV0ZWN0ZWQubWV0YWRhdGEpIHx8IG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgdHJhaXQudG9BbmFseXplZChudWxsLCBbZXJyLnRvRGlhZ25vc3RpYygpXSwgbnVsbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChwcmVhbmFseXNpcyAhPT0gbnVsbCkge1xuICAgICAgICBwcmVhbmFseXplUXVldWUhLnB1c2gocHJlYW5hbHlzaXMudGhlbihhbmFseXplKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbmFseXplKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVUcmFpdChcbiAgICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCB0cmFpdDogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj4sXG4gICAgICBmbGFncz86IEhhbmRsZXJGbGFncyk6IHZvaWQge1xuICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5QZW5kaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gYW5hbHl6ZSB0cmFpdCBvZiAke2NsYXp6Lm5hbWUudGV4dH0gaW4gc3RhdGUgJHtcbiAgICAgICAgICBUcmFpdFN0YXRlW3RyYWl0LnN0YXRlXX0gKGV4cGVjdGVkIERFVEVDVEVEKWApO1xuICAgIH1cblxuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5UcmFpdEFuYWx5emUpO1xuXG4gICAgLy8gQXR0ZW1wdCBhbmFseXNpcy4gVGhpcyBjb3VsZCBmYWlsIHdpdGggYSBgRmF0YWxEaWFnbm9zdGljRXJyb3JgOyBjYXRjaCBpdCBpZiBpdCBkb2VzLlxuICAgIGxldCByZXN1bHQ6IEFuYWx5c2lzT3V0cHV0PHVua25vd24+O1xuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSB0cmFpdC5oYW5kbGVyLmFuYWx5emUoY2xhenosIHRyYWl0LmRldGVjdGVkLm1ldGFkYXRhLCBmbGFncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgdHJhaXQudG9BbmFseXplZChudWxsLCBbZXJyLnRvRGlhZ25vc3RpYygpXSwgbnVsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLm1ha2VTeW1ib2xGb3JUcmFpdCh0cmFpdC5oYW5kbGVyLCBjbGF6eiwgcmVzdWx0LmFuYWx5c2lzID8/IG51bGwpO1xuICAgIGlmIChyZXN1bHQuYW5hbHlzaXMgIT09IHVuZGVmaW5lZCAmJiB0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIoY2xhenosIHJlc3VsdC5hbmFseXNpcyk7XG4gICAgfVxuICAgIHRyYWl0ID0gdHJhaXQudG9BbmFseXplZChyZXN1bHQuYW5hbHlzaXMgPz8gbnVsbCwgcmVzdWx0LmRpYWdub3N0aWNzID8/IG51bGwsIHN5bWJvbCk7XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5mcm9tKHRoaXMuY2xhc3Nlcy5rZXlzKCkpO1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgY2xhc3Nlcykge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChsZXQgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBjb25zdCBoYW5kbGVyID0gdHJhaXQuaGFuZGxlcjtcbiAgICAgICAgc3dpdGNoICh0cmFpdC5zdGF0ZSkge1xuICAgICAgICAgIGNhc2UgVHJhaXRTdGF0ZS5Ta2lwcGVkOlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlBlbmRpbmc6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlc29sdmluZyBhIHRyYWl0IHRoYXQgaGFzbid0IGJlZW4gYW5hbHl6ZWQ6ICR7Y2xhenoubmFtZS50ZXh0fSAvICR7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKHRyYWl0LmhhbmRsZXIpLmNvbnN0cnVjdG9yLm5hbWV9YCk7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlJlc29sdmVkOlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZXNvbHZpbmcgYW4gYWxyZWFkeSByZXNvbHZlZCB0cmFpdGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyYWl0LmFuYWx5c2lzID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gTm8gYW5hbHlzaXMgcmVzdWx0cywgY2Fubm90IGZ1cnRoZXIgcHJvY2VzcyB0aGlzIHRyYWl0LlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXIucmVzb2x2ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTm8gcmVzb2x1dGlvbiBvZiB0aGlzIHRyYWl0IG5lZWRlZCAtIGl0J3MgY29uc2lkZXJlZCBzdWNjZXNzZnVsIGJ5IGRlZmF1bHQuXG4gICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKG51bGwsIG51bGwpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3VsdDogUmVzb2x2ZVJlc3VsdDx1bmtub3duPjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXN1bHQgPSBoYW5kbGVyLnJlc29sdmUoY2xhenosIHRyYWl0LmFuYWx5c2lzIGFzIFJlYWRvbmx5PHVua25vd24+LCB0cmFpdC5zeW1ib2wpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9SZXNvbHZlZChudWxsLCBbZXJyLnRvRGlhZ25vc3RpYygpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9SZXNvbHZlZChyZXN1bHQuZGF0YSA/PyBudWxsLCByZXN1bHQuZGlhZ25vc3RpY3MgPz8gbnVsbCk7XG5cbiAgICAgICAgaWYgKHJlc3VsdC5yZWV4cG9ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gY2xhenouZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgICAgIGlmICghdGhpcy5yZWV4cG9ydE1hcC5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlZXhwb3J0TWFwLnNldChmaWxlTmFtZSwgbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmaWxlUmVleHBvcnRzID0gdGhpcy5yZWV4cG9ydE1hcC5nZXQoZmlsZU5hbWUpITtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlZXhwb3J0IG9mIHJlc3VsdC5yZWV4cG9ydHMpIHtcbiAgICAgICAgICAgIGZpbGVSZWV4cG9ydHMuc2V0KHJlZXhwb3J0LmFzQWxpYXMsIFtyZWV4cG9ydC5mcm9tTW9kdWxlLCByZWV4cG9ydC5zeW1ib2xOYW1lXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBpbnRvIHRoZSBgVHlwZUNoZWNrQ29udGV4dGAgZm9yIGFueSBjb21wb25lbnRzIHdpdGhpbiB0aGUgZ2l2ZW5cbiAgICogYHRzLlNvdXJjZUZpbGVgLlxuICAgKi9cbiAgdHlwZUNoZWNrKHNmOiB0cy5Tb3VyY2VGaWxlLCBjdHg6IFR5cGVDaGVja0NvbnRleHQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZmlsZVRvQ2xhc3Nlcy5oYXMoc2YpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopITtcbiAgICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFpdC5oYW5kbGVyLnR5cGVDaGVjayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyYWl0LnJlc29sdXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLnR5cGVDaGVjayhjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBleHRlbmRlZFRlbXBsYXRlQ2hlY2soc2Y6IHRzLlNvdXJjZUZpbGUsIGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyOiBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlcik6XG4gICAgICB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGNsYXNzZXMgPSB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKTtcbiAgICBpZiAoY2xhc3NlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgY2xhc3Nlcykge1xuICAgICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgICAgaWYgKHRyYWl0LmhhbmRsZXIuZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRyYWl0LmhhbmRsZXIuZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrKGNsYXp6LCBleHRlbmRlZFRlbXBsYXRlQ2hlY2tlcikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBpbmRleChjdHg6IEluZGV4aW5nQ29udGV4dCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5jbGFzc2VzLmtleXMoKSkge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCkge1xuICAgICAgICAgIC8vIFNraXAgdHJhaXRzIHRoYXQgaGF2ZW4ndCBiZWVuIHJlc29sdmVkIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFpdC5oYW5kbGVyLmluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBTa2lwIHRyYWl0cyB0aGF0IGRvbid0IGFmZmVjdCBpbmRleGluZy5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cmFpdC5yZXNvbHV0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgdHJhaXQuaGFuZGxlci5pbmRleChjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB4aTE4bihidW5kbGU6IFhpMThuQ29udGV4dCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5jbGFzc2VzLmtleXMoKSkge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5BbmFseXplZCAmJiB0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCkge1xuICAgICAgICAgIC8vIFNraXAgdHJhaXRzIHRoYXQgaGF2ZW4ndCBiZWVuIGFuYWx5emVkIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFpdC5oYW5kbGVyLnhpMThuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBTa2lwIHRyYWl0cyB0aGF0IGRvbid0IHN1cHBvcnQgeGkxOG4uXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHJhaXQuYW5hbHlzaXMgIT09IG51bGwpIHtcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLnhpMThuKGJ1bmRsZSwgY2xhenosIHRyYWl0LmFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlc291cmNlcyhjbGF6ejogRGVjbGFyYXRpb25Ob2RlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKGNsYXp6KSB8fCAhdGhpcy5jbGFzc2VzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgaWYgKHRyYWl0LnN0YXRlICE9PSBUcmFpdFN0YXRlLlJlc29sdmVkIHx8IHRyYWl0LmhhbmRsZXIudXBkYXRlUmVzb3VyY2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHRyYWl0LmhhbmRsZXIudXBkYXRlUmVzb3VyY2VzKGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgfVxuICB9XG5cbiAgY29tcGlsZShjbGF6ejogRGVjbGFyYXRpb25Ob2RlLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXXxudWxsIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShjbGF6eikgYXMgdHlwZW9mIGNsYXp6O1xuICAgIGlmICghdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhjbGF6eikgfHwgIXRoaXMucmVmbGVjdG9yLmlzQ2xhc3Mob3JpZ2luYWwpIHx8XG4gICAgICAgICF0aGlzLmNsYXNzZXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChvcmlnaW5hbCkhO1xuXG4gICAgbGV0IHJlczogQ29tcGlsZVJlc3VsdFtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCB8fCB0cmFpdC5hbmFseXNpc0RpYWdub3N0aWNzICE9PSBudWxsIHx8XG4gICAgICAgICAgdHJhaXQucmVzb2x2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgIC8vIENhbm5vdCBjb21waWxlIGEgdHJhaXQgdGhhdCBpcyBub3QgcmVzb2x2ZWQsIG9yIGhhZCBhbnkgZXJyb3JzIGluIGl0cyBkZWNsYXJhdGlvbi5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGB0cmFpdC5yZXNvbHV0aW9uYCBpcyBub24tbnVsbCBhc3NlcnRlZCBoZXJlIGJlY2F1c2UgVHlwZVNjcmlwdCBkb2VzIG5vdCByZWNvZ25pemUgdGhhdFxuICAgICAgLy8gYFJlYWRvbmx5PHVua25vd24+YCBpcyBudWxsYWJsZSAoYXMgYHVua25vd25gIGl0c2VsZiBpcyBudWxsYWJsZSkgZHVlIHRvIHRoZSB3YXkgdGhhdFxuICAgICAgLy8gYFJlYWRvbmx5YCB3b3Jrcy5cblxuICAgICAgbGV0IGNvbXBpbGVSZXM6IENvbXBpbGVSZXN1bHR8Q29tcGlsZVJlc3VsdFtdO1xuICAgICAgaWYgKHRoaXMuY29tcGlsYXRpb25Nb2RlID09PSBDb21waWxhdGlvbk1vZGUuUEFSVElBTCAmJlxuICAgICAgICAgIHRyYWl0LmhhbmRsZXIuY29tcGlsZVBhcnRpYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb21waWxlUmVzID0gdHJhaXQuaGFuZGxlci5jb21waWxlUGFydGlhbChjbGF6eiwgdHJhaXQuYW5hbHlzaXMsIHRyYWl0LnJlc29sdXRpb24hKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGVSZXMgPVxuICAgICAgICAgICAgdHJhaXQuaGFuZGxlci5jb21waWxlRnVsbChjbGF6eiwgdHJhaXQuYW5hbHlzaXMsIHRyYWl0LnJlc29sdXRpb24hLCBjb25zdGFudFBvb2wpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb21waWxlTWF0Y2hSZXMgPSBjb21waWxlUmVzO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY29tcGlsZU1hdGNoUmVzKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBjb21waWxlTWF0Y2hSZXMpIHtcbiAgICAgICAgICBpZiAoIXJlcy5zb21lKHIgPT4gci5uYW1lID09PSByZXN1bHQubmFtZSkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFyZXMuc29tZShyZXN1bHQgPT4gcmVzdWx0Lm5hbWUgPT09IGNvbXBpbGVNYXRjaFJlcy5uYW1lKSkge1xuICAgICAgICByZXMucHVzaChjb21waWxlTWF0Y2hSZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYXQgbGVhc3Qgb25lIGZpZWxkIHdhc1xuICAgIC8vIGdlbmVyYXRlZCwgd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgdGhpcy5kdHNUcmFuc2Zvcm1zLmdldEl2eURlY2xhcmF0aW9uVHJhbnNmb3JtKG9yaWdpbmFsLmdldFNvdXJjZUZpbGUoKSlcbiAgICAgICAgLmFkZEZpZWxkcyhvcmlnaW5hbCwgcmVzKTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5zdHJ1Y3Rpb24gdG8gdGhlIHRyYW5zZm9ybWVyIHNvIHRoZSBmaWVsZHMgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzLmxlbmd0aCA+IDAgPyByZXMgOiBudWxsO1xuICB9XG5cbiAgZGVjb3JhdG9yc0Zvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY29yYXRvcltdIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0eXBlb2Ygbm9kZTtcbiAgICBpZiAoIXRoaXMucmVmbGVjdG9yLmlzQ2xhc3Mob3JpZ2luYWwpIHx8ICF0aGlzLmNsYXNzZXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQob3JpZ2luYWwpITtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiB0cy5EZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0cmFpdC5kZXRlY3RlZC50cmlnZ2VyICE9PSBudWxsICYmIHRzLmlzRGVjb3JhdG9yKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIpKSB7XG4gICAgICAgIGRlY29yYXRvcnMucHVzaCh0cmFpdC5kZXRlY3RlZC50cmlnZ2VyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmNsYXNzZXMua2V5cygpKSB7XG4gICAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgICBpZiAocmVjb3JkLm1ldGFEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnJlY29yZC5tZXRhRGlhZ25vc3RpY3MpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICgodHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuQW5hbHl6ZWQgfHwgdHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQpICYmXG4gICAgICAgICAgICB0cmFpdC5hbmFseXNpc0RpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50cmFpdC5hbmFseXNpc0RpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQgJiYgdHJhaXQucmVzb2x2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50cmFpdC5yZXNvbHZlRGlhZ25vc3RpY3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldCBleHBvcnRTdGF0ZW1lbnRzKCk6IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+PiB7XG4gICAgcmV0dXJuIHRoaXMucmVleHBvcnRNYXA7XG4gIH1cbn1cbiJdfQ==