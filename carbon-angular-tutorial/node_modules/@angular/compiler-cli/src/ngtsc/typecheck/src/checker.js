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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/completion", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateTypeCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var program_driver_1 = require("@angular/compiler-cli/src/ngtsc/program_driver");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var completion_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/completion");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    var diagnostics_3 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var shim_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/shim");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var tcb_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util");
    var template_symbol_builder_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder");
    var REGISTRY = new compiler_1.DomElementSchemaRegistry();
    /**
     * Primary template type-checking engine, which performs type-checking using a
     * `TypeCheckingProgramStrategy` for type-checking program maintenance, and the
     * `ProgramTypeCheckAdapter` for generation of template type-checking code.
     */
    var TemplateTypeCheckerImpl = /** @class */ (function () {
        function TemplateTypeCheckerImpl(originalProgram, programDriver, typeCheckAdapter, config, refEmitter, reflector, compilerHost, priorBuild, componentScopeReader, typeCheckScopeRegistry, perf) {
            this.originalProgram = originalProgram;
            this.programDriver = programDriver;
            this.typeCheckAdapter = typeCheckAdapter;
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.compilerHost = compilerHost;
            this.priorBuild = priorBuild;
            this.componentScopeReader = componentScopeReader;
            this.typeCheckScopeRegistry = typeCheckScopeRegistry;
            this.perf = perf;
            this.state = new Map();
            /**
             * Stores the `CompletionEngine` which powers autocompletion for each component class.
             *
             * Must be invalidated whenever the component's template or the `ts.Program` changes. Invalidation
             * on template changes is performed within this `TemplateTypeCheckerImpl` instance. When the
             * `ts.Program` changes, the `TemplateTypeCheckerImpl` as a whole is destroyed and replaced.
             */
            this.completionCache = new Map();
            /**
             * Stores the `SymbolBuilder` which creates symbols for each component class.
             *
             * Must be invalidated whenever the component's template or the `ts.Program` changes. Invalidation
             * on template changes is performed within this `TemplateTypeCheckerImpl` instance. When the
             * `ts.Program` changes, the `TemplateTypeCheckerImpl` as a whole is destroyed and replaced.
             */
            this.symbolBuilderCache = new Map();
            /**
             * Stores directives and pipes that are in scope for each component.
             *
             * Unlike other caches, the scope of a component is not affected by its template. It will be
             * destroyed when the `ts.Program` changes and the `TemplateTypeCheckerImpl` as a whole is
             * destroyed and replaced.
             */
            this.scopeCache = new Map();
            /**
             * Stores potential element tags for each component (a union of DOM tags as well as directive
             * tags).
             *
             * Unlike other caches, the scope of a component is not affected by its template. It will be
             * destroyed when the `ts.Program` changes and the `TemplateTypeCheckerImpl` as a whole is
             * destroyed and replaced.
             */
            this.elementTagCache = new Map();
            this.isComplete = false;
        }
        TemplateTypeCheckerImpl.prototype.getTemplate = function (component) {
            var data = this.getLatestComponentState(component).data;
            if (data === null) {
                return null;
            }
            return data.template;
        };
        TemplateTypeCheckerImpl.prototype.getLatestComponentState = function (component) {
            this.ensureShimForComponent(component);
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return { data: null, tcb: null, shimPath: shimPath };
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            var program = this.programDriver.getProgram();
            var shimSf = typescript_1.getSourceFileOrNull(program, shimPath);
            if (shimSf === null || !fileRecord.shimData.has(shimPath)) {
                throw new Error("Error: no shim file in program: " + shimPath);
            }
            var tcb = tcb_util_1.findTypeCheckBlock(shimSf, id, /*isDiagnosticsRequest*/ false);
            if (tcb === null) {
                // Try for an inline block.
                var inlineSf = file_system_1.getSourceFileOrError(program, sfPath);
                tcb = tcb_util_1.findTypeCheckBlock(inlineSf, id, /*isDiagnosticsRequest*/ false);
            }
            var data = null;
            if (shimRecord.templates.has(templateId)) {
                data = shimRecord.templates.get(templateId);
            }
            return { data: data, tcb: tcb, shimPath: shimPath };
        };
        TemplateTypeCheckerImpl.prototype.isTrackedTypeCheckFile = function (filePath) {
            return this.getFileAndShimRecordsForPath(filePath) !== null;
        };
        TemplateTypeCheckerImpl.prototype.getFileAndShimRecordsForPath = function (shimPath) {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.state.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var fileRecord = _c.value;
                    if (fileRecord.shimData.has(shimPath)) {
                        return { fileRecord: fileRecord, shimRecord: fileRecord.shimData.get(shimPath) };
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        TemplateTypeCheckerImpl.prototype.getTemplateMappingAtShimLocation = function (_a) {
            var shimPath = _a.shimPath, positionInShimFile = _a.positionInShimFile;
            var records = this.getFileAndShimRecordsForPath(file_system_1.absoluteFrom(shimPath));
            if (records === null) {
                return null;
            }
            var fileRecord = records.fileRecord;
            var shimSf = this.programDriver.getProgram().getSourceFile(file_system_1.absoluteFrom(shimPath));
            if (shimSf === undefined) {
                return null;
            }
            return tcb_util_1.getTemplateMapping(shimSf, positionInShimFile, fileRecord.sourceManager, /*isDiagnosticsRequest*/ false);
        };
        TemplateTypeCheckerImpl.prototype.generateAllTypeCheckBlocks = function () {
            this.ensureAllShimsForAllFiles();
        };
        /**
         * Retrieve type-checking and template parse diagnostics from the given `ts.SourceFile` using the
         * most recent type-checking program.
         */
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForFile = function (sf, optimizeFor) {
            var _this = this;
            switch (optimizeFor) {
                case api_1.OptimizeFor.WholeProgram:
                    this.ensureAllShimsForAllFiles();
                    break;
                case api_1.OptimizeFor.SingleFile:
                    this.ensureAllShimsForOneFile(sf);
                    break;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcDiagnostics, function () {
                var e_2, _a, e_3, _b;
                var sfPath = file_system_1.absoluteFromSourceFile(sf);
                var fileRecord = _this.state.get(sfPath);
                var typeCheckProgram = _this.programDriver.getProgram();
                var diagnostics = [];
                if (fileRecord.hasInlines) {
                    var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                }
                try {
                    for (var _c = tslib_1.__values(fileRecord.shimData), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var _e = tslib_1.__read(_d.value, 2), shimPath = _e[0], shimRecord = _e[1];
                        var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
                        diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                        diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(shimRecord.genesisDiagnostics)));
                        try {
                            for (var _f = (e_3 = void 0, tslib_1.__values(shimRecord.templates.values())), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var templateData = _g.value;
                                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(templateData.templateDiagnostics)));
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                return diagnostics.filter(function (diag) { return diag !== null; });
            });
        };
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForComponent = function (component) {
            var _this = this;
            this.ensureShimForComponent(component);
            return this.perf.inPhase(perf_1.PerfPhase.TtcDiagnostics, function () {
                var e_4, _a;
                var sf = component.getSourceFile();
                var sfPath = file_system_1.absoluteFromSourceFile(sf);
                var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
                var fileRecord = _this.getFileData(sfPath);
                if (!fileRecord.shimData.has(shimPath)) {
                    return [];
                }
                var templateId = fileRecord.sourceManager.getTemplateId(component);
                var shimRecord = fileRecord.shimData.get(shimPath);
                var typeCheckProgram = _this.programDriver.getProgram();
                var diagnostics = [];
                if (shimRecord.hasInlines) {
                    var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                }
                var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(shimRecord.genesisDiagnostics)));
                try {
                    for (var _b = tslib_1.__values(shimRecord.templates.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var templateData = _c.value;
                        diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(templateData.templateDiagnostics)));
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                return diagnostics.filter(function (diag) {
                    return diag !== null && diag.templateId === templateId;
                });
            });
        };
        TemplateTypeCheckerImpl.prototype.getTypeCheckBlock = function (component) {
            return this.getLatestComponentState(component).tcb;
        };
        TemplateTypeCheckerImpl.prototype.getGlobalCompletions = function (context, component, node) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcAutocompletion, function () { return engine.getGlobalCompletions(context, node); });
        };
        TemplateTypeCheckerImpl.prototype.getExpressionCompletionLocation = function (ast, component) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcAutocompletion, function () { return engine.getExpressionCompletionLocation(ast); });
        };
        TemplateTypeCheckerImpl.prototype.getLiteralCompletionLocation = function (node, component) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcAutocompletion, function () { return engine.getLiteralCompletionLocation(node); });
        };
        TemplateTypeCheckerImpl.prototype.invalidateClass = function (clazz) {
            this.completionCache.delete(clazz);
            this.symbolBuilderCache.delete(clazz);
            this.scopeCache.delete(clazz);
            this.elementTagCache.delete(clazz);
            var sf = clazz.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileData = this.getFileData(sfPath);
            var templateId = fileData.sourceManager.getTemplateId(clazz);
            fileData.shimData.delete(shimPath);
            fileData.isComplete = false;
            this.isComplete = false;
        };
        TemplateTypeCheckerImpl.prototype.makeTemplateDiagnostic = function (clazz, sourceSpan, category, errorCode, message, relatedInformation) {
            var sfPath = file_system_1.absoluteFromSourceFile(clazz.getSourceFile());
            var fileRecord = this.state.get(sfPath);
            var templateId = fileRecord.sourceManager.getTemplateId(clazz);
            var mapping = fileRecord.sourceManager.getSourceMapping(templateId);
            return tslib_1.__assign(tslib_1.__assign({}, diagnostics_2.makeTemplateDiagnostic(templateId, mapping, sourceSpan, category, diagnostics_1.ngErrorCode(errorCode), message, relatedInformation)), { __ngCode: errorCode });
        };
        TemplateTypeCheckerImpl.prototype.getOrCreateCompletionEngine = function (component) {
            if (this.completionCache.has(component)) {
                return this.completionCache.get(component);
            }
            var _a = this.getLatestComponentState(component), tcb = _a.tcb, data = _a.data, shimPath = _a.shimPath;
            if (tcb === null || data === null) {
                return null;
            }
            var engine = new completion_1.CompletionEngine(tcb, data, shimPath);
            this.completionCache.set(component, engine);
            return engine;
        };
        TemplateTypeCheckerImpl.prototype.maybeAdoptPriorResultsForFile = function (sf) {
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            if (this.state.has(sfPath)) {
                var existingResults = this.state.get(sfPath);
                if (existingResults.isComplete) {
                    // All data for this file has already been generated, so no need to adopt anything.
                    return;
                }
            }
            var previousResults = this.priorBuild.priorTypeCheckingResultsFor(sf);
            if (previousResults === null || !previousResults.isComplete) {
                return;
            }
            this.perf.eventCount(perf_1.PerfEvent.ReuseTypeCheckFile);
            this.state.set(sfPath, previousResults);
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForAllFiles = function () {
            var _this = this;
            if (this.isComplete) {
                return;
            }
            this.perf.inPhase(perf_1.PerfPhase.TcbGeneration, function () {
                var e_5, _a;
                var host = new WholeProgramTypeCheckingHost(_this);
                var ctx = _this.newContext(host);
                try {
                    for (var _b = tslib_1.__values(_this.originalProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (sf.isDeclarationFile || shims_1.isShim(sf)) {
                            continue;
                        }
                        _this.maybeAdoptPriorResultsForFile(sf);
                        var sfPath = file_system_1.absoluteFromSourceFile(sf);
                        var fileData = _this.getFileData(sfPath);
                        if (fileData.isComplete) {
                            continue;
                        }
                        _this.typeCheckAdapter.typeCheck(sf, ctx);
                        fileData.isComplete = true;
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                _this.updateFromContext(ctx);
                _this.isComplete = true;
            });
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForOneFile = function (sf) {
            var _this = this;
            this.perf.inPhase(perf_1.PerfPhase.TcbGeneration, function () {
                _this.maybeAdoptPriorResultsForFile(sf);
                var sfPath = file_system_1.absoluteFromSourceFile(sf);
                var fileData = _this.getFileData(sfPath);
                if (fileData.isComplete) {
                    // All data for this file is present and accounted for already.
                    return;
                }
                var host = new SingleFileTypeCheckingHost(sfPath, fileData, _this);
                var ctx = _this.newContext(host);
                _this.typeCheckAdapter.typeCheck(sf, ctx);
                fileData.isComplete = true;
                _this.updateFromContext(ctx);
            });
        };
        TemplateTypeCheckerImpl.prototype.ensureShimForComponent = function (component) {
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            this.maybeAdoptPriorResultsForFile(sf);
            var fileData = this.getFileData(sfPath);
            if (fileData.shimData.has(shimPath)) {
                // All data for this component is available.
                return;
            }
            var host = new SingleShimTypeCheckingHost(sfPath, fileData, this, shimPath);
            var ctx = this.newContext(host);
            this.typeCheckAdapter.typeCheck(sf, ctx);
            this.updateFromContext(ctx);
        };
        TemplateTypeCheckerImpl.prototype.newContext = function (host) {
            var inlining = this.programDriver.supportsInlineOperations ? context_1.InliningMode.InlineOps : context_1.InliningMode.Error;
            return new context_1.TypeCheckContextImpl(this.config, this.compilerHost, this.refEmitter, this.reflector, host, inlining, this.perf);
        };
        /**
         * Remove any shim data that depends on inline operations applied to the type-checking program.
         *
         * This can be useful if new inlines need to be applied, and it's not possible to guarantee that
         * they won't overwrite or corrupt existing inlines that are used by such shims.
         */
        TemplateTypeCheckerImpl.prototype.clearAllShimDataUsingInlines = function () {
            var e_6, _a, e_7, _b;
            try {
                for (var _c = tslib_1.__values(this.state.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var fileData = _d.value;
                    if (!fileData.hasInlines) {
                        continue;
                    }
                    try {
                        for (var _e = (e_7 = void 0, tslib_1.__values(fileData.shimData.entries())), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = tslib_1.__read(_f.value, 2), shimFile = _g[0], shimData = _g[1];
                            if (shimData.hasInlines) {
                                fileData.shimData.delete(shimFile);
                            }
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    fileData.hasInlines = false;
                    fileData.isComplete = false;
                    this.isComplete = false;
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_6) throw e_6.error; }
            }
        };
        TemplateTypeCheckerImpl.prototype.updateFromContext = function (ctx) {
            var _this = this;
            var updates = ctx.finalize();
            return this.perf.inPhase(perf_1.PerfPhase.TcbUpdateProgram, function () {
                if (updates.size > 0) {
                    _this.perf.eventCount(perf_1.PerfEvent.UpdateTypeCheckProgram);
                }
                _this.programDriver.updateFiles(updates, program_driver_1.UpdateMode.Incremental);
                _this.priorBuild.recordSuccessfulTypeCheck(_this.state);
                _this.perf.memory(perf_1.PerfCheckpoint.TtcUpdateProgram);
            });
        };
        TemplateTypeCheckerImpl.prototype.getFileData = function (path) {
            if (!this.state.has(path)) {
                this.state.set(path, {
                    hasInlines: false,
                    sourceManager: new source_1.TemplateSourceManager(),
                    isComplete: false,
                    shimData: new Map(),
                });
            }
            return this.state.get(path);
        };
        TemplateTypeCheckerImpl.prototype.getSymbolOfNode = function (node, component) {
            var builder = this.getOrCreateSymbolBuilder(component);
            if (builder === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcSymbol, function () { return builder.getSymbol(node); });
        };
        TemplateTypeCheckerImpl.prototype.getOrCreateSymbolBuilder = function (component) {
            var _this = this;
            if (this.symbolBuilderCache.has(component)) {
                return this.symbolBuilderCache.get(component);
            }
            var _a = this.getLatestComponentState(component), tcb = _a.tcb, data = _a.data, shimPath = _a.shimPath;
            if (tcb === null || data === null) {
                return null;
            }
            var builder = new template_symbol_builder_1.SymbolBuilder(shimPath, tcb, data, this.componentScopeReader, function () { return _this.programDriver.getProgram().getTypeChecker(); });
            this.symbolBuilderCache.set(component, builder);
            return builder;
        };
        TemplateTypeCheckerImpl.prototype.getDirectivesInScope = function (component) {
            var data = this.getScopeData(component);
            if (data === null) {
                return null;
            }
            return data.directives;
        };
        TemplateTypeCheckerImpl.prototype.getPipesInScope = function (component) {
            var data = this.getScopeData(component);
            if (data === null) {
                return null;
            }
            return data.pipes;
        };
        TemplateTypeCheckerImpl.prototype.getDirectiveMetadata = function (dir) {
            if (!reflection_1.isNamedClassDeclaration(dir)) {
                return null;
            }
            return this.typeCheckScopeRegistry.getTypeCheckDirectiveMetadata(new imports_1.Reference(dir));
        };
        TemplateTypeCheckerImpl.prototype.getPotentialElementTags = function (component) {
            var e_8, _a, e_9, _b, e_10, _c;
            if (this.elementTagCache.has(component)) {
                return this.elementTagCache.get(component);
            }
            var tagMap = new Map();
            try {
                for (var _d = tslib_1.__values(REGISTRY.allKnownElementNames()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var tag = _e.value;
                    tagMap.set(tag, null);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_8) throw e_8.error; }
            }
            var scope = this.getScopeData(component);
            if (scope !== null) {
                try {
                    for (var _f = tslib_1.__values(scope.directives), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var directive = _g.value;
                        try {
                            for (var _h = (e_10 = void 0, tslib_1.__values(compiler_1.CssSelector.parse(directive.selector))), _j = _h.next(); !_j.done; _j = _h.next()) {
                                var selector = _j.value;
                                if (selector.element === null || tagMap.has(selector.element)) {
                                    // Skip this directive if it doesn't match an element tag, or if another directive has
                                    // already been included with the same element name.
                                    continue;
                                }
                                tagMap.set(selector.element, directive);
                            }
                        }
                        catch (e_10_1) { e_10 = { error: e_10_1 }; }
                        finally {
                            try {
                                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                            }
                            finally { if (e_10) throw e_10.error; }
                        }
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
            }
            this.elementTagCache.set(component, tagMap);
            return tagMap;
        };
        TemplateTypeCheckerImpl.prototype.getPotentialDomBindings = function (tagName) {
            var attributes = REGISTRY.allKnownAttributesOfElement(tagName);
            return attributes.map(function (attribute) { return ({
                attribute: attribute,
                property: REGISTRY.getMappedPropName(attribute),
            }); });
        };
        TemplateTypeCheckerImpl.prototype.getScopeData = function (component) {
            var e_11, _a, e_12, _b;
            if (this.scopeCache.has(component)) {
                return this.scopeCache.get(component);
            }
            if (!reflection_1.isNamedClassDeclaration(component)) {
                throw new Error("AssertionError: components must have names");
            }
            var scope = this.componentScopeReader.getScopeForComponent(component);
            if (scope === null) {
                return null;
            }
            var data = {
                directives: [],
                pipes: [],
                isPoisoned: scope.compilation.isPoisoned,
            };
            var typeChecker = this.programDriver.getProgram().getTypeChecker();
            try {
                for (var _c = tslib_1.__values(scope.compilation.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var dir = _d.value;
                    if (dir.selector === null) {
                        // Skip this directive, it can't be added to a template anyway.
                        continue;
                    }
                    var tsSymbol = typeChecker.getSymbolAtLocation(dir.ref.node.name);
                    if (!typescript_1.isSymbolWithValueDeclaration(tsSymbol)) {
                        continue;
                    }
                    var ngModule = null;
                    var moduleScopeOfDir = this.componentScopeReader.getScopeForComponent(dir.ref.node);
                    if (moduleScopeOfDir !== null) {
                        ngModule = moduleScopeOfDir.ngModule;
                    }
                    data.directives.push({
                        isComponent: dir.isComponent,
                        isStructural: dir.isStructural,
                        selector: dir.selector,
                        tsSymbol: tsSymbol,
                        ngModule: ngModule,
                    });
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_11) throw e_11.error; }
            }
            try {
                for (var _e = tslib_1.__values(scope.compilation.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var pipe = _f.value;
                    var tsSymbol = typeChecker.getSymbolAtLocation(pipe.ref.node.name);
                    if (tsSymbol === undefined) {
                        continue;
                    }
                    data.pipes.push({
                        name: pipe.name,
                        tsSymbol: tsSymbol,
                    });
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_12) throw e_12.error; }
            }
            this.scopeCache.set(component, data);
            return data;
        };
        return TemplateTypeCheckerImpl;
    }());
    exports.TemplateTypeCheckerImpl = TemplateTypeCheckerImpl;
    function convertDiagnostic(diag, sourceResolver) {
        if (!diagnostics_3.shouldReportDiagnostic(diag)) {
            return null;
        }
        return diagnostics_3.translateDiagnostic(diag, sourceResolver);
    }
    /**
     * Drives a `TypeCheckContext` to generate type-checking code for every component in the program.
     */
    var WholeProgramTypeCheckingHost = /** @class */ (function () {
        function WholeProgramTypeCheckingHost(impl) {
            this.impl = impl;
        }
        WholeProgramTypeCheckingHost.prototype.getSourceManager = function (sfPath) {
            return this.impl.getFileData(sfPath).sourceManager;
        };
        WholeProgramTypeCheckingHost.prototype.shouldCheckComponent = function (node) {
            var sfPath = file_system_1.absoluteFromSourceFile(node.getSourceFile());
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileData = this.impl.getFileData(sfPath);
            // The component needs to be checked unless the shim which would contain it already exists.
            return !fileData.shimData.has(shimPath);
        };
        WholeProgramTypeCheckingHost.prototype.recordShimData = function (sfPath, data) {
            var fileData = this.impl.getFileData(sfPath);
            fileData.shimData.set(data.path, data);
            if (data.hasInlines) {
                fileData.hasInlines = true;
            }
        };
        WholeProgramTypeCheckingHost.prototype.recordComplete = function (sfPath) {
            this.impl.getFileData(sfPath).isComplete = true;
        };
        return WholeProgramTypeCheckingHost;
    }());
    /**
     * Drives a `TypeCheckContext` to generate type-checking code efficiently for a single input file.
     */
    var SingleFileTypeCheckingHost = /** @class */ (function () {
        function SingleFileTypeCheckingHost(sfPath, fileData, impl) {
            this.sfPath = sfPath;
            this.fileData = fileData;
            this.impl = impl;
            this.seenInlines = false;
        }
        SingleFileTypeCheckingHost.prototype.assertPath = function (sfPath) {
            if (this.sfPath !== sfPath) {
                throw new Error("AssertionError: querying TypeCheckingHost outside of assigned file");
            }
        };
        SingleFileTypeCheckingHost.prototype.getSourceManager = function (sfPath) {
            this.assertPath(sfPath);
            return this.fileData.sourceManager;
        };
        SingleFileTypeCheckingHost.prototype.shouldCheckComponent = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(this.sfPath);
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        SingleFileTypeCheckingHost.prototype.recordShimData = function (sfPath, data) {
            this.assertPath(sfPath);
            // Previous type-checking state may have required the use of inlines (assuming they were
            // supported). If the current operation also requires inlines, this presents a problem:
            // generating new inlines may invalidate any old inlines that old state depends on.
            //
            // Rather than resolve this issue by tracking specific dependencies on inlines, if the new state
            // relies on inlines, any old state that relied on them is simply cleared. This happens when the
            // first new state that uses inlines is encountered.
            if (data.hasInlines && !this.seenInlines) {
                this.impl.clearAllShimDataUsingInlines();
                this.seenInlines = true;
            }
            this.fileData.shimData.set(data.path, data);
            if (data.hasInlines) {
                this.fileData.hasInlines = true;
            }
        };
        SingleFileTypeCheckingHost.prototype.recordComplete = function (sfPath) {
            this.assertPath(sfPath);
            this.fileData.isComplete = true;
        };
        return SingleFileTypeCheckingHost;
    }());
    /**
     * Drives a `TypeCheckContext` to generate type-checking code efficiently for only those components
     * which map to a single shim of a single input file.
     */
    var SingleShimTypeCheckingHost = /** @class */ (function (_super) {
        tslib_1.__extends(SingleShimTypeCheckingHost, _super);
        function SingleShimTypeCheckingHost(sfPath, fileData, impl, shimPath) {
            var _this = _super.call(this, sfPath, fileData, impl) || this;
            _this.shimPath = shimPath;
            return _this;
        }
        SingleShimTypeCheckingHost.prototype.shouldCheckNode = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            // Only generate a TCB for the component if it maps to the requested shim file.
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(this.sfPath);
            if (shimPath !== this.shimPath) {
                return false;
            }
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        return SingleShimTypeCheckingHost;
    }(SingleFileTypeCheckingHost));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBd1I7SUFHeFIsMkVBQXlEO0lBRXpELDJFQUE2RztJQUM3RyxtRUFBMEQ7SUFFMUQsNkRBQThFO0lBQzlFLGlGQUErRDtJQUMvRCx5RUFBMkY7SUFFM0YsK0RBQW1DO0lBQ25DLGtGQUE0RjtJQUM1RixxRUFBa1Q7SUFDbFQscUZBQXNEO0lBRXRELHVGQUE4QztJQUM5QyxpRkFBbUg7SUFDbkgseUZBQTBFO0lBQzFFLDJFQUE4QztJQUM5QywrRUFBK0M7SUFDL0MsbUZBQTBGO0lBQzFGLGlIQUF3RDtJQUd4RCxJQUFNLFFBQVEsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7SUFDaEQ7Ozs7T0FJRztJQUNIO1FBeUNFLGlDQUNZLGVBQTJCLEVBQVcsYUFBNEIsRUFDbEUsZ0JBQXlDLEVBQVUsTUFBMEIsRUFDN0UsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxZQUEyRCxFQUMzRCxVQUEyRCxFQUNsRCxvQkFBMEMsRUFDMUMsc0JBQThDLEVBQzlDLElBQWtCO1lBUDNCLG9CQUFlLEdBQWYsZUFBZSxDQUFZO1lBQVcsa0JBQWEsR0FBYixhQUFhLENBQWU7WUFDbEUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF5QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzdFLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsaUJBQVksR0FBWixZQUFZLENBQStDO1lBQzNELGVBQVUsR0FBVixVQUFVLENBQWlEO1lBQ2xELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7WUFDMUMsMkJBQXNCLEdBQXRC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c0IsRUFBRSxRQUE4QixFQUFFLElBQTZCLEVBQzdFLFFBQXdCO1lBRnBDLFlBR0Usa0JBQU0sTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FDOUI7WUFGVyxjQUFRLEdBQVIsUUFBUSxDQUFnQjs7UUFFcEMsQ0FBQztRQUVELG9EQUFlLEdBQWYsVUFBZ0IsSUFBeUI7WUFDdkMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLG9DQUFzQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFO2dCQUNoRSxPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsK0VBQStFO1lBQy9FLElBQU0sUUFBUSxHQUFHLDZCQUFzQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0QsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDOUIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELGdGQUFnRjtZQUNoRixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFDSCxpQ0FBQztJQUFELENBQUMsQUFyQkQsQ0FBeUMsMEJBQTBCLEdBcUJsRSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQ3NzU2VsZWN0b3IsIERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgTGl0ZXJhbFByaW1pdGl2ZSwgTWV0aG9kQ2FsbCwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VTcGFuLCBwYXJzZVRlbXBsYXRlLCBQcm9wZXJ0eVJlYWQsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1RleHRBdHRyaWJ1dGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGgsIGdldFNvdXJjZUZpbGVPckVycm9yfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1JlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGR9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge1BlcmZDaGVja3BvaW50LCBQZXJmRXZlbnQsIFBlcmZQaGFzZSwgUGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7UHJvZ3JhbURyaXZlciwgVXBkYXRlTW9kZX0gZnJvbSAnLi4vLi4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgVHlwZUNoZWNrU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtpc1NoaW19IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZU9yTnVsbCwgaXNTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0RpcmVjdGl2ZUluU2NvcGUsIEVsZW1lbnRTeW1ib2wsIEZ1bGxUZW1wbGF0ZU1hcHBpbmcsIEdsb2JhbENvbXBsZXRpb24sIE5nVGVtcGxhdGVEaWFnbm9zdGljLCBPcHRpbWl6ZUZvciwgUGlwZUluU2NvcGUsIFByb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgVGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZUlkLCBUZW1wbGF0ZVN5bWJvbCwgVGVtcGxhdGVUeXBlQ2hlY2tlciwgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja2luZ0NvbmZpZ30gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7bWFrZVRlbXBsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi4vZGlhZ25vc3RpY3MnO1xuXG5pbXBvcnQge0NvbXBsZXRpb25FbmdpbmV9IGZyb20gJy4vY29tcGxldGlvbic7XG5pbXBvcnQge0lubGluaW5nTW9kZSwgU2hpbVR5cGVDaGVja2luZ0RhdGEsIFRlbXBsYXRlRGF0YSwgVHlwZUNoZWNrQ29udGV4dEltcGwsIFR5cGVDaGVja2luZ0hvc3R9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge3Nob3VsZFJlcG9ydERpYWdub3N0aWMsIHRyYW5zbGF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtUeXBlQ2hlY2tTaGltR2VuZXJhdG9yfSBmcm9tICcuL3NoaW0nO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hbmFnZXJ9IGZyb20gJy4vc291cmNlJztcbmltcG9ydCB7ZmluZFR5cGVDaGVja0Jsb2NrLCBnZXRUZW1wbGF0ZU1hcHBpbmcsIFRlbXBsYXRlU291cmNlUmVzb2x2ZXJ9IGZyb20gJy4vdGNiX3V0aWwnO1xuaW1wb3J0IHtTeW1ib2xCdWlsZGVyfSBmcm9tICcuL3RlbXBsYXRlX3N5bWJvbF9idWlsZGVyJztcblxuXG5jb25zdCBSRUdJU1RSWSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbi8qKlxuICogUHJpbWFyeSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGVuZ2luZSwgd2hpY2ggcGVyZm9ybXMgdHlwZS1jaGVja2luZyB1c2luZyBhXG4gKiBgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5YCBmb3IgdHlwZS1jaGVja2luZyBwcm9ncmFtIG1haW50ZW5hbmNlLCBhbmQgdGhlXG4gKiBgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXJgIGZvciBnZW5lcmF0aW9uIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsIGltcGxlbWVudHMgVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gIHByaXZhdGUgc3RhdGUgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4oKTtcblxuICAvKipcbiAgICogU3RvcmVzIHRoZSBgQ29tcGxldGlvbkVuZ2luZWAgd2hpY2ggcG93ZXJzIGF1dG9jb21wbGV0aW9uIGZvciBlYWNoIGNvbXBvbmVudCBjbGFzcy5cbiAgICpcbiAgICogTXVzdCBiZSBpbnZhbGlkYXRlZCB3aGVuZXZlciB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgb3IgdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLiBJbnZhbGlkYXRpb25cbiAgICogb24gdGVtcGxhdGUgY2hhbmdlcyBpcyBwZXJmb3JtZWQgd2l0aGluIHRoaXMgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBpbnN0YW5jZS4gV2hlbiB0aGVcbiAgICogYHRzLlByb2dyYW1gIGNoYW5nZXMsIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXMgZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgY29tcGxldGlvbkNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBDb21wbGV0aW9uRW5naW5lPigpO1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBgU3ltYm9sQnVpbGRlcmAgd2hpY2ggY3JlYXRlcyBzeW1ib2xzIGZvciBlYWNoIGNvbXBvbmVudCBjbGFzcy5cbiAgICpcbiAgICogTXVzdCBiZSBpbnZhbGlkYXRlZCB3aGVuZXZlciB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgb3IgdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLiBJbnZhbGlkYXRpb25cbiAgICogb24gdGVtcGxhdGUgY2hhbmdlcyBpcyBwZXJmb3JtZWQgd2l0aGluIHRoaXMgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBpbnN0YW5jZS4gV2hlbiB0aGVcbiAgICogYHRzLlByb2dyYW1gIGNoYW5nZXMsIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXMgZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgc3ltYm9sQnVpbGRlckNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBTeW1ib2xCdWlsZGVyPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIGVhY2ggY29tcG9uZW50LlxuICAgKlxuICAgKiBVbmxpa2Ugb3RoZXIgY2FjaGVzLCB0aGUgc2NvcGUgb2YgYSBjb21wb25lbnQgaXMgbm90IGFmZmVjdGVkIGJ5IGl0cyB0ZW1wbGF0ZS4gSXQgd2lsbCBiZVxuICAgKiBkZXN0cm95ZWQgd2hlbiB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMgYW5kIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXNcbiAgICogZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgc2NvcGVDYWNoZSA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgU2NvcGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgcG90ZW50aWFsIGVsZW1lbnQgdGFncyBmb3IgZWFjaCBjb21wb25lbnQgKGEgdW5pb24gb2YgRE9NIHRhZ3MgYXMgd2VsbCBhcyBkaXJlY3RpdmVcbiAgICogdGFncykuXG4gICAqXG4gICAqIFVubGlrZSBvdGhlciBjYWNoZXMsIHRoZSBzY29wZSBvZiBhIGNvbXBvbmVudCBpcyBub3QgYWZmZWN0ZWQgYnkgaXRzIHRlbXBsYXRlLiBJdCB3aWxsIGJlXG4gICAqIGRlc3Ryb3llZCB3aGVuIHRoZSBgdHMuUHJvZ3JhbWAgY2hhbmdlcyBhbmQgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpc1xuICAgKiBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBlbGVtZW50VGFnQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIE1hcDxzdHJpbmcsIERpcmVjdGl2ZUluU2NvcGV8bnVsbD4+KCk7XG5cbiAgcHJpdmF0ZSBpc0NvbXBsZXRlID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSwgcmVhZG9ubHkgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcixcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrQWRhcHRlcjogUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIsIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldENhbm9uaWNhbEZpbGVOYW1lJz4sXG4gICAgICBwcml2YXRlIHByaW9yQnVpbGQ6IEluY3JlbWVudGFsQnVpbGQ8dW5rbm93biwgRmlsZVR5cGVDaGVja2luZ0RhdGE+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnRTY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICBnZXRUZW1wbGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIGNvbnN0IHtkYXRhfSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnRlbXBsYXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAge2RhdGE6IFRlbXBsYXRlRGF0YXxudWxsLCB0Y2I6IHRzLk5vZGV8bnVsbCwgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRofSB7XG4gICAgdGhpcy5lbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcblxuICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG5cbiAgICBpZiAoIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgcmV0dXJuIHtkYXRhOiBudWxsLCB0Y2I6IG51bGwsIHNoaW1QYXRofTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcbiAgICBjb25zdCBzaGltUmVjb3JkID0gZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcbiAgICBjb25zdCBpZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JOdWxsKHByb2dyYW0sIHNoaW1QYXRoKTtcblxuICAgIGlmIChzaGltU2YgPT09IG51bGwgfHwgIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogbm8gc2hpbSBmaWxlIGluIHByb2dyYW06ICR7c2hpbVBhdGh9YCk7XG4gICAgfVxuXG4gICAgbGV0IHRjYjogdHMuTm9kZXxudWxsID0gZmluZFR5cGVDaGVja0Jsb2NrKHNoaW1TZiwgaWQsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG5cbiAgICBpZiAodGNiID09PSBudWxsKSB7XG4gICAgICAvLyBUcnkgZm9yIGFuIGlubGluZSBibG9jay5cbiAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IocHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgIHRjYiA9IGZpbmRUeXBlQ2hlY2tCbG9jayhpbmxpbmVTZiwgaWQsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IGRhdGE6IFRlbXBsYXRlRGF0YXxudWxsID0gbnVsbDtcbiAgICBpZiAoc2hpbVJlY29yZC50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICBkYXRhID0gc2hpbVJlY29yZC50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlSWQpITtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RhdGEsIHRjYiwgc2hpbVBhdGh9O1xuICB9XG5cbiAgaXNUcmFja2VkVHlwZUNoZWNrRmlsZShmaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRGaWxlQW5kU2hpbVJlY29yZHNGb3JQYXRoKGZpbGVQYXRoKSAhPT0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RmlsZUFuZFNoaW1SZWNvcmRzRm9yUGF0aChzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAge2ZpbGVSZWNvcmQ6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBzaGltUmVjb3JkOiBTaGltVHlwZUNoZWNraW5nRGF0YX18bnVsbCB7XG4gICAgZm9yIChjb25zdCBmaWxlUmVjb3JkIG9mIHRoaXMuc3RhdGUudmFsdWVzKCkpIHtcbiAgICAgIGlmIChmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHtmaWxlUmVjb3JkLCBzaGltUmVjb3JkOiBmaWxlUmVjb3JkLnNoaW1EYXRhLmdldChzaGltUGF0aCkhfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbih7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX06IFNoaW1Mb2NhdGlvbik6XG4gICAgICBGdWxsVGVtcGxhdGVNYXBwaW5nfG51bGwge1xuICAgIGNvbnN0IHJlY29yZHMgPSB0aGlzLmdldEZpbGVBbmRTaGltUmVjb3Jkc0ZvclBhdGgoYWJzb2x1dGVGcm9tKHNoaW1QYXRoKSk7XG4gICAgaWYgKHJlY29yZHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7ZmlsZVJlY29yZH0gPSByZWNvcmRzO1xuXG4gICAgY29uc3Qgc2hpbVNmID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShzaGltUGF0aCkpO1xuICAgIGlmIChzaGltU2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBnZXRUZW1wbGF0ZU1hcHBpbmcoXG4gICAgICAgIHNoaW1TZiwgcG9zaXRpb25JblNoaW1GaWxlLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG4gIH1cblxuICBnZW5lcmF0ZUFsbFR5cGVDaGVja0Jsb2NrcygpIHtcbiAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0eXBlLWNoZWNraW5nIGFuZCB0ZW1wbGF0ZSBwYXJzZSBkaWFnbm9zdGljcyBmcm9tIHRoZSBnaXZlbiBgdHMuU291cmNlRmlsZWAgdXNpbmcgdGhlXG4gICAqIG1vc3QgcmVjZW50IHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBzd2l0Y2ggKG9wdGltaXplRm9yKSB7XG4gICAgICBjYXNlIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbTpcbiAgICAgICAgdGhpcy5lbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBPcHRpbWl6ZUZvci5TaW5nbGVGaWxlOlxuICAgICAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZik7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVHRjRGlhZ25vc3RpY3MsICgpID0+IHtcbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuXG4gICAgICBjb25zdCB0eXBlQ2hlY2tQcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcblxuICAgICAgY29uc3QgZGlhZ25vc3RpY3M6ICh0cy5EaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICAgIGlmIChmaWxlUmVjb3JkLmhhc0lubGluZXMpIHtcbiAgICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzZlBhdGgpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3NoaW1QYXRoLCBzaGltUmVjb3JkXSBvZiBmaWxlUmVjb3JkLnNoaW1EYXRhKSB7XG4gICAgICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNoaW1QYXRoKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2hpbVNmKS5tYXAoXG4gICAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zaGltUmVjb3JkLmdlbmVzaXNEaWFnbm9zdGljcyk7XG5cbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZURhdGEgb2Ygc2hpbVJlY29yZC50ZW1wbGF0ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRlbXBsYXRlRGF0YS50ZW1wbGF0ZURpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKChkaWFnOiB0cy5EaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIHRzLkRpYWdub3N0aWMgPT4gZGlhZyAhPT0gbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICBnZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHRoaXMuZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UdGNEaWFnbm9zdGljcywgKCkgPT4ge1xuICAgICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihzZlBhdGgpO1xuXG4gICAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgICBpZiAoIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjb21wb25lbnQpO1xuICAgICAgY29uc3Qgc2hpbVJlY29yZCA9IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG5cbiAgICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuXG4gICAgICBjb25zdCBkaWFnbm9zdGljczogKFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsKVtdID0gW107XG4gICAgICBpZiAoc2hpbVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3MoaW5saW5lU2YpLm1hcChcbiAgICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzaGltUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2hpbVJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuXG4gICAgICBmb3IgKGNvbnN0IHRlbXBsYXRlRGF0YSBvZiBzaGltUmVjb3JkLnRlbXBsYXRlcy52YWx1ZXMoKSkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRlbXBsYXRlRGF0YS50ZW1wbGF0ZURpYWdub3N0aWNzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcihcbiAgICAgICAgICAoZGlhZzogVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIFRlbXBsYXRlRGlhZ25vc3RpYyA9PlxuICAgICAgICAgICAgICBkaWFnICE9PSBudWxsICYmIGRpYWcudGVtcGxhdGVJZCA9PT0gdGVtcGxhdGVJZCk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRUeXBlQ2hlY2tCbG9jayhjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5Ob2RlfG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCkudGNiO1xuICB9XG5cbiAgZ2V0R2xvYmFsQ29tcGxldGlvbnMoXG4gICAgICBjb250ZXh0OiBUbXBsQXN0VGVtcGxhdGV8bnVsbCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgbm9kZTogQVNUfFRtcGxBc3ROb2RlKTogR2xvYmFsQ29tcGxldGlvbnxudWxsIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQpO1xuICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UdGNBdXRvY29tcGxldGlvbiwgKCkgPT4gZW5naW5lLmdldEdsb2JhbENvbXBsZXRpb25zKGNvbnRleHQsIG5vZGUpKTtcbiAgfVxuXG4gIGdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICBhc3Q6IFByb3BlcnR5UmVhZHxTYWZlUHJvcGVydHlSZWFkfE1ldGhvZENhbGx8U2FmZU1ldGhvZENhbGwsXG4gICAgICBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTaGltTG9jYXRpb258bnVsbCB7XG4gICAgY29uc3QgZW5naW5lID0gdGhpcy5nZXRPckNyZWF0ZUNvbXBsZXRpb25FbmdpbmUoY29tcG9uZW50KTtcbiAgICBpZiAoZW5naW5lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHRjQXV0b2NvbXBsZXRpb24sICgpID0+IGVuZ2luZS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKGFzdCkpO1xuICB9XG5cbiAgZ2V0TGl0ZXJhbENvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgIG5vZGU6IExpdGVyYWxQcmltaXRpdmV8VGV4dEF0dHJpYnV0ZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU2hpbUxvY2F0aW9ufG51bGwge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudCk7XG4gICAgaWYgKGVuZ2luZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShcbiAgICAgICAgUGVyZlBoYXNlLlR0Y0F1dG9jb21wbGV0aW9uLCAoKSA9PiBlbmdpbmUuZ2V0TGl0ZXJhbENvbXBsZXRpb25Mb2NhdGlvbihub2RlKSk7XG4gIH1cblxuICBpbnZhbGlkYXRlQ2xhc3MoY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLmNvbXBsZXRpb25DYWNoZS5kZWxldGUoY2xhenopO1xuICAgIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmRlbGV0ZShjbGF6eik7XG4gICAgdGhpcy5zY29wZUNhY2hlLmRlbGV0ZShjbGF6eik7XG4gICAgdGhpcy5lbGVtZW50VGFnQ2FjaGUuZGVsZXRlKGNsYXp6KTtcblxuICAgIGNvbnN0IHNmID0gY2xhenouZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCk7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjbGF6eik7XG5cbiAgICBmaWxlRGF0YS5zaGltRGF0YS5kZWxldGUoc2hpbVBhdGgpO1xuICAgIGZpbGVEYXRhLmlzQ29tcGxldGUgPSBmYWxzZTtcblxuICAgIHRoaXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICB9XG5cbiAgbWFrZVRlbXBsYXRlRGlhZ25vc3RpYzxUIGV4dGVuZHMgRXJyb3JDb2RlPihcbiAgICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnksXG4gICAgICBlcnJvckNvZGU6IFQsIG1lc3NhZ2U6IHN0cmluZywgcmVsYXRlZEluZm9ybWF0aW9uPzoge1xuICAgICAgICB0ZXh0OiBzdHJpbmcsXG4gICAgICAgIHN0YXJ0OiBudW1iZXIsXG4gICAgICAgIGVuZDogbnVtYmVyLFxuICAgICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgfVtdKTogTmdUZW1wbGF0ZURpYWdub3N0aWM8VD4ge1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY2xhenouZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5zdGF0ZS5nZXQoc2ZQYXRoKSE7XG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNsYXp6KTtcbiAgICBjb25zdCBtYXBwaW5nID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4ubWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgICB0ZW1wbGF0ZUlkLCBtYXBwaW5nLCBzb3VyY2VTcGFuLCBjYXRlZ29yeSwgbmdFcnJvckNvZGUoZXJyb3JDb2RlKSwgbWVzc2FnZSxcbiAgICAgICAgICByZWxhdGVkSW5mb3JtYXRpb24pLFxuICAgICAgX19uZ0NvZGU6IGVycm9yQ29kZVxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBDb21wbGV0aW9uRW5naW5lfG51bGwge1xuICAgIGlmICh0aGlzLmNvbXBsZXRpb25DYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcGxldGlvbkNhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBjb25zdCB7dGNiLCBkYXRhLCBzaGltUGF0aH0gPSB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKHRjYiA9PT0gbnVsbCB8fCBkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBlbmdpbmUgPSBuZXcgQ29tcGxldGlvbkVuZ2luZSh0Y2IsIGRhdGEsIHNoaW1QYXRoKTtcbiAgICB0aGlzLmNvbXBsZXRpb25DYWNoZS5zZXQoY29tcG9uZW50LCBlbmdpbmUpO1xuICAgIHJldHVybiBlbmdpbmU7XG4gIH1cblxuICBwcml2YXRlIG1heWJlQWRvcHRQcmlvclJlc3VsdHNGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgaWYgKHRoaXMuc3RhdGUuaGFzKHNmUGF0aCkpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nUmVzdWx0cyA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuXG4gICAgICBpZiAoZXhpc3RpbmdSZXN1bHRzLmlzQ29tcGxldGUpIHtcbiAgICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBoYXMgYWxyZWFkeSBiZWVuIGdlbmVyYXRlZCwgc28gbm8gbmVlZCB0byBhZG9wdCBhbnl0aGluZy5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHByZXZpb3VzUmVzdWx0cyA9IHRoaXMucHJpb3JCdWlsZC5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3Ioc2YpO1xuICAgIGlmIChwcmV2aW91c1Jlc3VsdHMgPT09IG51bGwgfHwgIXByZXZpb3VzUmVzdWx0cy5pc0NvbXBsZXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZXJmLmV2ZW50Q291bnQoUGVyZkV2ZW50LlJldXNlVHlwZUNoZWNrRmlsZSk7XG4gICAgdGhpcy5zdGF0ZS5zZXQoc2ZQYXRoLCBwcmV2aW91c1Jlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzQ29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVGNiR2VuZXJhdGlvbiwgKCkgPT4ge1xuICAgICAgY29uc3QgaG9zdCA9IG5ldyBXaG9sZVByb2dyYW1UeXBlQ2hlY2tpbmdIb3N0KHRoaXMpO1xuICAgICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMub3JpZ2luYWxQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IGlzU2hpbShzZikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICAgICAgaWYgKGZpbGVEYXRhLmlzQ29tcGxldGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG5cbiAgICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudXBkYXRlRnJvbUNvbnRleHQoY3R4KTtcbiAgICAgIHRoaXMuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UY2JHZW5lcmF0aW9uLCAoKSA9PiB7XG4gICAgICB0aGlzLm1heWJlQWRvcHRQcmlvclJlc3VsdHNGb3JGaWxlKHNmKTtcblxuICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgICAgaWYgKGZpbGVEYXRhLmlzQ29tcGxldGUpIHtcbiAgICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBpcyBwcmVzZW50IGFuZCBhY2NvdW50ZWQgZm9yIGFscmVhZHkuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaG9zdCA9IG5ldyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdChzZlBhdGgsIGZpbGVEYXRhLCB0aGlzKTtcbiAgICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcblxuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG5cbiAgICAgIHRoaXMudXBkYXRlRnJvbUNvbnRleHQoY3R4KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcblxuICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG5cbiAgICBpZiAoZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgY29tcG9uZW50IGlzIGF2YWlsYWJsZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IFNpbmdsZVNoaW1UeXBlQ2hlY2tpbmdIb3N0KHNmUGF0aCwgZmlsZURhdGEsIHRoaXMsIHNoaW1QYXRoKTtcbiAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuICAgIHRoaXMudXBkYXRlRnJvbUNvbnRleHQoY3R4KTtcbiAgfVxuXG4gIHByaXZhdGUgbmV3Q29udGV4dChob3N0OiBUeXBlQ2hlY2tpbmdIb3N0KTogVHlwZUNoZWNrQ29udGV4dEltcGwge1xuICAgIGNvbnN0IGlubGluaW5nID1cbiAgICAgICAgdGhpcy5wcm9ncmFtRHJpdmVyLnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucyA/IElubGluaW5nTW9kZS5JbmxpbmVPcHMgOiBJbmxpbmluZ01vZGUuRXJyb3I7XG4gICAgcmV0dXJuIG5ldyBUeXBlQ2hlY2tDb250ZXh0SW1wbChcbiAgICAgICAgdGhpcy5jb25maWcsIHRoaXMuY29tcGlsZXJIb3N0LCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCBob3N0LCBpbmxpbmluZywgdGhpcy5wZXJmKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW55IHNoaW0gZGF0YSB0aGF0IGRlcGVuZHMgb24gaW5saW5lIG9wZXJhdGlvbnMgYXBwbGllZCB0byB0aGUgdHlwZS1jaGVja2luZyBwcm9ncmFtLlxuICAgKlxuICAgKiBUaGlzIGNhbiBiZSB1c2VmdWwgaWYgbmV3IGlubGluZXMgbmVlZCB0byBiZSBhcHBsaWVkLCBhbmQgaXQncyBub3QgcG9zc2libGUgdG8gZ3VhcmFudGVlIHRoYXRcbiAgICogdGhleSB3b24ndCBvdmVyd3JpdGUgb3IgY29ycnVwdCBleGlzdGluZyBpbmxpbmVzIHRoYXQgYXJlIHVzZWQgYnkgc3VjaCBzaGltcy5cbiAgICovXG4gIGNsZWFyQWxsU2hpbURhdGFVc2luZ0lubGluZXMoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBmaWxlRGF0YSBvZiB0aGlzLnN0YXRlLnZhbHVlcygpKSB7XG4gICAgICBpZiAoIWZpbGVEYXRhLmhhc0lubGluZXMpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3NoaW1GaWxlLCBzaGltRGF0YV0gb2YgZmlsZURhdGEuc2hpbURhdGEuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChzaGltRGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICAgICAgZmlsZURhdGEuc2hpbURhdGEuZGVsZXRlKHNoaW1GaWxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gZmFsc2U7XG4gICAgICBmaWxlRGF0YS5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgICB0aGlzLmlzQ29tcGxldGUgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUZyb21Db250ZXh0KGN0eDogVHlwZUNoZWNrQ29udGV4dEltcGwpOiB2b2lkIHtcbiAgICBjb25zdCB1cGRhdGVzID0gY3R4LmZpbmFsaXplKCk7XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UY2JVcGRhdGVQcm9ncmFtLCAoKSA9PiB7XG4gICAgICBpZiAodXBkYXRlcy5zaXplID4gMCkge1xuICAgICAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuVXBkYXRlVHlwZUNoZWNrUHJvZ3JhbSk7XG4gICAgICB9XG4gICAgICB0aGlzLnByb2dyYW1Ecml2ZXIudXBkYXRlRmlsZXModXBkYXRlcywgVXBkYXRlTW9kZS5JbmNyZW1lbnRhbCk7XG4gICAgICB0aGlzLnByaW9yQnVpbGQucmVjb3JkU3VjY2Vzc2Z1bFR5cGVDaGVjayh0aGlzLnN0YXRlKTtcbiAgICAgIHRoaXMucGVyZi5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuVHRjVXBkYXRlUHJvZ3JhbSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRGaWxlRGF0YShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBpZiAoIXRoaXMuc3RhdGUuaGFzKHBhdGgpKSB7XG4gICAgICB0aGlzLnN0YXRlLnNldChwYXRoLCB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYW5hZ2VyOiBuZXcgVGVtcGxhdGVTb3VyY2VNYW5hZ2VyKCksXG4gICAgICAgIGlzQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICBzaGltRGF0YTogbmV3IE1hcCgpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXRlLmdldChwYXRoKSE7XG4gIH1cbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IFRtcGxBc3RUZW1wbGF0ZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVGVtcGxhdGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50LCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBFbGVtZW50U3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbE9mTm9kZShub2RlOiBBU1R8VG1wbEFzdE5vZGUsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRPckNyZWF0ZVN5bWJvbEJ1aWxkZXIoY29tcG9uZW50KTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVHRjU3ltYm9sLCAoKSA9PiBidWlsZGVyLmdldFN5bWJvbChub2RlKSk7XG4gIH1cblxuICBwcml2YXRlIGdldE9yQ3JlYXRlU3ltYm9sQnVpbGRlcihjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTeW1ib2xCdWlsZGVyfG51bGwge1xuICAgIGlmICh0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBjb25zdCB7dGNiLCBkYXRhLCBzaGltUGF0aH0gPSB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKHRjYiA9PT0gbnVsbCB8fCBkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBidWlsZGVyID0gbmV3IFN5bWJvbEJ1aWxkZXIoXG4gICAgICAgIHNoaW1QYXRoLCB0Y2IsIGRhdGEsIHRoaXMuY29tcG9uZW50U2NvcGVSZWFkZXIsXG4gICAgICAgICgpID0+IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgdGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuc2V0KGNvbXBvbmVudCwgYnVpbGRlcik7XG4gICAgcmV0dXJuIGJ1aWxkZXI7XG4gIH1cblxuICBnZXREaXJlY3RpdmVzSW5TY29wZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBEaXJlY3RpdmVJblNjb3BlW118bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0U2NvcGVEYXRhKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5kaXJlY3RpdmVzO1xuICB9XG5cbiAgZ2V0UGlwZXNJblNjb3BlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFBpcGVJblNjb3BlW118bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0U2NvcGVEYXRhKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5waXBlcztcbiAgfVxuXG4gIGdldERpcmVjdGl2ZU1ldGFkYXRhKGRpcjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oZGlyKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnR5cGVDaGVja1Njb3BlUmVnaXN0cnkuZ2V0VHlwZUNoZWNrRGlyZWN0aXZlTWV0YWRhdGEobmV3IFJlZmVyZW5jZShkaXIpKTtcbiAgfVxuXG4gIGdldFBvdGVudGlhbEVsZW1lbnRUYWdzKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IE1hcDxzdHJpbmcsIERpcmVjdGl2ZUluU2NvcGV8bnVsbD4ge1xuICAgIGlmICh0aGlzLmVsZW1lbnRUYWdDYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudFRhZ0NhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBjb25zdCB0YWdNYXAgPSBuZXcgTWFwPHN0cmluZywgRGlyZWN0aXZlSW5TY29wZXxudWxsPigpO1xuXG4gICAgZm9yIChjb25zdCB0YWcgb2YgUkVHSVNUUlkuYWxsS25vd25FbGVtZW50TmFtZXMoKSkge1xuICAgICAgdGFnTWFwLnNldCh0YWcsIG51bGwpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIHNjb3BlLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBDc3NTZWxlY3Rvci5wYXJzZShkaXJlY3RpdmUuc2VsZWN0b3IpKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdG9yLmVsZW1lbnQgPT09IG51bGwgfHwgdGFnTWFwLmhhcyhzZWxlY3Rvci5lbGVtZW50KSkge1xuICAgICAgICAgICAgLy8gU2tpcCB0aGlzIGRpcmVjdGl2ZSBpZiBpdCBkb2Vzbid0IG1hdGNoIGFuIGVsZW1lbnQgdGFnLCBvciBpZiBhbm90aGVyIGRpcmVjdGl2ZSBoYXNcbiAgICAgICAgICAgIC8vIGFscmVhZHkgYmVlbiBpbmNsdWRlZCB3aXRoIHRoZSBzYW1lIGVsZW1lbnQgbmFtZS5cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRhZ01hcC5zZXQoc2VsZWN0b3IuZWxlbWVudCwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZWxlbWVudFRhZ0NhY2hlLnNldChjb21wb25lbnQsIHRhZ01hcCk7XG4gICAgcmV0dXJuIHRhZ01hcDtcbiAgfVxuXG4gIGdldFBvdGVudGlhbERvbUJpbmRpbmdzKHRhZ05hbWU6IHN0cmluZyk6IHthdHRyaWJ1dGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZ31bXSB7XG4gICAgY29uc3QgYXR0cmlidXRlcyA9IFJFR0lTVFJZLmFsbEtub3duQXR0cmlidXRlc09mRWxlbWVudCh0YWdOYW1lKTtcbiAgICByZXR1cm4gYXR0cmlidXRlcy5tYXAoYXR0cmlidXRlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBSRUdJU1RSWS5nZXRNYXBwZWRQcm9wTmFtZShhdHRyaWJ1dGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGdldFNjb3BlRGF0YShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTY29wZURhdGF8bnVsbCB7XG4gICAgaWYgKHRoaXMuc2NvcGVDYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2NvcGVDYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBjb21wb25lbnRzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5jb21wb25lbnRTY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YTogU2NvcGVEYXRhID0ge1xuICAgICAgZGlyZWN0aXZlczogW10sXG4gICAgICBwaXBlczogW10sXG4gICAgICBpc1BvaXNvbmVkOiBzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkLFxuICAgIH07XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICBpZiAoZGlyLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBkaXJlY3RpdmUsIGl0IGNhbid0IGJlIGFkZGVkIHRvIGEgdGVtcGxhdGUgYW55d2F5LlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRzU3ltYm9sID0gdHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkaXIucmVmLm5vZGUubmFtZSk7XG4gICAgICBpZiAoIWlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24odHNTeW1ib2wpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gICAgICBjb25zdCBtb2R1bGVTY29wZU9mRGlyID0gdGhpcy5jb21wb25lbnRTY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChkaXIucmVmLm5vZGUpO1xuICAgICAgaWYgKG1vZHVsZVNjb3BlT2ZEaXIgIT09IG51bGwpIHtcbiAgICAgICAgbmdNb2R1bGUgPSBtb2R1bGVTY29wZU9mRGlyLm5nTW9kdWxlO1xuICAgICAgfVxuXG4gICAgICBkYXRhLmRpcmVjdGl2ZXMucHVzaCh7XG4gICAgICAgIGlzQ29tcG9uZW50OiBkaXIuaXNDb21wb25lbnQsXG4gICAgICAgIGlzU3RydWN0dXJhbDogZGlyLmlzU3RydWN0dXJhbCxcbiAgICAgICAgc2VsZWN0b3I6IGRpci5zZWxlY3RvcixcbiAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgIG5nTW9kdWxlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICBjb25zdCB0c1N5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ocGlwZS5yZWYubm9kZS5uYW1lKTtcbiAgICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZGF0YS5waXBlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogcGlwZS5uYW1lLFxuICAgICAgICB0c1N5bWJvbCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuc2NvcGVDYWNoZS5zZXQoY29tcG9uZW50LCBkYXRhKTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlhZ25vc3RpYyhcbiAgICBkaWFnOiB0cy5EaWFnbm9zdGljLCBzb3VyY2VSZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcik6IFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKCFzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHRyYW5zbGF0ZURpYWdub3N0aWMoZGlhZywgc291cmNlUmVzb2x2ZXIpO1xufVxuXG4vKipcbiAqIERhdGEgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcmVsYXRlZCB0byBhIHNwZWNpZmljIGlucHV0IGZpbGUgaW4gdGhlIHVzZXIncyBwcm9ncmFtICh3aGljaFxuICogY29udGFpbnMgY29tcG9uZW50cyB0byBiZSBjaGVja2VkKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB0eXBlLWNoZWNraW5nIHNoaW0gcmVxdWlyZWQgYW55IGlubGluZSBjaGFuZ2VzIHRvIHRoZSBvcmlnaW5hbCBmaWxlLCB3aGljaCBhZmZlY3RzXG4gICAqIHdoZXRoZXIgdGhlIHNoaW0gY2FuIGJlIHJldXNlZC5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uIGZvciBtYXBwaW5nIGRpYWdub3N0aWNzIGZyb20gaW5saW5lZCB0eXBlIGNoZWNrIGJsb2NrcyBiYWNrIHRvIHRoZVxuICAgKiBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICovXG4gIHNvdXJjZU1hbmFnZXI6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogRGF0YSBmb3IgZWFjaCBzaGltIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICpcbiAgICogQSBzaW5nbGUgaW5wdXQgZmlsZSB3aWxsIGdlbmVyYXRlIG9uZSBvciBtb3JlIHNoaW0gZmlsZXMgdGhhdCBhY3R1YWxseSBjb250YWluIHRlbXBsYXRlXG4gICAqIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFNoaW1UeXBlQ2hlY2tpbmdEYXRhPjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2VyIGlzIGNlcnRhaW4gdGhhdCBhbGwgY29tcG9uZW50cyBmcm9tIHRoaXMgaW5wdXQgZmlsZSBoYXZlIGhhZFxuICAgKiB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGVkIGludG8gc2hpbXMuXG4gICAqL1xuICBpc0NvbXBsZXRlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZm9yIGV2ZXJ5IGNvbXBvbmVudCBpbiB0aGUgcHJvZ3JhbS5cbiAqL1xuY2xhc3MgV2hvbGVQcm9ncmFtVHlwZUNoZWNraW5nSG9zdCBpbXBsZW1lbnRzIFR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKSB7fVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgcmV0dXJuIHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIC8vIFRoZSBjb21wb25lbnQgbmVlZHMgdG8gYmUgY2hlY2tlZCB1bmxlc3MgdGhlIHNoaW0gd2hpY2ggd291bGQgY29udGFpbiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICByZXR1cm4gIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICByZWNvcmRTaGltRGF0YShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBTaGltVHlwZUNoZWNraW5nRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgZmlsZURhdGEuc2hpbURhdGEuc2V0KGRhdGEucGF0aCwgZGF0YSk7XG4gICAgaWYgKGRhdGEuaGFzSW5saW5lcykge1xuICAgICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpLmlzQ29tcGxldGUgPSB0cnVlO1xuICB9XG59XG5cbi8qKlxuICogRHJpdmVzIGEgYFR5cGVDaGVja0NvbnRleHRgIHRvIGdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBlZmZpY2llbnRseSBmb3IgYSBzaW5nbGUgaW5wdXQgZmlsZS5cbiAqL1xuY2xhc3MgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3QgaW1wbGVtZW50cyBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgcHJpdmF0ZSBzZWVuSW5saW5lcyA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3RlY3RlZCBmaWxlRGF0YTogRmlsZVR5cGVDaGVja2luZ0RhdGEsXG4gICAgICBwcm90ZWN0ZWQgaW1wbDogVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwpIHt9XG5cbiAgcHJpdmF0ZSBhc3NlcnRQYXRoKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IHNmUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogcXVlcnlpbmcgVHlwZUNoZWNraW5nSG9zdCBvdXRzaWRlIG9mIGFzc2lnbmVkIGZpbGVgKTtcbiAgICB9XG4gIH1cblxuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXIge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHJldHVybiB0aGlzLmZpbGVEYXRhLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcih0aGlzLnNmUGF0aCk7XG5cbiAgICAvLyBPbmx5IG5lZWQgdG8gZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjbGFzcyBpZiBubyBzaGltIGV4aXN0cyBmb3IgaXQgY3VycmVudGx5LlxuICAgIHJldHVybiAhdGhpcy5maWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcblxuICAgIC8vIFByZXZpb3VzIHR5cGUtY2hlY2tpbmcgc3RhdGUgbWF5IGhhdmUgcmVxdWlyZWQgdGhlIHVzZSBvZiBpbmxpbmVzIChhc3N1bWluZyB0aGV5IHdlcmVcbiAgICAvLyBzdXBwb3J0ZWQpLiBJZiB0aGUgY3VycmVudCBvcGVyYXRpb24gYWxzbyByZXF1aXJlcyBpbmxpbmVzLCB0aGlzIHByZXNlbnRzIGEgcHJvYmxlbTpcbiAgICAvLyBnZW5lcmF0aW5nIG5ldyBpbmxpbmVzIG1heSBpbnZhbGlkYXRlIGFueSBvbGQgaW5saW5lcyB0aGF0IG9sZCBzdGF0ZSBkZXBlbmRzIG9uLlxuICAgIC8vXG4gICAgLy8gUmF0aGVyIHRoYW4gcmVzb2x2ZSB0aGlzIGlzc3VlIGJ5IHRyYWNraW5nIHNwZWNpZmljIGRlcGVuZGVuY2llcyBvbiBpbmxpbmVzLCBpZiB0aGUgbmV3IHN0YXRlXG4gICAgLy8gcmVsaWVzIG9uIGlubGluZXMsIGFueSBvbGQgc3RhdGUgdGhhdCByZWxpZWQgb24gdGhlbSBpcyBzaW1wbHkgY2xlYXJlZC4gVGhpcyBoYXBwZW5zIHdoZW4gdGhlXG4gICAgLy8gZmlyc3QgbmV3IHN0YXRlIHRoYXQgdXNlcyBpbmxpbmVzIGlzIGVuY291bnRlcmVkLlxuICAgIGlmIChkYXRhLmhhc0lubGluZXMgJiYgIXRoaXMuc2VlbklubGluZXMpIHtcbiAgICAgIHRoaXMuaW1wbC5jbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk7XG4gICAgICB0aGlzLnNlZW5JbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIHRoaXMuZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHRoaXMuZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGVmZmljaWVudGx5IGZvciBvbmx5IHRob3NlIGNvbXBvbmVudHNcbiAqIHdoaWNoIG1hcCB0byBhIHNpbmdsZSBzaGltIG9mIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZVNoaW1UeXBlQ2hlY2tpbmdIb3N0IGV4dGVuZHMgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGZpbGVEYXRhOiBGaWxlVHlwZUNoZWNraW5nRGF0YSwgaW1wbDogVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwsXG4gICAgICBwcml2YXRlIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHN1cGVyKHNmUGF0aCwgZmlsZURhdGEsIGltcGwpO1xuICB9XG5cbiAgc2hvdWxkQ2hlY2tOb2RlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT25seSBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNvbXBvbmVudCBpZiBpdCBtYXBzIHRvIHRoZSByZXF1ZXN0ZWQgc2hpbSBmaWxlLlxuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHRoaXMuc2ZQYXRoKTtcbiAgICBpZiAoc2hpbVBhdGggIT09IHRoaXMuc2hpbVBhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IG5lZWQgdG8gZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjbGFzcyBpZiBubyBzaGltIGV4aXN0cyBmb3IgaXQgY3VycmVudGx5LlxuICAgIHJldHVybiAhdGhpcy5maWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG59XG5cbi8qKlxuICogQ2FjaGVkIHNjb3BlIGluZm9ybWF0aW9uIGZvciBhIGNvbXBvbmVudC5cbiAqL1xuaW50ZXJmYWNlIFNjb3BlRGF0YSB7XG4gIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZUluU2NvcGVbXTtcbiAgcGlwZXM6IFBpcGVJblNjb3BlW107XG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG59XG4iXX0=