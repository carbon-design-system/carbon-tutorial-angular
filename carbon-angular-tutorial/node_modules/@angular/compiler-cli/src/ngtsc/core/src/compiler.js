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
        define("@angular/compiler-cli/src/ngtsc/core/src/compiler", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/extended", "@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box", "@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isAngularCorePackage = exports.NgCompiler = exports.resourceChangeTicket = exports.incrementalFromStateTicket = exports.incrementalFromCompilerTicket = exports.freshCompilationTicket = exports.CompilationTicketKind = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/src/ngtsc/entry_point");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var indexer_1 = require("@angular/compiler-cli/src/ngtsc/indexer");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var resource_1 = require("@angular/compiler-cli/src/ngtsc/resource");
    var routing_1 = require("@angular/compiler-cli/src/ngtsc/routing");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var switch_1 = require("@angular/compiler-cli/src/ngtsc/switch");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var extended_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended");
    var invalid_banana_in_box_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box");
    var nullish_coalescing_not_nullable_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Discriminant type for a `CompilationTicket`.
     */
    var CompilationTicketKind;
    (function (CompilationTicketKind) {
        CompilationTicketKind[CompilationTicketKind["Fresh"] = 0] = "Fresh";
        CompilationTicketKind[CompilationTicketKind["IncrementalTypeScript"] = 1] = "IncrementalTypeScript";
        CompilationTicketKind[CompilationTicketKind["IncrementalResource"] = 2] = "IncrementalResource";
    })(CompilationTicketKind = exports.CompilationTicketKind || (exports.CompilationTicketKind = {}));
    /**
     * Create a `CompilationTicket` for a brand new compilation, using no prior state.
     */
    function freshCompilationTicket(tsProgram, options, incrementalBuildStrategy, programDriver, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
        return {
            kind: CompilationTicketKind.Fresh,
            tsProgram: tsProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            programDriver: programDriver,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
            perfRecorder: perfRecorder !== null && perfRecorder !== void 0 ? perfRecorder : perf_1.ActivePerfRecorder.zeroedToNow(),
        };
    }
    exports.freshCompilationTicket = freshCompilationTicket;
    /**
     * Create a `CompilationTicket` as efficiently as possible, based on a previous `NgCompiler`
     * instance and a new `ts.Program`.
     */
    function incrementalFromCompilerTicket(oldCompiler, newProgram, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder) {
        var oldProgram = oldCompiler.getCurrentProgram();
        var oldState = oldCompiler.incrementalStrategy.getIncrementalState(oldProgram);
        if (oldState === null) {
            // No incremental step is possible here, since no IncrementalDriver was found for the old
            // program.
            return freshCompilationTicket(newProgram, oldCompiler.options, incrementalBuildStrategy, programDriver, perfRecorder, oldCompiler.enableTemplateTypeChecker, oldCompiler.usePoisonedData);
        }
        if (perfRecorder === null) {
            perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
        }
        var incrementalCompilation = incremental_1.IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            enableTemplateTypeChecker: oldCompiler.enableTemplateTypeChecker,
            usePoisonedData: oldCompiler.usePoisonedData,
            options: oldCompiler.options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            incrementalCompilation: incrementalCompilation,
            programDriver: programDriver,
            newProgram: newProgram,
            perfRecorder: perfRecorder,
        };
    }
    exports.incrementalFromCompilerTicket = incrementalFromCompilerTicket;
    /**
     * Create a `CompilationTicket` directly from an old `ts.Program` and associated Angular compilation
     * state, along with a new `ts.Program`.
     */
    function incrementalFromStateTicket(oldProgram, oldState, newProgram, options, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
        if (perfRecorder === null) {
            perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
        }
        var incrementalCompilation = incremental_1.IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            newProgram: newProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            incrementalCompilation: incrementalCompilation,
            programDriver: programDriver,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
            perfRecorder: perfRecorder,
        };
    }
    exports.incrementalFromStateTicket = incrementalFromStateTicket;
    function resourceChangeTicket(compiler, modifiedResourceFiles) {
        return {
            kind: CompilationTicketKind.IncrementalResource,
            compiler: compiler,
            modifiedResourceFiles: modifiedResourceFiles,
            perfRecorder: perf_1.ActivePerfRecorder.zeroedToNow(),
        };
    }
    exports.resourceChangeTicket = resourceChangeTicket;
    /**
     * The heart of the Angular Ivy compiler.
     *
     * The `NgCompiler` provides an API for performing Angular compilation within a custom TypeScript
     * compiler. Each instance of `NgCompiler` supports a single compilation, which might be
     * incremental.
     *
     * `NgCompiler` is lazy, and does not perform any of the work of the compilation until one of its
     * output methods (e.g. `getDiagnostics`) is called.
     *
     * See the README.md for more information.
     */
    var NgCompiler = /** @class */ (function () {
        function NgCompiler(adapter, options, inputProgram, programDriver, incrementalStrategy, incrementalCompilation, enableTemplateTypeChecker, usePoisonedData, livePerfRecorder) {
            var _a, e_1, _b;
            var _this = this;
            this.adapter = adapter;
            this.options = options;
            this.inputProgram = inputProgram;
            this.programDriver = programDriver;
            this.incrementalStrategy = incrementalStrategy;
            this.incrementalCompilation = incrementalCompilation;
            this.enableTemplateTypeChecker = enableTemplateTypeChecker;
            this.usePoisonedData = usePoisonedData;
            this.livePerfRecorder = livePerfRecorder;
            /**
             * Lazily evaluated state of the compilation.
             *
             * This is created on demand by calling `ensureAnalyzed`.
             */
            this.compilation = null;
            /**
             * Any diagnostics related to the construction of the compilation.
             *
             * These are diagnostics which arose during setup of the host and/or program.
             */
            this.constructionDiagnostics = [];
            /**
             * Non-template diagnostics related to the program itself. Does not include template
             * diagnostics because the template type checker memoizes them itself.
             *
             * This is set by (and memoizes) `getNonTemplateDiagnostics`.
             */
            this.nonTemplateDiagnostics = null;
            /**
             * `NgCompiler` can be reused for multiple compilations (for resource-only changes), and each
             * new compilation uses a fresh `PerfRecorder`. Thus, classes created with a lifespan of the
             * `NgCompiler` use a `DelegatingPerfRecorder` so the `PerfRecorder` they write to can be updated
             * with each fresh compilation.
             */
            this.delegatingPerfRecorder = new perf_1.DelegatingPerfRecorder(this.perfRecorder);
            if (this.options._extendedTemplateDiagnostics === true &&
                this.options.strictTemplates === false) {
                throw new Error('The \'_extendedTemplateDiagnostics\' option requires \'strictTemplates\' to also be enabled.');
            }
            (_a = this.constructionDiagnostics).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(this.adapter.constructionDiagnostics)));
            var incompatibleTypeCheckOptionsDiagnostic = verifyCompatibleTypeCheckOptions(this.options);
            if (incompatibleTypeCheckOptionsDiagnostic !== null) {
                this.constructionDiagnostics.push(incompatibleTypeCheckOptionsDiagnostic);
            }
            this.currentProgram = inputProgram;
            this.closureCompilerEnabled = !!this.options.annotateForClosureCompiler;
            this.entryPoint =
                adapter.entryPoint !== null ? typescript_1.getSourceFileOrNull(inputProgram, adapter.entryPoint) : null;
            var moduleResolutionCache = ts.createModuleResolutionCache(this.adapter.getCurrentDirectory(), 
            // doen't retain a reference to `this`, if other closures in the constructor here reference
            // `this` internally then a closure created here would retain them. This can cause major
            // memory leak issues since the `moduleResolutionCache` is a long-lived object and finds its
            // way into all kinds of places inside TS internal objects.
            this.adapter.getCanonicalFileName.bind(this.adapter));
            this.moduleResolver =
                new imports_1.ModuleResolver(inputProgram, this.options, this.adapter, moduleResolutionCache);
            this.resourceManager = new resource_1.AdapterResourceLoader(adapter, this.options);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(inputProgram.getTypeChecker(), this.delegatingPerfRecorder));
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, inputProgram);
            this.ignoreForDiagnostics =
                new Set(inputProgram.getSourceFiles().filter(function (sf) { return _this.adapter.isShim(sf); }));
            this.ignoreForEmit = this.adapter.ignoreForEmit;
            var dtsFileCount = 0;
            var nonDtsFileCount = 0;
            try {
                for (var _c = tslib_1.__values(inputProgram.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var sf = _d.value;
                    if (sf.isDeclarationFile) {
                        dtsFileCount++;
                    }
                    else {
                        nonDtsFileCount++;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            livePerfRecorder.eventCount(perf_1.PerfEvent.InputDtsFile, dtsFileCount);
            livePerfRecorder.eventCount(perf_1.PerfEvent.InputTsFile, nonDtsFileCount);
        }
        /**
         * Convert a `CompilationTicket` into an `NgCompiler` instance for the requested compilation.
         *
         * Depending on the nature of the compilation request, the `NgCompiler` instance may be reused
         * from a previous compilation and updated with any changes, it may be a new instance which
         * incrementally reuses state from a previous compilation, or it may represent a fresh
         * compilation entirely.
         */
        NgCompiler.fromTicket = function (ticket, adapter) {
            switch (ticket.kind) {
                case CompilationTicketKind.Fresh:
                    return new NgCompiler(adapter, ticket.options, ticket.tsProgram, ticket.programDriver, ticket.incrementalBuildStrategy, incremental_1.IncrementalCompilation.fresh(ticket.tsProgram, versionMapFromProgram(ticket.tsProgram, ticket.programDriver)), ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
                case CompilationTicketKind.IncrementalTypeScript:
                    return new NgCompiler(adapter, ticket.options, ticket.newProgram, ticket.programDriver, ticket.incrementalBuildStrategy, ticket.incrementalCompilation, ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
                case CompilationTicketKind.IncrementalResource:
                    var compiler = ticket.compiler;
                    compiler.updateWithChangedResources(ticket.modifiedResourceFiles, ticket.perfRecorder);
                    return compiler;
            }
        };
        Object.defineProperty(NgCompiler.prototype, "perfRecorder", {
            get: function () {
                return this.livePerfRecorder;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NgCompiler.prototype, "incrementalDriver", {
            /**
             * Exposes the `IncrementalCompilation` under an old property name that the CLI uses, avoiding a
             * chicken-and-egg problem with the rename to `incrementalCompilation`.
             *
             * TODO(alxhub): remove when the CLI uses the new name.
             */
            get: function () {
                return this.incrementalCompilation;
            },
            enumerable: false,
            configurable: true
        });
        NgCompiler.prototype.updateWithChangedResources = function (changedResources, perfRecorder) {
            var _this = this;
            this.livePerfRecorder = perfRecorder;
            this.delegatingPerfRecorder.target = perfRecorder;
            perfRecorder.inPhase(perf_1.PerfPhase.ResourceUpdate, function () {
                var e_2, _a, e_3, _b, e_4, _c, e_5, _d;
                if (_this.compilation === null) {
                    // Analysis hasn't happened yet, so no update is necessary - any changes to resources will
                    // be captured by the inital analysis pass itself.
                    return;
                }
                _this.resourceManager.invalidate();
                var classesToUpdate = new Set();
                try {
                    for (var changedResources_1 = tslib_1.__values(changedResources), changedResources_1_1 = changedResources_1.next(); !changedResources_1_1.done; changedResources_1_1 = changedResources_1.next()) {
                        var resourceFile = changedResources_1_1.value;
                        try {
                            for (var _e = (e_3 = void 0, tslib_1.__values(_this.getComponentsWithTemplateFile(resourceFile))), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var templateClass = _f.value;
                                classesToUpdate.add(templateClass);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        try {
                            for (var _g = (e_4 = void 0, tslib_1.__values(_this.getComponentsWithStyleFile(resourceFile))), _h = _g.next(); !_h.done; _h = _g.next()) {
                                var styleClass = _h.value;
                                classesToUpdate.add(styleClass);
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (changedResources_1_1 && !changedResources_1_1.done && (_a = changedResources_1.return)) _a.call(changedResources_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                try {
                    for (var classesToUpdate_1 = tslib_1.__values(classesToUpdate), classesToUpdate_1_1 = classesToUpdate_1.next(); !classesToUpdate_1_1.done; classesToUpdate_1_1 = classesToUpdate_1.next()) {
                        var clazz = classesToUpdate_1_1.value;
                        _this.compilation.traitCompiler.updateResources(clazz);
                        if (!ts.isClassDeclaration(clazz)) {
                            continue;
                        }
                        _this.compilation.templateTypeChecker.invalidateClass(clazz);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (classesToUpdate_1_1 && !classesToUpdate_1_1.done && (_d = classesToUpdate_1.return)) _d.call(classesToUpdate_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            });
        };
        /**
         * Get the resource dependencies of a file.
         *
         * If the file is not part of the compilation, an empty array will be returned.
         */
        NgCompiler.prototype.getResourceDependencies = function (file) {
            this.ensureAnalyzed();
            return this.incrementalCompilation.depGraph.getResourceDependencies(file);
        };
        /**
         * Get all Angular-related diagnostics for this compilation.
         */
        NgCompiler.prototype.getDiagnostics = function () {
            var diagnostics = [];
            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this.getNonTemplateDiagnostics())), tslib_1.__read(this.getTemplateDiagnostics())));
            if (this.options._extendedTemplateDiagnostics) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(this.getExtendedTemplateDiagnostics())));
            }
            return this.addMessageTextDetails(diagnostics);
        };
        /**
         * Get all Angular-related diagnostics for this compilation.
         *
         * If a `ts.SourceFile` is passed, only diagnostics related to that file are returned.
         */
        NgCompiler.prototype.getDiagnosticsForFile = function (file, optimizeFor) {
            var diagnostics = [];
            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this.getNonTemplateDiagnostics().filter(function (diag) { return diag.file === file; }))), tslib_1.__read(this.getTemplateDiagnosticsForFile(file, optimizeFor))));
            if (this.options._extendedTemplateDiagnostics) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(this.getExtendedTemplateDiagnostics(file))));
            }
            return this.addMessageTextDetails(diagnostics);
        };
        /**
         * Get all `ts.Diagnostic`s currently available that pertain to the given component.
         */
        NgCompiler.prototype.getDiagnosticsForComponent = function (component) {
            var compilation = this.ensureAnalyzed();
            var ttc = compilation.templateTypeChecker;
            var diagnostics = [];
            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(ttc.getDiagnosticsForComponent(component))));
            if (this.options._extendedTemplateDiagnostics) {
                var extendedTemplateChecker = compilation.extendedTemplateChecker;
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(extendedTemplateChecker.getDiagnosticsForComponent(component))));
            }
            return this.addMessageTextDetails(diagnostics);
        };
        /**
         * Add Angular.io error guide links to diagnostics for this compilation.
         */
        NgCompiler.prototype.addMessageTextDetails = function (diagnostics) {
            return diagnostics.map(function (diag) {
                if (diag.code && diagnostics_1.COMPILER_ERRORS_WITH_GUIDES.has(diagnostics_1.ngErrorCode(diag.code))) {
                    return tslib_1.__assign(tslib_1.__assign({}, diag), { messageText: diag.messageText +
                            (". Find more at " + diagnostics_1.ERROR_DETAILS_PAGE_BASE_URL + "/NG" + diagnostics_1.ngErrorCode(diag.code)) });
                }
                return diag;
            });
        };
        /**
         * Get all setup-related diagnostics for this compilation.
         */
        NgCompiler.prototype.getOptionDiagnostics = function () {
            return this.constructionDiagnostics;
        };
        /**
         * Get the current `ts.Program` known to this `NgCompiler`.
         *
         * Compilation begins with an input `ts.Program`, and during template type-checking operations new
         * `ts.Program`s may be produced using the `ProgramDriver`. The most recent such `ts.Program` to
         * be produced is available here.
         *
         * This `ts.Program` serves two key purposes:
         *
         * * As an incremental starting point for creating the next `ts.Program` based on files that the
         *   user has changed (for clients using the TS compiler program APIs).
         *
         * * As the "before" point for an incremental compilation invocation, to determine what's changed
         *   between the old and new programs (for all compilations).
         */
        NgCompiler.prototype.getCurrentProgram = function () {
            return this.currentProgram;
        };
        NgCompiler.prototype.getTemplateTypeChecker = function () {
            if (!this.enableTemplateTypeChecker) {
                throw new Error('The `TemplateTypeChecker` does not work without `enableTemplateTypeChecker`.');
            }
            return this.ensureAnalyzed().templateTypeChecker;
        };
        /**
         * Retrieves the `ts.Declaration`s for any component(s) which use the given template file.
         */
        NgCompiler.prototype.getComponentsWithTemplateFile = function (templateFilePath) {
            var resourceRegistry = this.ensureAnalyzed().resourceRegistry;
            return resourceRegistry.getComponentsWithTemplate(file_system_1.resolve(templateFilePath));
        };
        /**
         * Retrieves the `ts.Declaration`s for any component(s) which use the given template file.
         */
        NgCompiler.prototype.getComponentsWithStyleFile = function (styleFilePath) {
            var resourceRegistry = this.ensureAnalyzed().resourceRegistry;
            return resourceRegistry.getComponentsWithStyle(file_system_1.resolve(styleFilePath));
        };
        /**
         * Retrieves external resources for the given component.
         */
        NgCompiler.prototype.getComponentResources = function (classDecl) {
            if (!reflection_1.isNamedClassDeclaration(classDecl)) {
                return null;
            }
            var resourceRegistry = this.ensureAnalyzed().resourceRegistry;
            var styles = resourceRegistry.getStyles(classDecl);
            var template = resourceRegistry.getTemplate(classDecl);
            if (template === null) {
                return null;
            }
            return { styles: styles, template: template };
        };
        NgCompiler.prototype.getMeta = function (classDecl) {
            var _a;
            if (!reflection_1.isNamedClassDeclaration(classDecl)) {
                return null;
            }
            var ref = new imports_1.Reference(classDecl);
            var metaReader = this.ensureAnalyzed().metaReader;
            var meta = (_a = metaReader.getPipeMetadata(ref)) !== null && _a !== void 0 ? _a : metaReader.getDirectiveMetadata(ref);
            if (meta === null) {
                return null;
            }
            return meta;
        };
        /**
         * Perform Angular's analysis step (as a precursor to `getDiagnostics` or `prepareEmit`)
         * asynchronously.
         *
         * Normally, this operation happens lazily whenever `getDiagnostics` or `prepareEmit` are called.
         * However, certain consumers may wish to allow for an asynchronous phase of analysis, where
         * resources such as `styleUrls` are resolved asynchonously. In these cases `analyzeAsync` must be
         * called first, and its `Promise` awaited prior to calling any other APIs of `NgCompiler`.
         */
        NgCompiler.prototype.analyzeAsync = function () {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.compilation !== null) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.perfRecorder.inPhase(perf_1.PerfPhase.Analysis, function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                    var promises, _a, _b, sf, analysisPromise;
                                    var e_6, _c;
                                    return tslib_1.__generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                this.compilation = this.makeCompilation();
                                                promises = [];
                                                try {
                                                    for (_a = tslib_1.__values(this.inputProgram.getSourceFiles()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                                        sf = _b.value;
                                                        if (sf.isDeclarationFile) {
                                                            continue;
                                                        }
                                                        analysisPromise = this.compilation.traitCompiler.analyzeAsync(sf);
                                                        if (analysisPromise !== undefined) {
                                                            promises.push(analysisPromise);
                                                        }
                                                    }
                                                }
                                                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                                                finally {
                                                    try {
                                                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                                    }
                                                    finally { if (e_6) throw e_6.error; }
                                                }
                                                return [4 /*yield*/, Promise.all(promises)];
                                            case 1:
                                                _d.sent();
                                                this.perfRecorder.memory(perf_1.PerfCheckpoint.Analysis);
                                                this.resolveCompilation(this.compilation.traitCompiler);
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * List lazy routes detected during analysis.
         *
         * This can be called for one specific route, or to retrieve all top-level routes.
         */
        NgCompiler.prototype.listLazyRoutes = function (entryRoute) {
            if (entryRoute) {
                // htts://github.com/angular/angular/blob/50732e156/packages/compiler-cli/src/transformers/compiler_host.ts#L175-L188).
                //
                // `@angular/cli` will always call this API with an absolute path, so the resolution step is
                // not necessary, but keeping it backwards compatible in case someone else is using the API.
                // Relative entry paths are disallowed.
                if (entryRoute.startsWith('.')) {
                    throw new Error("Failed to list lazy routes: Resolution of relative paths (" + entryRoute + ") is not supported.");
                }
                // Non-relative entry paths fall into one of the following categories:
                // - Absolute system paths (e.g. `/foo/bar/my-project/my-module`), which are unaffected by the
                //   logic below.
                // - Paths to enternal modules (e.g. `some-lib`).
                // - Paths mapped to directories in `tsconfig.json` (e.g. `shared/my-module`).
                //   (See https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping.)
                //
                // In all cases above, the `containingFile` argument is ignored, so we can just take the first
                // of the root files.
                var containingFile = this.inputProgram.getRootFileNames()[0];
                var _a = tslib_1.__read(entryRoute.split('#'), 2), entryPath = _a[0], moduleName = _a[1];
                var resolvedModule = typescript_1.resolveModuleName(entryPath, containingFile, this.options, this.adapter, null);
                if (resolvedModule) {
                    entryRoute = routing_1.entryPointKeyFor(resolvedModule.resolvedFileName, moduleName);
                }
            }
            var compilation = this.ensureAnalyzed();
            return compilation.routeAnalyzer.listLazyRoutes(entryRoute);
        };
        /**
         * Fetch transformers and other information which is necessary for a consumer to `emit` the
         * program with Angular-added definitions.
         */
        NgCompiler.prototype.prepareEmit = function () {
            var compilation = this.ensureAnalyzed();
            var coreImportsFrom = compilation.isCore ? getR3SymbolsFile(this.inputProgram) : null;
            var importRewriter;
            if (coreImportsFrom !== null) {
                importRewriter = new imports_1.R3SymbolsImportRewriter(coreImportsFrom.fileName);
            }
            else {
                importRewriter = new imports_1.NoopImportRewriter();
            }
            var defaultImportTracker = new imports_1.DefaultImportTracker();
            var before = [
                transform_1.ivyTransformFactory(compilation.traitCompiler, compilation.reflector, importRewriter, defaultImportTracker, this.delegatingPerfRecorder, compilation.isCore, this.closureCompilerEnabled),
                transform_1.aliasTransformFactory(compilation.traitCompiler.exportStatements),
                defaultImportTracker.importPreservingTransformer(),
            ];
            var afterDeclarations = [];
            if (compilation.dtsTransforms !== null) {
                afterDeclarations.push(transform_1.declarationTransformFactory(compilation.dtsTransforms, importRewriter));
            }
            // Only add aliasing re-exports to the .d.ts output if the `AliasingHost` requests it.
            if (compilation.aliasingHost !== null && compilation.aliasingHost.aliasExportsInDts) {
                afterDeclarations.push(transform_1.aliasTransformFactory(compilation.traitCompiler.exportStatements));
            }
            if (this.adapter.factoryTracker !== null) {
                before.push(shims_1.generatedFactoryTransform(this.adapter.factoryTracker.sourceInfo, importRewriter));
            }
            before.push(switch_1.ivySwitchTransform);
            return { transformers: { before: before, afterDeclarations: afterDeclarations } };
        };
        /**
         * Run the indexing process and return a `Map` of all indexed components.
         *
         * See the `indexing` package for more details.
         */
        NgCompiler.prototype.getIndexedComponents = function () {
            var compilation = this.ensureAnalyzed();
            var context = new indexer_1.IndexingContext();
            compilation.traitCompiler.index(context);
            return indexer_1.generateAnalysis(context);
        };
        /**
         * Collect i18n messages into the `Xi18nContext`.
         */
        NgCompiler.prototype.xi18n = function (ctx) {
            // Note that the 'resolve' phase is not strictly necessary for xi18n, but this is not currently
            // optimized.
            var compilation = this.ensureAnalyzed();
            compilation.traitCompiler.xi18n(ctx);
        };
        NgCompiler.prototype.ensureAnalyzed = function () {
            if (this.compilation === null) {
                this.analyzeSync();
            }
            return this.compilation;
        };
        NgCompiler.prototype.analyzeSync = function () {
            var _this = this;
            this.perfRecorder.inPhase(perf_1.PerfPhase.Analysis, function () {
                var e_7, _a;
                _this.compilation = _this.makeCompilation();
                try {
                    for (var _b = tslib_1.__values(_this.inputProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (sf.isDeclarationFile) {
                            continue;
                        }
                        _this.compilation.traitCompiler.analyzeSync(sf);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
                _this.perfRecorder.memory(perf_1.PerfCheckpoint.Analysis);
                _this.resolveCompilation(_this.compilation.traitCompiler);
            });
        };
        NgCompiler.prototype.resolveCompilation = function (traitCompiler) {
            var _this = this;
            this.perfRecorder.inPhase(perf_1.PerfPhase.Resolve, function () {
                traitCompiler.resolve();
                // At this point, analysis is complete and the compiler can now calculate which files need to
                // be emitted, so do that.
                _this.incrementalCompilation.recordSuccessfulAnalysis(traitCompiler);
                _this.perfRecorder.memory(perf_1.PerfCheckpoint.Resolve);
            });
        };
        Object.defineProperty(NgCompiler.prototype, "fullTemplateTypeCheck", {
            get: function () {
                // Determine the strictness level of type checking based on compiler options. As
                // `strictTemplates` is a superset of `fullTemplateTypeCheck`, the former implies the latter.
                // Also see `verifyCompatibleTypeCheckOptions` where it is verified that `fullTemplateTypeCheck`
                // is not disabled when `strictTemplates` is enabled.
                var strictTemplates = !!this.options.strictTemplates;
                return strictTemplates || !!this.options.fullTemplateTypeCheck;
            },
            enumerable: false,
            configurable: true
        });
        NgCompiler.prototype.getTypeCheckingConfig = function () {
            // Determine the strictness level of type checking based on compiler options. As
            // `strictTemplates` is a superset of `fullTemplateTypeCheck`, the former implies the latter.
            // Also see `verifyCompatibleTypeCheckOptions` where it is verified that `fullTemplateTypeCheck`
            // is not disabled when `strictTemplates` is enabled.
            var strictTemplates = !!this.options.strictTemplates;
            var useInlineTypeConstructors = this.programDriver.supportsInlineOperations;
            // First select a type-checking configuration, based on whether full template type-checking is
            // requested.
            var typeCheckingConfig;
            if (this.fullTemplateTypeCheck) {
                typeCheckingConfig = {
                    applyTemplateContextGuards: strictTemplates,
                    checkQueries: false,
                    checkTemplateBodies: true,
                    alwaysCheckSchemaInTemplateBodies: true,
                    checkTypeOfInputBindings: strictTemplates,
                    honorAccessModifiersForInputBindings: false,
                    strictNullInputBindings: strictTemplates,
                    checkTypeOfAttributes: strictTemplates,
                    // Even in full template type-checking mode, DOM binding checks are not quite ready yet.
                    checkTypeOfDomBindings: false,
                    checkTypeOfOutputEvents: strictTemplates,
                    checkTypeOfAnimationEvents: strictTemplates,
                    // Checking of DOM events currently has an adverse effect on developer experience,
                    // e.g. for `<input (blur)="update($event.target.value)">` enabling this check results in:
                    // - error TS2531: Object is possibly 'null'.
                    // - error TS2339: Property 'value' does not exist on type 'EventTarget'.
                    checkTypeOfDomEvents: strictTemplates,
                    checkTypeOfDomReferences: strictTemplates,
                    // Non-DOM references have the correct type in View Engine so there is no strictness flag.
                    checkTypeOfNonDomReferences: true,
                    // Pipes are checked in View Engine so there is no strictness flag.
                    checkTypeOfPipes: true,
                    strictSafeNavigationTypes: strictTemplates,
                    useContextGenericType: strictTemplates,
                    strictLiteralTypes: true,
                    enableTemplateTypeChecker: this.enableTemplateTypeChecker,
                    useInlineTypeConstructors: useInlineTypeConstructors,
                    // Warnings for suboptimal type inference are only enabled if in Language Service mode
                    // (providing the full TemplateTypeChecker API) and if strict mode is not enabled. In strict
                    // mode, the user is in full control of type inference.
                    suggestionsForSuboptimalTypeInference: this.enableTemplateTypeChecker && !strictTemplates,
                };
            }
            else {
                typeCheckingConfig = {
                    applyTemplateContextGuards: false,
                    checkQueries: false,
                    checkTemplateBodies: false,
                    // Enable deep schema checking in "basic" template type-checking mode only if Closure
                    // compilation is requested, which is a good proxy for "only in google3".
                    alwaysCheckSchemaInTemplateBodies: this.closureCompilerEnabled,
                    checkTypeOfInputBindings: false,
                    strictNullInputBindings: false,
                    honorAccessModifiersForInputBindings: false,
                    checkTypeOfAttributes: false,
                    checkTypeOfDomBindings: false,
                    checkTypeOfOutputEvents: false,
                    checkTypeOfAnimationEvents: false,
                    checkTypeOfDomEvents: false,
                    checkTypeOfDomReferences: false,
                    checkTypeOfNonDomReferences: false,
                    checkTypeOfPipes: false,
                    strictSafeNavigationTypes: false,
                    useContextGenericType: false,
                    strictLiteralTypes: false,
                    enableTemplateTypeChecker: this.enableTemplateTypeChecker,
                    useInlineTypeConstructors: useInlineTypeConstructors,
                    // In "basic" template type-checking mode, no warnings are produced since most things are
                    // not checked anyways.
                    suggestionsForSuboptimalTypeInference: false,
                };
            }
            // Apply explicitly configured strictness flags on top of the default configuration
            // based on "fullTemplateTypeCheck".
            if (this.options.strictInputTypes !== undefined) {
                typeCheckingConfig.checkTypeOfInputBindings = this.options.strictInputTypes;
                typeCheckingConfig.applyTemplateContextGuards = this.options.strictInputTypes;
            }
            if (this.options.strictInputAccessModifiers !== undefined) {
                typeCheckingConfig.honorAccessModifiersForInputBindings =
                    this.options.strictInputAccessModifiers;
            }
            if (this.options.strictNullInputTypes !== undefined) {
                typeCheckingConfig.strictNullInputBindings = this.options.strictNullInputTypes;
            }
            if (this.options.strictOutputEventTypes !== undefined) {
                typeCheckingConfig.checkTypeOfOutputEvents = this.options.strictOutputEventTypes;
                typeCheckingConfig.checkTypeOfAnimationEvents = this.options.strictOutputEventTypes;
            }
            if (this.options.strictDomEventTypes !== undefined) {
                typeCheckingConfig.checkTypeOfDomEvents = this.options.strictDomEventTypes;
            }
            if (this.options.strictSafeNavigationTypes !== undefined) {
                typeCheckingConfig.strictSafeNavigationTypes = this.options.strictSafeNavigationTypes;
            }
            if (this.options.strictDomLocalRefTypes !== undefined) {
                typeCheckingConfig.checkTypeOfDomReferences = this.options.strictDomLocalRefTypes;
            }
            if (this.options.strictAttributeTypes !== undefined) {
                typeCheckingConfig.checkTypeOfAttributes = this.options.strictAttributeTypes;
            }
            if (this.options.strictContextGenerics !== undefined) {
                typeCheckingConfig.useContextGenericType = this.options.strictContextGenerics;
            }
            if (this.options.strictLiteralTypes !== undefined) {
                typeCheckingConfig.strictLiteralTypes = this.options.strictLiteralTypes;
            }
            return typeCheckingConfig;
        };
        NgCompiler.prototype.getTemplateDiagnostics = function () {
            var e_8, _a;
            var compilation = this.ensureAnalyzed();
            // Get the diagnostics.
            var diagnostics = [];
            try {
                for (var _b = tslib_1.__values(this.inputProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile || this.adapter.isShim(sf)) {
                        continue;
                    }
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(compilation.templateTypeChecker.getDiagnosticsForFile(sf, api_1.OptimizeFor.WholeProgram))));
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            var program = this.programDriver.getProgram();
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
            this.currentProgram = program;
            return diagnostics;
        };
        NgCompiler.prototype.getTemplateDiagnosticsForFile = function (sf, optimizeFor) {
            var compilation = this.ensureAnalyzed();
            // Get the diagnostics.
            var diagnostics = [];
            if (!sf.isDeclarationFile && !this.adapter.isShim(sf)) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(compilation.templateTypeChecker.getDiagnosticsForFile(sf, optimizeFor))));
            }
            var program = this.programDriver.getProgram();
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
            this.currentProgram = program;
            return diagnostics;
        };
        NgCompiler.prototype.getNonTemplateDiagnostics = function () {
            var _a;
            if (this.nonTemplateDiagnostics === null) {
                var compilation = this.ensureAnalyzed();
                this.nonTemplateDiagnostics = tslib_1.__spreadArray([], tslib_1.__read(compilation.traitCompiler.diagnostics));
                if (this.entryPoint !== null && compilation.exportReferenceGraph !== null) {
                    (_a = this.nonTemplateDiagnostics).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(entry_point_1.checkForPrivateExports(this.entryPoint, this.inputProgram.getTypeChecker(), compilation.exportReferenceGraph))));
                }
            }
            return this.nonTemplateDiagnostics;
        };
        /**
         * Calls the `extendedTemplateCheck` phase of the trait compiler
         * @param sf optional parameter to get diagnostics for a certain file
         *     or all files in the program if `sf` is undefined
         * @returns generated extended template diagnostics
         */
        NgCompiler.prototype.getExtendedTemplateDiagnostics = function (sf) {
            var e_9, _a;
            var diagnostics = [];
            var compilation = this.ensureAnalyzed();
            var extendedTemplateChecker = compilation.extendedTemplateChecker;
            if (sf !== undefined) {
                return compilation.traitCompiler.extendedTemplateCheck(sf, extendedTemplateChecker);
            }
            try {
                for (var _b = tslib_1.__values(this.inputProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf_1 = _c.value;
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(compilation.traitCompiler.extendedTemplateCheck(sf_1, extendedTemplateChecker))));
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_9) throw e_9.error; }
            }
            return diagnostics;
        };
        NgCompiler.prototype.makeCompilation = function () {
            var _this = this;
            var checker = this.inputProgram.getTypeChecker();
            var reflector = new reflection_1.TypeScriptReflectionHost(checker);
            // Construct the ReferenceEmitter.
            var refEmitter;
            var aliasingHost = null;
            if (this.adapter.unifiedModulesHost === null || !this.options._useHostForImportGeneration) {
                var localImportStrategy = void 0;
                // The strategy used for local, in-project imports depends on whether TS has been configured
                // with rootDirs. If so, then multiple directories may be mapped in the same "module
                // namespace" and the logic of `LogicalProjectStrategy` is required to generate correct
                // imports which may cross these multiple directories. Otherwise, plain relative imports are
                // sufficient.
                if (this.options.rootDir !== undefined ||
                    (this.options.rootDirs !== undefined && this.options.rootDirs.length > 0)) {
                    // rootDirs logic is in effect - use the `LogicalProjectStrategy` for in-project relative
                    // imports.
                    localImportStrategy = new imports_1.LogicalProjectStrategy(reflector, new file_system_1.LogicalFileSystem(tslib_1.__spreadArray([], tslib_1.__read(this.adapter.rootDirs)), this.adapter));
                }
                else {
                    // Plain relative imports are all that's needed.
                    localImportStrategy = new imports_1.RelativePathStrategy(reflector);
                }
                // The CompilerHost doesn't have fileNameToModuleName, so build an NPM-centric reference
                // resolution strategy.
                refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Next, attempt to use an absolute import.
                    new imports_1.AbsoluteModuleStrategy(this.inputProgram, checker, this.moduleResolver, reflector),
                    // Finally, check if the reference is being written into a file within the project's .ts
                    // sources, and use a relative import if so. If this fails, ReferenceEmitter will throw
                    // an error.
                    localImportStrategy,
                ]);
                // If an entrypoint is present, then all user imports should be directed through the
                // entrypoint and private exports are not needed. The compiler will validate that all publicly
                // visible directives/pipes are importable via this entrypoint.
                if (this.entryPoint === null && this.options.generateDeepReexports === true) {
                    // No entrypoint is present and deep re-exports were requested, so configure the aliasing
                    // system to generate them.
                    aliasingHost = new imports_1.PrivateExportAliasingHost(reflector);
                }
            }
            else {
                // The CompilerHost supports fileNameToModuleName, so use that to emit imports.
                refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Then use aliased references (this is a workaround to StrictDeps checks).
                    new imports_1.AliasStrategy(),
                    // Then use fileNameToModuleName to emit imports.
                    new imports_1.UnifiedModulesStrategy(reflector, this.adapter.unifiedModulesHost),
                ]);
                aliasingHost = new imports_1.UnifiedModulesAliasingHost(this.adapter.unifiedModulesHost);
            }
            var evaluator = new partial_evaluator_1.PartialEvaluator(reflector, checker, this.incrementalCompilation.depGraph);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var localMetaReader = localMetaRegistry;
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, aliasingHost);
            var scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaReader, depScopeReader, refEmitter, aliasingHost);
            var scopeReader = scopeRegistry;
            var semanticDepGraphUpdater = this.incrementalCompilation.semanticDepGraphUpdater;
            var metaRegistry = new metadata_1.CompoundMetadataRegistry([localMetaRegistry, scopeRegistry]);
            var injectableRegistry = new metadata_1.InjectableClassRegistry(reflector);
            var metaReader = new metadata_1.CompoundMetadataReader([localMetaReader, dtsReader]);
            var typeCheckScopeRegistry = new scope_1.TypeCheckScopeRegistry(scopeReader, metaReader);
            // If a flat module entrypoint was specified, then track references via a `ReferenceGraph` in
            // order to produce proper diagnostics for incorrectly exported directives/pipes/etc. If there
            // is no flat module entrypoint then don't pay the cost of tracking references.
            var referencesRegistry;
            var exportReferenceGraph = null;
            if (this.entryPoint !== null) {
                exportReferenceGraph = new entry_point_1.ReferenceGraph();
                referencesRegistry = new ReferenceGraphAdapter(exportReferenceGraph);
            }
            else {
                referencesRegistry = new annotations_1.NoopReferencesRegistry();
            }
            var routeAnalyzer = new routing_1.NgModuleRouteAnalyzer(this.moduleResolver, evaluator);
            var dtsTransforms = new transform_1.DtsTransformRegistry();
            var isCore = isAngularCorePackage(this.inputProgram);
            var resourceRegistry = new metadata_1.ResourceRegistry();
            var compilationMode = this.options.compilationMode === 'partial' ? transform_1.CompilationMode.PARTIAL : transform_1.CompilationMode.FULL;
            // Cycles are handled in full compilation mode by "remote scoping".
            // "Remote scoping" does not work well with tree shaking for libraries.
            // So in partial compilation mode, when building a library, a cycle will cause an error.
            var cycleHandlingStrategy = compilationMode === transform_1.CompilationMode.FULL ?
                0 /* UseRemoteScoping */ :
                1 /* Error */;
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, this.incrementalCompilation.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled, this.delegatingPerfRecorder),
                // TODO(alxhub): understand why the cast here is necessary (something to do with `null`
                // not being assignable to `unknown` when wrapped in `Readonly`).
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, this.closureCompilerEnabled, /** compileUndecoratedClassesWithAngularFeatures */ false, this.delegatingPerfRecorder),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, injectableRegistry, isCore, this.delegatingPerfRecorder),
                new annotations_1.InjectableDecoratorHandler(reflector, isCore, this.options.strictInjectionParameters || false, injectableRegistry, this.delegatingPerfRecorder),
                new annotations_1.NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.adapter.factoryTracker, this.closureCompilerEnabled, injectableRegistry, this.delegatingPerfRecorder, this.options.i18nInLocale),
            ];
            var traitCompiler = new transform_1.TraitCompiler(handlers, reflector, this.delegatingPerfRecorder, this.incrementalCompilation, this.options.compileNonExportedClasses !== false, compilationMode, dtsTransforms, semanticDepGraphUpdater);
            // Template type-checking may use the `ProgramDriver` to produce new `ts.Program`(s). If this
            // happens, they need to be tracked by the `NgCompiler`.
            var notifyingDriver = new NotifyingProgramDriverWrapper(this.programDriver, function (program) {
                _this.incrementalStrategy.setIncrementalState(_this.incrementalCompilation.state, program);
                _this.currentProgram = program;
            });
            var templateTypeChecker = new typecheck_1.TemplateTypeCheckerImpl(this.inputProgram, notifyingDriver, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalCompilation, scopeRegistry, typeCheckScopeRegistry, this.delegatingPerfRecorder);
            var templateChecks = [new invalid_banana_in_box_1.InvalidBananaInBoxCheck()];
            if (this.options.strictNullChecks) {
                templateChecks.push(new nullish_coalescing_not_nullable_1.NullishCoalescingNotNullableCheck());
            }
            var extendedTemplateChecker = new extended_1.ExtendedTemplateCheckerImpl(templateTypeChecker, checker, templateChecks);
            return {
                isCore: isCore,
                traitCompiler: traitCompiler,
                reflector: reflector,
                scopeRegistry: scopeRegistry,
                dtsTransforms: dtsTransforms,
                exportReferenceGraph: exportReferenceGraph,
                routeAnalyzer: routeAnalyzer,
                metaReader: metaReader,
                typeCheckScopeRegistry: typeCheckScopeRegistry,
                aliasingHost: aliasingHost,
                refEmitter: refEmitter,
                templateTypeChecker: templateTypeChecker,
                resourceRegistry: resourceRegistry,
                extendedTemplateChecker: extendedTemplateChecker
            };
        };
        return NgCompiler;
    }());
    exports.NgCompiler = NgCompiler;
    /**
     * Determine if the given `Program` is @angular/core.
     */
    function isAngularCorePackage(program) {
        // Look for its_just_angular.ts somewhere in the program.
        var r3Symbols = getR3SymbolsFile(program);
        if (r3Symbols === null) {
            return false;
        }
        // Look for the constant ITS_JUST_ANGULAR in that file.
        return r3Symbols.statements.some(function (stmt) {
            // The statement must be a variable declaration statement.
            if (!ts.isVariableStatement(stmt)) {
                return false;
            }
            // It must be exported.
            if (stmt.modifiers === undefined ||
                !stmt.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; })) {
                return false;
            }
            // It must declare ITS_JUST_ANGULAR.
            return stmt.declarationList.declarations.some(function (decl) {
                // The declaration must match the name.
                if (!ts.isIdentifier(decl.name) || decl.name.text !== 'ITS_JUST_ANGULAR') {
                    return false;
                }
                // It must initialize the variable to true.
                if (decl.initializer === undefined || decl.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
                    return false;
                }
                // This definition matches.
                return true;
            });
        });
    }
    exports.isAngularCorePackage = isAngularCorePackage;
    /**
     * Find the 'r3_symbols.ts' file in the given `Program`, or return `null` if it wasn't there.
     */
    function getR3SymbolsFile(program) {
        return program.getSourceFiles().find(function (file) { return file.fileName.indexOf('r3_symbols.ts') >= 0; }) || null;
    }
    /**
     * Since "strictTemplates" is a true superset of type checking capabilities compared to
     * "fullTemplateTypeCheck", it is required that the latter is not explicitly disabled if the
     * former is enabled.
     */
    function verifyCompatibleTypeCheckOptions(options) {
        if (options.fullTemplateTypeCheck === false && options.strictTemplates === true) {
            return {
                category: ts.DiagnosticCategory.Error,
                code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK),
                file: undefined,
                start: undefined,
                length: undefined,
                messageText: "Angular compiler option \"strictTemplates\" is enabled, however \"fullTemplateTypeCheck\" is disabled.\n\nHaving the \"strictTemplates\" flag enabled implies that \"fullTemplateTypeCheck\" is also enabled, so\nthe latter can not be explicitly disabled.\n\nOne of the following actions is required:\n1. Remove the \"fullTemplateTypeCheck\" option.\n2. Remove \"strictTemplates\" or set it to 'false'.\n\nMore information about the template type checking compiler options can be found in the documentation:\nhttps://v9.angular.io/guide/template-typecheck#template-type-checking",
            };
        }
        return null;
    }
    var ReferenceGraphAdapter = /** @class */ (function () {
        function ReferenceGraphAdapter(graph) {
            this.graph = graph;
        }
        ReferenceGraphAdapter.prototype.add = function (source) {
            var e_10, _a;
            var references = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                references[_i - 1] = arguments[_i];
            }
            try {
                for (var references_1 = tslib_1.__values(references), references_1_1 = references_1.next(); !references_1_1.done; references_1_1 = references_1.next()) {
                    var node = references_1_1.value.node;
                    var sourceFile = node.getSourceFile();
                    if (sourceFile === undefined) {
                        sourceFile = ts.getOriginalNode(node).getSourceFile();
                    }
                    // Only record local references (not references into .d.ts files).
                    if (sourceFile === undefined || !typescript_1.isDtsPath(sourceFile.fileName)) {
                        this.graph.add(source, node);
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_10) throw e_10.error; }
            }
        };
        return ReferenceGraphAdapter;
    }());
    var NotifyingProgramDriverWrapper = /** @class */ (function () {
        function NotifyingProgramDriverWrapper(delegate, notifyNewProgram) {
            var _a;
            this.delegate = delegate;
            this.notifyNewProgram = notifyNewProgram;
            this.getSourceFileVersion = (_a = this.delegate.getSourceFileVersion) === null || _a === void 0 ? void 0 : _a.bind(this);
        }
        Object.defineProperty(NotifyingProgramDriverWrapper.prototype, "supportsInlineOperations", {
            get: function () {
                return this.delegate.supportsInlineOperations;
            },
            enumerable: false,
            configurable: true
        });
        NotifyingProgramDriverWrapper.prototype.getProgram = function () {
            return this.delegate.getProgram();
        };
        NotifyingProgramDriverWrapper.prototype.updateFiles = function (contents, updateMode) {
            this.delegate.updateFiles(contents, updateMode);
            this.notifyNewProgram(this.delegate.getProgram());
        };
        return NotifyingProgramDriverWrapper;
    }());
    function versionMapFromProgram(program, driver) {
        var e_11, _a;
        if (driver.getSourceFileVersion === undefined) {
            return null;
        }
        var versions = new Map();
        try {
            for (var _b = tslib_1.__values(program.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var possiblyRedirectedSourceFile = _c.value;
                var sf = typescript_1.toUnredirectedSourceFile(possiblyRedirectedSourceFile);
                versions.set(file_system_1.absoluteFromSourceFile(sf), driver.getSourceFileVersion(sf));
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_11) throw e_11.error; }
        }
        return versions;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUFxRztJQUNyRyxtRUFBK1g7SUFDL1gsMkVBQXFHO0lBRXJHLG1FQUFrRjtJQUNsRixxRUFBa087SUFDbE8sdUZBQXlEO0lBQ3pELDZEQUE0RztJQUU1Ryx5RUFBb0c7SUFDcEcscUVBQXFEO0lBQ3JELG1FQUFzRTtJQUN0RSwrREFBbUk7SUFDbkksK0RBQXNEO0lBQ3RELGlFQUFnRDtJQUNoRCx1RUFBZ0w7SUFDaEwsdUVBQXdEO0lBQ3hELHFFQUF5RjtJQUN6RiwrRUFBcUU7SUFFckUseUhBQThGO0lBQzlGLDZJQUFrSDtJQUNsSCxrRkFBc0g7SUEyQnRIOztPQUVHO0lBQ0gsSUFBWSxxQkFJWDtJQUpELFdBQVkscUJBQXFCO1FBQy9CLG1FQUFLLENBQUE7UUFDTCxtR0FBcUIsQ0FBQTtRQUNyQiwrRkFBbUIsQ0FBQTtJQUNyQixDQUFDLEVBSlcscUJBQXFCLEdBQXJCLDZCQUFxQixLQUFyQiw2QkFBcUIsUUFJaEM7SUFnREQ7O09BRUc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsU0FBcUIsRUFBRSxPQUEwQixFQUNqRCx3QkFBa0QsRUFBRSxhQUE0QixFQUNoRixZQUFxQyxFQUFFLHlCQUFrQyxFQUN6RSxlQUF3QjtRQUMxQixPQUFPO1lBQ0wsSUFBSSxFQUFFLHFCQUFxQixDQUFDLEtBQUs7WUFDakMsU0FBUyxXQUFBO1lBQ1QsT0FBTyxTQUFBO1lBQ1Asd0JBQXdCLDBCQUFBO1lBQ3hCLGFBQWEsZUFBQTtZQUNiLHlC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IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIE5vb3BSZWZlcmVuY2VzUmVnaXN0cnksIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uLy4uL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vY3ljbGVzJztcbmltcG9ydCB7Q09NUElMRVJfRVJST1JTX1dJVEhfR1VJREVTLCBFUlJPUl9ERVRBSUxTX1BBR0VfQkFTRV9VUkwsIEVycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y2hlY2tGb3JQcml2YXRlRXhwb3J0cywgUmVmZXJlbmNlR3JhcGh9IGZyb20gJy4uLy4uL2VudHJ5X3BvaW50JztcbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGgsIExvZ2ljYWxGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIEFsaWFzaW5nSG9zdCwgQWxpYXNTdHJhdGVneSwgRGVmYXVsdEltcG9ydFRyYWNrZXIsIEltcG9ydFJld3JpdGVyLCBMb2NhbElkZW50aWZpZXJTdHJhdGVneSwgTG9naWNhbFByb2plY3RTdHJhdGVneSwgTW9kdWxlUmVzb2x2ZXIsIE5vb3BJbXBvcnRSZXdyaXRlciwgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5LCBSZWZlcmVuY2VFbWl0dGVyLCBSZWxhdGl2ZVBhdGhTdHJhdGVneSwgVW5pZmllZE1vZHVsZXNBbGlhc2luZ0hvc3QsIFVuaWZpZWRNb2R1bGVzU3RyYXRlZ3l9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIEluY3JlbWVudGFsQ29tcGlsYXRpb24sIEluY3JlbWVudGFsU3RhdGV9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsJztcbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7Z2VuZXJhdGVBbmFseXNpcywgSW5kZXhlZENvbXBvbmVudCwgSW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q29tcG9uZW50UmVzb3VyY2VzLCBDb21wb3VuZE1ldGFkYXRhUmVhZGVyLCBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnksIERpcmVjdGl2ZU1ldGEsIER0c01ldGFkYXRhUmVhZGVyLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgUGlwZU1ldGEsIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtBY3RpdmVQZXJmUmVjb3JkZXIsIERlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIFBlcmZDaGVja3BvaW50LCBQZXJmRXZlbnQsIFBlcmZQaGFzZX0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0ZpbGVVcGRhdGUsIFByb2dyYW1Ecml2ZXIsIFVwZGF0ZU1vZGV9IGZyb20gJy4uLy4uL3Byb2dyYW1fZHJpdmVyJztcbmltcG9ydCB7RGVjbGFyYXRpb25Ob2RlLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QWRhcHRlclJlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi9yZXNvdXJjZSc7XG5pbXBvcnQge2VudHJ5UG9pbnRLZXlGb3IsIE5nTW9kdWxlUm91dGVBbmFseXplcn0gZnJvbSAnLi4vLi4vcm91dGluZyc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlciwgVHlwZUNoZWNrU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc3dpdGNoJztcbmltcG9ydCB7YWxpYXNUcmFuc2Zvcm1GYWN0b3J5LCBDb21waWxhdGlvbk1vZGUsIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeSwgRGVjb3JhdG9ySGFuZGxlciwgRHRzVHJhbnNmb3JtUmVnaXN0cnksIGl2eVRyYW5zZm9ybUZhY3RvcnksIFRyYWl0Q29tcGlsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlVHlwZUNoZWNrZXJJbXBsfSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuaW1wb3J0IHtPcHRpbWl6ZUZvciwgVGVtcGxhdGVUeXBlQ2hlY2tlciwgVHlwZUNoZWNraW5nQ29uZmlnfSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXJJbXBsfSBmcm9tICcuLi8uLi90eXBlY2hlY2svZXh0ZW5kZWQnO1xuaW1wb3J0IHtFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlciwgVGVtcGxhdGVDaGVja30gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2V4dGVuZGVkL2FwaSc7XG5pbXBvcnQge0ludmFsaWRCYW5hbmFJbkJveENoZWNrfSBmcm9tICcuLi8uLi90eXBlY2hlY2svZXh0ZW5kZWQvY2hlY2tzL2ludmFsaWRfYmFuYW5hX2luX2JveCc7XG5pbXBvcnQge051bGxpc2hDb2FsZXNjaW5nTm90TnVsbGFibGVDaGVja30gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2V4dGVuZGVkL2NoZWNrcy9udWxsaXNoX2NvYWxlc2Npbmdfbm90X251bGxhYmxlJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZSwgdG9VbnJlZGlyZWN0ZWRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7WGkxOG5Db250ZXh0fSBmcm9tICcuLi8uLi94aTE4bic7XG5pbXBvcnQge0xhenlSb3V0ZSwgTmdDb21waWxlckFkYXB0ZXIsIE5nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi9hcGknO1xuXG4vKipcbiAqIFN0YXRlIGluZm9ybWF0aW9uIGFib3V0IGEgY29tcGlsYXRpb24gd2hpY2ggaXMgb25seSBnZW5lcmF0ZWQgb25jZSBzb21lIGRhdGEgaXMgcmVxdWVzdGVkIGZyb21cbiAqIHRoZSBgTmdDb21waWxlcmAgKGZvciBleGFtcGxlLCBieSBjYWxsaW5nIGBnZXREaWFnbm9zdGljc2ApLlxuICovXG5pbnRlcmZhY2UgTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG4gIHJlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0O1xuICBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcjtcbiAgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5O1xuICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5OiBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5O1xuICBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbDtcbiAgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyO1xuICBkdHNUcmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1SZWdpc3RyeTtcbiAgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbDtcbiAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeTtcbiAgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI6IEV4dGVuZGVkVGVtcGxhdGVDaGVja2VyO1xufVxuXG5cblxuLyoqXG4gKiBEaXNjcmltaW5hbnQgdHlwZSBmb3IgYSBgQ29tcGlsYXRpb25UaWNrZXRgLlxuICovXG5leHBvcnQgZW51bSBDb21waWxhdGlvblRpY2tldEtpbmQge1xuICBGcmVzaCxcbiAgSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICBJbmNyZW1lbnRhbFJlc291cmNlLFxufVxuXG4vKipcbiAqIEJlZ2luIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24gb3BlcmF0aW9uIGZyb20gc2NyYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcmVzaENvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoO1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiB0aGF0IGluY29ycG9yYXRlcyBjaGFuZ2VzIHRvIFR5cGVTY3JpcHQgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ7XG4gIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zO1xuICBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcbiAgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbjtcbiAgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcjtcbiAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbjtcbiAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTtcbiAgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz47XG4gIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyO1xufVxuXG4vKipcbiAqIEEgcmVxdWVzdCB0byBiZWdpbiBBbmd1bGFyIGNvbXBpbGF0aW9uLCBlaXRoZXIgc3RhcnRpbmcgZnJvbSBzY3JhdGNoIG9yIGZyb20gYSBrbm93biBwcmlvciBzdGF0ZS5cbiAqXG4gKiBgQ29tcGlsYXRpb25UaWNrZXRgcyBhcmUgdXNlZCB0byBpbml0aWFsaXplIChvciB1cGRhdGUpIGFuIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSwgdGhlIGNvcmUgb2YgdGhlXG4gKiBBbmd1bGFyIGNvbXBpbGVyLiBUaGV5IGFic3RyYWN0IHRoZSBzdGFydGluZyBzdGF0ZSBvZiBjb21waWxhdGlvbiBhbmQgYWxsb3cgYE5nQ29tcGlsZXJgIHRvIGJlXG4gKiBtYW5hZ2VkIGluZGVwZW5kZW50bHkgb2YgYW55IGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGxpZmVjeWNsZS5cbiAqL1xuZXhwb3J0IHR5cGUgQ29tcGlsYXRpb25UaWNrZXQgPSBGcmVzaENvbXBpbGF0aW9uVGlja2V0fEluY3JlbWVudGFsVHlwZVNjcmlwdENvbXBpbGF0aW9uVGlja2V0fFxuICAgIEluY3JlbWVudGFsUmVzb3VyY2VDb21waWxhdGlvblRpY2tldDtcblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGZvciBhIGJyYW5kIG5ldyBjb21waWxhdGlvbiwgdXNpbmcgbm8gcHJpb3Igc3RhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoLFxuICAgIHRzUHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcjogcGVyZlJlY29yZGVyID8/IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBDb21waWxhdGlvblRpY2tldGAgYXMgZWZmaWNpZW50bHkgYXMgcG9zc2libGUsIGJhc2VkIG9uIGEgcHJldmlvdXMgYE5nQ29tcGlsZXJgXG4gKiBpbnN0YW5jZSBhbmQgYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tQ29tcGlsZXJUaWNrZXQoXG4gICAgb2xkQ29tcGlsZXI6IE5nQ29tcGlsZXIsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwpOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGNvbnN0IG9sZFByb2dyYW0gPSBvbGRDb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICBjb25zdCBvbGRTdGF0ZSA9IG9sZENvbXBpbGVyLmluY3JlbWVudGFsU3RyYXRlZ3kuZ2V0SW5jcmVtZW50YWxTdGF0ZShvbGRQcm9ncmFtKTtcbiAgaWYgKG9sZFN0YXRlID09PSBudWxsKSB7XG4gICAgLy8gTm8gaW5jcmVtZW50YWwgc3RlcCBpcyBwb3NzaWJsZSBoZXJlLCBzaW5jZSBubyBJbmNyZW1lbnRhbERyaXZlciB3YXMgZm91bmQgZm9yIHRoZSBvbGRcbiAgICAvLyBwcm9ncmFtLlxuICAgIHJldHVybiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICBuZXdQcm9ncmFtLCBvbGRDb21waWxlci5vcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciwgb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhKTtcbiAgfVxuXG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuXG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcblxuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQsXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICB1c2VQb2lzb25lZERhdGE6IG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSxcbiAgICBvcHRpb25zOiBvbGRDb21waWxlci5vcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBpbmNyZW1lbnRhbENvbXBpbGF0aW9uLFxuICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBkaXJlY3RseSBmcm9tIGFuIG9sZCBgdHMuUHJvZ3JhbWAgYW5kIGFzc29jaWF0ZWQgQW5ndWxhciBjb21waWxhdGlvblxuICogc3RhdGUsIGFsb25nIHdpdGggYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tU3RhdGVUaWNrZXQoXG4gICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkU3RhdGU6IEluY3JlbWVudGFsU3RhdGUsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PEFic29sdXRlRnNQYXRoPixcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcnxudWxsLCBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuLFxuICAgIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbik6IENvbXBpbGF0aW9uVGlja2V0IHtcbiAgaWYgKHBlcmZSZWNvcmRlciA9PT0gbnVsbCkge1xuICAgIHBlcmZSZWNvcmRlciA9IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpO1xuICB9XG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG5ld1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc291cmNlQ2hhbmdlVGlja2V0KGNvbXBpbGVyOiBOZ0NvbXBpbGVyLCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+KTpcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlLFxuICAgIGNvbXBpbGVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyxcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBOb24tdGVtcGxhdGUgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBpdHNlbGYuIERvZXMgbm90IGluY2x1ZGUgdGVtcGxhdGVcbiAgICogZGlhZ25vc3RpY3MgYmVjYXVzZSB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2VyIG1lbW9pemVzIHRoZW0gaXRzZWxmLlxuICAgKlxuICAgKiBUaGlzIGlzIHNldCBieSAoYW5kIG1lbW9pemVzKSBgZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljc2AuXG4gICAqL1xuICBwcml2YXRlIG5vblRlbXBsYXRlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgY3VycmVudFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+O1xuICByZWFkb25seSBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT47XG5cbiAgLyoqXG4gICAqIGBOZ0NvbXBpbGVyYCBjYW4gYmUgcmV1c2VkIGZvciBtdWx0aXBsZSBjb21waWxhdGlvbnMgKGZvciByZXNvdXJjZS1vbmx5IGNoYW5nZXMpLCBhbmQgZWFjaFxuICAgKiBuZXcgY29tcGlsYXRpb24gdXNlcyBhIGZyZXNoIGBQZXJmUmVjb3JkZXJgLiBUaHVzLCBjbGFzc2VzIGNyZWF0ZWQgd2l0aCBhIGxpZmVzcGFuIG9mIHRoZVxuICAgKiBgTmdDb21waWxlcmAgdXNlIGEgYERlbGVnYXRpbmdQZXJmUmVjb3JkZXJgIHNvIHRoZSBgUGVyZlJlY29yZGVyYCB0aGV5IHdyaXRlIHRvIGNhbiBiZSB1cGRhdGVkXG4gICAqIHdpdGggZWFjaCBmcmVzaCBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZGVsZWdhdGluZ1BlcmZSZWNvcmRlciA9IG5ldyBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyKHRoaXMucGVyZlJlY29yZGVyKTtcblxuICAvKipcbiAgICogQ29udmVydCBhIGBDb21waWxhdGlvblRpY2tldGAgaW50byBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UgZm9yIHRoZSByZXF1ZXN0ZWQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgbmF0dXJlIG9mIHRoZSBjb21waWxhdGlvbiByZXF1ZXN0LCB0aGUgYE5nQ29tcGlsZXJgIGluc3RhbmNlIG1heSBiZSByZXVzZWRcbiAgICogZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGFuZCB1cGRhdGVkIHdpdGggYW55IGNoYW5nZXMsIGl0IG1heSBiZSBhIG5ldyBpbnN0YW5jZSB3aGljaFxuICAgKiBpbmNyZW1lbnRhbGx5IHJldXNlcyBzdGF0ZSBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24sIG9yIGl0IG1heSByZXByZXNlbnQgYSBmcmVzaFxuICAgKiBjb21waWxhdGlvbiBlbnRpcmVseS5cbiAgICovXG4gIHN0YXRpYyBmcm9tVGlja2V0KHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQsIGFkYXB0ZXI6IE5nQ29tcGlsZXJBZGFwdGVyKSB7XG4gICAgc3dpdGNoICh0aWNrZXQua2luZCkge1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuRnJlc2g6XG4gICAgICAgIHJldHVybiBuZXcgTmdDb21waWxlcihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICB0aWNrZXQub3B0aW9ucyxcbiAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmZyZXNoKFxuICAgICAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sIHZlcnNpb25NYXBGcm9tUHJvZ3JhbSh0aWNrZXQudHNQcm9ncmFtLCB0aWNrZXQucHJvZ3JhbURyaXZlcikpLFxuICAgICAgICAgICAgdGlja2V0LmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgICAgICB0aWNrZXQudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgICAgdGlja2V0LnBlcmZSZWNvcmRlcixcbiAgICAgICAgKTtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdDpcbiAgICAgICAgcmV0dXJuIG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgIHRpY2tldC5vcHRpb25zLFxuICAgICAgICAgICAgdGlja2V0Lm5ld1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgICAgICAgIHRpY2tldC5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICAgICAgdGlja2V0LnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICAgIHRpY2tldC5wZXJmUmVjb3JkZXIsXG4gICAgICAgICk7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlOlxuICAgICAgICBjb25zdCBjb21waWxlciA9IHRpY2tldC5jb21waWxlcjtcbiAgICAgICAgY29tcGlsZXIudXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXModGlja2V0Lm1vZGlmaWVkUmVzb3VyY2VGaWxlcywgdGlja2V0LnBlcmZSZWNvcmRlcik7XG4gICAgICAgIHJldHVybiBjb21waWxlcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcixcbiAgICAgIHJlYWRvbmx5IG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBpbnB1dFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICByZWFkb25seSBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgIHJlYWRvbmx5IGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgICByZWFkb25seSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGxpdmVQZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcixcbiAgKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5fZXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzID09PSB0cnVlICYmXG4gICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXMgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1RoZSBcXCdfZXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzXFwnIG9wdGlvbiByZXF1aXJlcyBcXCdzdHJpY3RUZW1wbGF0ZXNcXCcgdG8gYWxzbyBiZSBlbmFibGVkLicpO1xuICAgIH1cblxuICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmFkYXB0ZXIuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MpO1xuICAgIGNvbnN0IGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljID0gdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICBpZiAoaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGlucHV0UHJvZ3JhbTtcbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIXRoaXMub3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcblxuICAgIHRoaXMuZW50cnlQb2ludCA9XG4gICAgICAgIGFkYXB0ZXIuZW50cnlQb2ludCAhPT0gbnVsbCA/IGdldFNvdXJjZUZpbGVPck51bGwoaW5wdXRQcm9ncmFtLCBhZGFwdGVyLmVudHJ5UG9pbnQpIDogbnVsbDtcblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdXRpb25DYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShcbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAgICAgLy8gZG9lbid0IHJldGFpbiBhIHJlZmVyZW5jZSB0byBgdGhpc2AsIGlmIG90aGVyIGNsb3N1cmVzIGluIHRoZSBjb25zdHJ1Y3RvciBoZXJlIHJlZmVyZW5jZVxuICAgICAgICAvLyBgdGhpc2AgaW50ZXJuYWxseSB0aGVuIGEgY2xvc3VyZSBjcmVhdGVkIGhlcmUgd291bGQgcmV0YWluIHRoZW0uIFRoaXMgY2FuIGNhdXNlIG1ham9yXG4gICAgICAgIC8vIG1lbW9yeSBsZWFrIGlzc3VlcyBzaW5jZSB0aGUgYG1vZHVsZVJlc29sdXRpb25DYWNoZWAgaXMgYSBsb25nLWxpdmVkIG9iamVjdCBhbmQgZmluZHMgaXRzXG4gICAgICAgIC8vIHdheSBpbnRvIGFsbCBraW5kcyBvZiBwbGFjZXMgaW5zaWRlIFRTIGludGVybmFsIG9iamVjdHMuXG4gICAgICAgIHRoaXMuYWRhcHRlci5nZXRDYW5vbmljYWxGaWxlTmFtZS5iaW5kKHRoaXMuYWRhcHRlcikpO1xuICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIgPVxuICAgICAgICBuZXcgTW9kdWxlUmVzb2x2ZXIoaW5wdXRQcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgICB0aGlzLnJlc291cmNlTWFuYWdlciA9IG5ldyBBZGFwdGVyUmVzb3VyY2VMb2FkZXIoYWRhcHRlciwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihcbiAgICAgICAgbmV3IEltcG9ydEdyYXBoKGlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIGlucHV0UHJvZ3JhbSk7XG5cbiAgICB0aGlzLmlnbm9yZUZvckRpYWdub3N0aWNzID1cbiAgICAgICAgbmV3IFNldChpbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpKTtcbiAgICB0aGlzLmlnbm9yZUZvckVtaXQgPSB0aGlzLmFkYXB0ZXIuaWdub3JlRm9yRW1pdDtcblxuICAgIGxldCBkdHNGaWxlQ291bnQgPSAwO1xuICAgIGxldCBub25EdHNGaWxlQ291bnQgPSAwO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkdHNGaWxlQ291bnQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vbkR0c0ZpbGVDb3VudCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxpdmVQZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuSW5wdXREdHNGaWxlLCBkdHNGaWxlQ291bnQpO1xuICAgIGxpdmVQZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuSW5wdXRUc0ZpbGUsIG5vbkR0c0ZpbGVDb3VudCk7XG4gIH1cblxuICBnZXQgcGVyZlJlY29yZGVyKCk6IEFjdGl2ZVBlcmZSZWNvcmRlciB7XG4gICAgcmV0dXJuIHRoaXMubGl2ZVBlcmZSZWNvcmRlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHBvc2VzIHRoZSBgSW5jcmVtZW50YWxDb21waWxhdGlvbmAgdW5kZXIgYW4gb2xkIHByb3BlcnR5IG5hbWUgdGhhdCB0aGUgQ0xJIHVzZXMsIGF2b2lkaW5nIGFcbiAgICogY2hpY2tlbi1hbmQtZWdnIHByb2JsZW0gd2l0aCB0aGUgcmVuYW1lIHRvIGBpbmNyZW1lbnRhbENvbXBpbGF0aW9uYC5cbiAgICpcbiAgICogVE9ETyhhbHhodWIpOiByZW1vdmUgd2hlbiB0aGUgQ0xJIHVzZXMgdGhlIG5ldyBuYW1lLlxuICAgKi9cbiAgZ2V0IGluY3JlbWVudGFsRHJpdmVyKCk6IEluY3JlbWVudGFsQ29tcGlsYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb247XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKFxuICAgICAgY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyKTogdm9pZCB7XG4gICAgdGhpcy5saXZlUGVyZlJlY29yZGVyID0gcGVyZlJlY29yZGVyO1xuICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlci50YXJnZXQgPSBwZXJmUmVjb3JkZXI7XG5cbiAgICBwZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb3VyY2VVcGRhdGUsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuYWx5c2lzIGhhc24ndCBoYXBwZW5lZCB5ZXQsIHNvIG5vIHVwZGF0ZSBpcyBuZWNlc3NhcnkgLSBhbnkgY2hhbmdlcyB0byByZXNvdXJjZXMgd2lsbFxuICAgICAgICAvLyBiZSBjYXB0dXJlZCBieSB0aGUgaW5pdGFsIGFuYWx5c2lzIHBhc3MgaXRzZWxmLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLmludmFsaWRhdGUoKTtcblxuICAgICAgY29uc3QgY2xhc3Nlc1RvVXBkYXRlID0gbmV3IFNldDxEZWNsYXJhdGlvbk5vZGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHJlc291cmNlRmlsZSBvZiBjaGFuZ2VkUmVzb3VyY2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVDbGFzcyBvZiB0aGlzLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHJlc291cmNlRmlsZSkpIHtcbiAgICAgICAgICBjbGFzc2VzVG9VcGRhdGUuYWRkKHRlbXBsYXRlQ2xhc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzdHlsZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQoc3R5bGVDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBjbGF6eiBvZiBjbGFzc2VzVG9VcGRhdGUpIHtcbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLnVwZGF0ZVJlc291cmNlcyhjbGF6eik7XG4gICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmludmFsaWRhdGVDbGFzcyhjbGF6eik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBkZXBlbmRlbmNpZXMgb2YgYSBmaWxlLlxuICAgKlxuICAgKiBJZiB0aGUgZmlsZSBpcyBub3QgcGFydCBvZiB0aGUgY29tcGlsYXRpb24sIGFuIGVtcHR5IGFycmF5IHdpbGwgYmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nW10ge1xuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGguZ2V0UmVzb3VyY2VEZXBlbmRlbmNpZXMoZmlsZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBnZXREaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5fZXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuZ2V0RXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgQW5ndWxhci1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBJZiBhIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXNzZWQsIG9ubHkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGF0IGZpbGUgYXJlIHJldHVybmVkLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKGZpbGU6IHRzLlNvdXJjZUZpbGUsIG9wdGltaXplRm9yOiBPcHRpbWl6ZUZvcik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIC4uLnRoaXMuZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpLmZpbHRlcihkaWFnID0+IGRpYWcuZmlsZSA9PT0gZmlsZSksXG4gICAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljc0ZvckZpbGUoZmlsZSwgb3B0aW1pemVGb3IpKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLl9leHRlbmRlZFRlbXBsYXRlRGlhZ25vc3RpY3MpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy5nZXRFeHRlbmRlZFRlbXBsYXRlRGlhZ25vc3RpY3MoZmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgYHRzLkRpYWdub3N0aWNgcyBjdXJyZW50bHkgYXZhaWxhYmxlIHRoYXQgcGVydGFpbiB0byB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCB0dGMgPSBjb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQpKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLl9leHRlbmRlZFRlbXBsYXRlRGlhZ25vc3RpY3MpIHtcbiAgICAgIGNvbnN0IGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyID0gY29tcGlsYXRpb24uZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmV4dGVuZGVkVGVtcGxhdGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBBbmd1bGFyLmlvIGVycm9yIGd1aWRlIGxpbmtzIHRvIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzLm1hcChkaWFnID0+IHtcbiAgICAgIGlmIChkaWFnLmNvZGUgJiYgQ09NUElMRVJfRVJST1JTX1dJVEhfR1VJREVTLmhhcyhuZ0Vycm9yQ29kZShkaWFnLmNvZGUpKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLmRpYWcsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGRpYWcubWVzc2FnZVRleHQgK1xuICAgICAgICAgICAgICBgLiBGaW5kIG1vcmUgYXQgJHtFUlJPUl9ERVRBSUxTX1BBR0VfQkFTRV9VUkx9L05HJHtuZ0Vycm9yQ29kZShkaWFnLmNvZGUpfWBcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkaWFnO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgc2V0dXAtcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIGdldE9wdGlvbkRpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3M7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjdXJyZW50IGB0cy5Qcm9ncmFtYCBrbm93biB0byB0aGlzIGBOZ0NvbXBpbGVyYC5cbiAgICpcbiAgICogQ29tcGlsYXRpb24gYmVnaW5zIHdpdGggYW4gaW5wdXQgYHRzLlByb2dyYW1gLCBhbmQgZHVyaW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgb3BlcmF0aW9ucyBuZXdcbiAgICogYHRzLlByb2dyYW1gcyBtYXkgYmUgcHJvZHVjZWQgdXNpbmcgdGhlIGBQcm9ncmFtRHJpdmVyYC4gVGhlIG1vc3QgcmVjZW50IHN1Y2ggYHRzLlByb2dyYW1gIHRvXG4gICAqIGJlIHByb2R1Y2VkIGlzIGF2YWlsYWJsZSBoZXJlLlxuICAgKlxuICAgKiBUaGlzIGB0cy5Qcm9ncmFtYCBzZXJ2ZXMgdHdvIGtleSBwdXJwb3NlczpcbiAgICpcbiAgICogKiBBcyBhbiBpbmNyZW1lbnRhbCBzdGFydGluZyBwb2ludCBmb3IgY3JlYXRpbmcgdGhlIG5leHQgYHRzLlByb2dyYW1gIGJhc2VkIG9uIGZpbGVzIHRoYXQgdGhlXG4gICAqICAgdXNlciBoYXMgY2hhbmdlZCAoZm9yIGNsaWVudHMgdXNpbmcgdGhlIFRTIGNvbXBpbGVyIHByb2dyYW0gQVBJcykuXG4gICAqXG4gICAqICogQXMgdGhlIFwiYmVmb3JlXCIgcG9pbnQgZm9yIGFuIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGludm9jYXRpb24sIHRvIGRldGVybWluZSB3aGF0J3MgY2hhbmdlZFxuICAgKiAgIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IHByb2dyYW1zIChmb3IgYWxsIGNvbXBpbGF0aW9ucykuXG4gICAqL1xuICBnZXRDdXJyZW50UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UHJvZ3JhbTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTogVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VyYCBkb2VzIG5vdCB3b3JrIHdpdGhvdXQgYGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXJgLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbnN1cmVBbmFseXplZCgpLnRlbXBsYXRlVHlwZUNoZWNrZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBgdHMuRGVjbGFyYXRpb25gcyBmb3IgYW55IGNvbXBvbmVudChzKSB3aGljaCB1c2UgdGhlIGdpdmVuIHRlbXBsYXRlIGZpbGUuXG4gICAqL1xuICBnZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZSh0ZW1wbGF0ZUZpbGVQYXRoOiBzdHJpbmcpOiBSZWFkb25seVNldDxEZWNsYXJhdGlvbk5vZGU+IHtcbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHJlc291cmNlUmVnaXN0cnkuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZShyZXNvbHZlKHRlbXBsYXRlRmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGB0cy5EZWNsYXJhdGlvbmBzIGZvciBhbnkgY29tcG9uZW50KHMpIHdoaWNoIHVzZSB0aGUgZ2l2ZW4gdGVtcGxhdGUgZmlsZS5cbiAgICovXG4gIGdldENvbXBvbmVudHNXaXRoU3R5bGVGaWxlKHN0eWxlRmlsZVBhdGg6IHN0cmluZyk6IFJlYWRvbmx5U2V0PERlY2xhcmF0aW9uTm9kZT4ge1xuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gcmVzb3VyY2VSZWdpc3RyeS5nZXRDb21wb25lbnRzV2l0aFN0eWxlKHJlc29sdmUoc3R5bGVGaWxlUGF0aCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBleHRlcm5hbCByZXNvdXJjZXMgZm9yIHRoZSBnaXZlbiBjb21wb25lbnQuXG4gICAqL1xuICBnZXRDb21wb25lbnRSZXNvdXJjZXMoY2xhc3NEZWNsOiBEZWNsYXJhdGlvbk5vZGUpOiBDb21wb25lbnRSZXNvdXJjZXN8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGFzc0RlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IHN0eWxlcyA9IHJlc291cmNlUmVnaXN0cnkuZ2V0U3R5bGVzKGNsYXNzRGVjbCk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSByZXNvdXJjZVJlZ2lzdHJ5LmdldFRlbXBsYXRlKGNsYXNzRGVjbCk7XG4gICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge3N0eWxlcywgdGVtcGxhdGV9O1xuICB9XG5cbiAgZ2V0TWV0YShjbGFzc0RlY2w6IERlY2xhcmF0aW9uTm9kZSk6IFBpcGVNZXRhfERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGFzc0RlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShjbGFzc0RlY2wpO1xuICAgIGNvbnN0IHttZXRhUmVhZGVyfSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBtZXRhID0gbWV0YVJlYWRlci5nZXRQaXBlTWV0YWRhdGEocmVmKSA/PyBtZXRhUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIEFuZ3VsYXIncyBhbmFseXNpcyBzdGVwIChhcyBhIHByZWN1cnNvciB0byBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGApXG4gICAqIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBOb3JtYWxseSwgdGhpcyBvcGVyYXRpb24gaGFwcGVucyBsYXppbHkgd2hlbmV2ZXIgYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgIGFyZSBjYWxsZWQuXG4gICAqIEhvd2V2ZXIsIGNlcnRhaW4gY29uc3VtZXJzIG1heSB3aXNoIHRvIGFsbG93IGZvciBhbiBhc3luY2hyb25vdXMgcGhhc2Ugb2YgYW5hbHlzaXMsIHdoZXJlXG4gICAqIHJlc291cmNlcyBzdWNoIGFzIGBzdHlsZVVybHNgIGFyZSByZXNvbHZlZCBhc3luY2hvbm91c2x5LiBJbiB0aGVzZSBjYXNlcyBgYW5hbHl6ZUFzeW5jYCBtdXN0IGJlXG4gICAqIGNhbGxlZCBmaXJzdCwgYW5kIGl0cyBgUHJvbWlzZWAgYXdhaXRlZCBwcmlvciB0byBjYWxsaW5nIGFueSBvdGhlciBBUElzIG9mIGBOZ0NvbXBpbGVyYC5cbiAgICovXG4gIGFzeW5jIGFuYWx5emVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcblxuICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplQXN5bmMoc2YpO1xuICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGFuYWx5c2lzUHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuICAgICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGxhenkgcm91dGVzIGRldGVjdGVkIGR1cmluZyBhbmFseXNpcy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgY2FsbGVkIGZvciBvbmUgc3BlY2lmaWMgcm91dGUsIG9yIHRvIHJldHJpZXZlIGFsbCB0b3AtbGV2ZWwgcm91dGVzLlxuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gaHR0czovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtcbiAgICAgICAgICAgIGVudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gY29tcGlsYXRpb24ucm91dGVBbmFseXplci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0cmFuc2Zvcm1lcnMgYW5kIG90aGVyIGluZm9ybWF0aW9uIHdoaWNoIGlzIG5lY2Vzc2FyeSBmb3IgYSBjb25zdW1lciB0byBgZW1pdGAgdGhlXG4gICAqIHByb2dyYW0gd2l0aCBBbmd1bGFyLWFkZGVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJlcGFyZUVtaXQoKToge1xuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICB9IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IGNvbXBpbGF0aW9uLmlzQ29yZSA/IGdldFIzU3ltYm9sc0ZpbGUodGhpcy5pbnB1dFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyO1xuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwpIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG5cbiAgICBjb25zdCBiZWZvcmUgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIsIGNvbXBpbGF0aW9uLnJlZmxlY3RvciwgaW1wb3J0UmV3cml0ZXIsIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgY29tcGlsYXRpb24uaXNDb3JlLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cyksXG4gICAgICBkZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuXG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gW107XG4gICAgaWYgKGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMgIT09IG51bGwpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goXG4gICAgICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMsIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAoY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdC5hbGlhc0V4cG9ydHNJbkR0cykge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIuc291cmNlSW5mbywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgYmVmb3JlLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcblxuICAgIHJldHVybiB7dHJhbnNmb3JtZXJzOiB7YmVmb3JlLCBhZnRlckRlY2xhcmF0aW9uc30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGluZGV4aW5nIHByb2Nlc3MgYW5kIHJldHVybiBhIGBNYXBgIG9mIGFsbCBpbmRleGVkIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFNlZSB0aGUgYGluZGV4aW5nYCBwYWNrYWdlIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCBJbmRleGVkQ29tcG9uZW50PiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBJbmRleGluZ0NvbnRleHQoKTtcbiAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmluZGV4KGNvbnRleHQpO1xuICAgIHJldHVybiBnZW5lcmF0ZUFuYWx5c2lzKGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgaTE4biBtZXNzYWdlcyBpbnRvIHRoZSBgWGkxOG5Db250ZXh0YC5cbiAgICovXG4gIHhpMThuKGN0eDogWGkxOG5Db250ZXh0KTogdm9pZCB7XG4gICAgLy8gTm90ZSB0aGF0IHRoZSAncmVzb2x2ZScgcGhhc2UgaXMgbm90IHN0cmljdGx5IG5lY2Vzc2FyeSBmb3IgeGkxOG4sIGJ1dCB0aGlzIGlzIG5vdCBjdXJyZW50bHlcbiAgICAvLyBvcHRpbWl6ZWQuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlci54aTE4bihjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCh0aGlzOiBOZ0NvbXBpbGVyKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICB0aGlzLmFuYWx5emVTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGF0aW9uITtcbiAgfVxuXG4gIHByaXZhdGUgYW5hbHl6ZVN5bmMoKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuQW5hbHlzaXMsICgpID0+IHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplU3luYyhzZik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5BbmFseXNpcyk7XG5cbiAgICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbih0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb2x2ZSwgKCkgPT4ge1xuICAgICAgdHJhaXRDb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIGFuYWx5c2lzIGlzIGNvbXBsZXRlIGFuZCB0aGUgY29tcGlsZXIgY2FuIG5vdyBjYWxjdWxhdGUgd2hpY2ggZmlsZXMgbmVlZCB0b1xuICAgICAgLy8gYmUgZW1pdHRlZCwgc28gZG8gdGhhdC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5yZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXModHJhaXRDb21waWxlcik7XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5SZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGZ1bGxUZW1wbGF0ZVR5cGVDaGVjaygpOiBib29sZWFuIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIHN0cmljdG5lc3MgbGV2ZWwgb2YgdHlwZSBjaGVja2luZyBiYXNlZCBvbiBjb21waWxlciBvcHRpb25zLiBBc1xuICAgIC8vIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGEgc3VwZXJzZXQgb2YgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2AsIHRoZSBmb3JtZXIgaW1wbGllcyB0aGUgbGF0dGVyLlxuICAgIC8vIEFsc28gc2VlIGB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc2Agd2hlcmUgaXQgaXMgdmVyaWZpZWQgdGhhdCBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYFxuICAgIC8vIGlzIG5vdCBkaXNhYmxlZCB3aGVuIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuICAgIHJldHVybiBzdHJpY3RUZW1wbGF0ZXMgfHwgISF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlQ2hlY2tpbmdDb25maWcoKTogVHlwZUNoZWNraW5nQ29uZmlnIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIHN0cmljdG5lc3MgbGV2ZWwgb2YgdHlwZSBjaGVja2luZyBiYXNlZCBvbiBjb21waWxlciBvcHRpb25zLiBBc1xuICAgIC8vIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGEgc3VwZXJzZXQgb2YgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2AsIHRoZSBmb3JtZXIgaW1wbGllcyB0aGUgbGF0dGVyLlxuICAgIC8vIEFsc28gc2VlIGB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc2Agd2hlcmUgaXQgaXMgdmVyaWZpZWQgdGhhdCBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYFxuICAgIC8vIGlzIG5vdCBkaXNhYmxlZCB3aGVuIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuXG4gICAgY29uc3QgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyA9IHRoaXMucHJvZ3JhbURyaXZlci5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnM7XG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiB0cnVlLFxuICAgICAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgIHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMsXG4gICAgICAgIC8vIFdhcm5pbmdzIGZvciBzdWJvcHRpbWFsIHR5cGUgaW5mZXJlbmNlIGFyZSBvbmx5IGVuYWJsZWQgaWYgaW4gTGFuZ3VhZ2UgU2VydmljZSBtb2RlXG4gICAgICAgIC8vIChwcm92aWRpbmcgdGhlIGZ1bGwgVGVtcGxhdGVUeXBlQ2hlY2tlciBBUEkpIGFuZCBpZiBzdHJpY3QgbW9kZSBpcyBub3QgZW5hYmxlZC4gSW4gc3RyaWN0XG4gICAgICAgIC8vIG1vZGUsIHRoZSB1c2VyIGlzIGluIGZ1bGwgY29udHJvbCBvZiB0eXBlIGluZmVyZW5jZS5cbiAgICAgICAgc3VnZ2VzdGlvbnNGb3JTdWJvcHRpbWFsVHlwZUluZmVyZW5jZTogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyICYmICFzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogZmFsc2UsXG4gICAgICAgIC8vIEVuYWJsZSBkZWVwIHNjaGVtYSBjaGVja2luZyBpbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlIG9ubHkgaWYgQ2xvc3VyZVxuICAgICAgICAvLyBjb21waWxhdGlvbiBpcyByZXF1ZXN0ZWQsIHdoaWNoIGlzIGEgZ29vZCBwcm94eSBmb3IgXCJvbmx5IGluIGdvb2dsZTNcIi5cbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IGZhbHNlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBmYWxzZSxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzLFxuICAgICAgICAvLyBJbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBubyB3YXJuaW5ncyBhcmUgcHJvZHVjZWQgc2luY2UgbW9zdCB0aGluZ3MgYXJlXG4gICAgICAgIC8vIG5vdCBjaGVja2VkIGFueXdheXMuXG4gICAgICAgIHN1Z2dlc3Rpb25zRm9yU3Vib3B0aW1hbFR5cGVJbmZlcmVuY2U6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBleHBsaWNpdGx5IGNvbmZpZ3VyZWQgc3RyaWN0bmVzcyBmbGFncyBvbiB0b3Agb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIC8vIGJhc2VkIG9uIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgPVxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPSB0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcztcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZUNoZWNraW5nQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4uY29tcGlsYXRpb24udGVtcGxhdGVUeXBlQ2hlY2tlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc2YsIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgcHJvZ3JhbSk7XG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICF0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZiwgb3B0aW1pemVGb3IpKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIHByb2dyYW0pO1xuICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgaWYgKHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgICB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3MgPSBbLi4uY29tcGlsYXRpb24udHJhaXRDb21waWxlci5kaWFnbm9zdGljc107XG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMuaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3M7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgdGhlIGBleHRlbmRlZFRlbXBsYXRlQ2hlY2tgIHBoYXNlIG9mIHRoZSB0cmFpdCBjb21waWxlclxuICAgKiBAcGFyYW0gc2Ygb3B0aW9uYWwgcGFyYW1ldGVyIHRvIGdldCBkaWFnbm9zdGljcyBmb3IgYSBjZXJ0YWluIGZpbGVcbiAgICogICAgIG9yIGFsbCBmaWxlcyBpbiB0aGUgcHJvZ3JhbSBpZiBgc2ZgIGlzIHVuZGVmaW5lZFxuICAgKiBAcmV0dXJucyBnZW5lcmF0ZWQgZXh0ZW5kZWQgdGVtcGxhdGUgZGlhZ25vc3RpY3NcbiAgICovXG4gIHByaXZhdGUgZ2V0RXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzKHNmPzogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyID0gY29tcGlsYXRpb24uZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI7XG4gICAgaWYgKHNmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4dGVuZGVkVGVtcGxhdGVDaGVjayhzZiwgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXIpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4uY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHRlbmRlZFRlbXBsYXRlQ2hlY2soc2YsIGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgcmVmbGVjdG9yID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdChjaGVja2VyKTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgUmVmZXJlbmNlRW1pdHRlci5cbiAgICBsZXQgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgICBsZXQgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QgPT09IG51bGwgfHwgIXRoaXMub3B0aW9ucy5fdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24pIHtcbiAgICAgIGxldCBsb2NhbEltcG9ydFN0cmF0ZWd5OiBSZWZlcmVuY2VFbWl0U3RyYXRlZ3k7XG5cbiAgICAgIC8vIFRoZSBzdHJhdGVneSB1c2VkIGZvciBsb2NhbCwgaW4tcHJvamVjdCBpbXBvcnRzIGRlcGVuZHMgb24gd2hldGhlciBUUyBoYXMgYmVlbiBjb25maWd1cmVkXG4gICAgICAvLyB3aXRoIHJvb3REaXJzLiBJZiBzbywgdGhlbiBtdWx0aXBsZSBkaXJlY3RvcmllcyBtYXkgYmUgbWFwcGVkIGluIHRoZSBzYW1lIFwibW9kdWxlXG4gICAgICAvLyBuYW1lc3BhY2VcIiBhbmQgdGhlIGxvZ2ljIG9mIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBpcyByZXF1aXJlZCB0byBnZW5lcmF0ZSBjb3JyZWN0XG4gICAgICAvLyBpbXBvcnRzIHdoaWNoIG1heSBjcm9zcyB0aGVzZSBtdWx0aXBsZSBkaXJlY3Rvcmllcy4gT3RoZXJ3aXNlLCBwbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZVxuICAgICAgLy8gc3VmZmljaWVudC5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHRoaXMub3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkICYmIHRoaXMub3B0aW9ucy5yb290RGlycy5sZW5ndGggPiAwKSkge1xuICAgICAgICAvLyByb290RGlycyBsb2dpYyBpcyBpbiBlZmZlY3QgLSB1c2UgdGhlIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBmb3IgaW4tcHJvamVjdCByZWxhdGl2ZVxuICAgICAgICAvLyBpbXBvcnRzLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3koXG4gICAgICAgICAgICByZWZsZWN0b3IsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbShbLi4udGhpcy5hZGFwdGVyLnJvb3REaXJzXSwgdGhpcy5hZGFwdGVyKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZSBhbGwgdGhhdCdzIG5lZWRlZC5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9IG5ldyBSZWxhdGl2ZVBhdGhTdHJhdGVneShyZWZsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IGRvZXNuJ3QgaGF2ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gYnVpbGQgYW4gTlBNLWNlbnRyaWMgcmVmZXJlbmNlXG4gICAgICAvLyByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSh0aGlzLmlucHV0UHJvZ3JhbSwgY2hlY2tlciwgdGhpcy5tb2R1bGVSZXNvbHZlciwgcmVmbGVjdG9yKSxcbiAgICAgICAgLy8gRmluYWxseSwgY2hlY2sgaWYgdGhlIHJlZmVyZW5jZSBpcyBiZWluZyB3cml0dGVuIGludG8gYSBmaWxlIHdpdGhpbiB0aGUgcHJvamVjdCdzIC50c1xuICAgICAgICAvLyBzb3VyY2VzLCBhbmQgdXNlIGEgcmVsYXRpdmUgaW1wb3J0IGlmIHNvLiBJZiB0aGlzIGZhaWxzLCBSZWZlcmVuY2VFbWl0dGVyIHdpbGwgdGhyb3dcbiAgICAgICAgLy8gYW4gZXJyb3IuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3ksXG4gICAgICBdKTtcblxuICAgICAgLy8gSWYgYW4gZW50cnlwb2ludCBpcyBwcmVzZW50LCB0aGVuIGFsbCB1c2VyIGltcG9ydHMgc2hvdWxkIGJlIGRpcmVjdGVkIHRocm91Z2ggdGhlXG4gICAgICAvLyBlbnRyeXBvaW50IGFuZCBwcml2YXRlIGV4cG9ydHMgYXJlIG5vdCBuZWVkZWQuIFRoZSBjb21waWxlciB3aWxsIHZhbGlkYXRlIHRoYXQgYWxsIHB1YmxpY2x5XG4gICAgICAvLyB2aXNpYmxlIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIGltcG9ydGFibGUgdmlhIHRoaXMgZW50cnlwb2ludC5cbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgPT09IG51bGwgJiYgdGhpcy5vcHRpb25zLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBObyBlbnRyeXBvaW50IGlzIHByZXNlbnQgYW5kIGRlZXAgcmUtZXhwb3J0cyB3ZXJlIHJlcXVlc3RlZCwgc28gY29uZmlndXJlIHRoZSBhbGlhc2luZ1xuICAgICAgICAvLyBzeXN0ZW0gdG8gZ2VuZXJhdGUgdGhlbS5cbiAgICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QocmVmbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgYWxpYXNlZCByZWZlcmVuY2VzICh0aGlzIGlzIGEgd29ya2Fyb3VuZCB0byBTdHJpY3REZXBzIGNoZWNrcykuXG4gICAgICAgIG5ldyBBbGlhc1N0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgICAgbmV3IFVuaWZpZWRNb2R1bGVzU3RyYXRlZ3kocmVmbGVjdG9yLCB0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0KSxcbiAgICAgIF0pO1xuICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0KHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpO1xuICAgIH1cblxuICAgIGNvbnN0IGV2YWx1YXRvciA9XG4gICAgICAgIG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHJlZmxlY3RvciwgY2hlY2tlciwgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLmRlcEdyYXBoKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgcmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyID0gbG9jYWxNZXRhUmVnaXN0cnk7XG4gICAgY29uc3QgZGVwU2NvcGVSZWFkZXIgPSBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKGR0c1JlYWRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCByZWZFbWl0dGVyLCBhbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciA9IHNjb3BlUmVnaXN0cnk7XG4gICAgY29uc3Qgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgPSB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnldKTtcbiAgICBjb25zdCBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkocmVmbGVjdG9yKTtcblxuICAgIGNvbnN0IG1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbbG9jYWxNZXRhUmVhZGVyLCBkdHNSZWFkZXJdKTtcbiAgICBjb25zdCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID0gbmV3IFR5cGVDaGVja1Njb3BlUmVnaXN0cnkoc2NvcGVSZWFkZXIsIG1ldGFSZWFkZXIpO1xuXG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGAgaW5cbiAgICAvLyBvcmRlciB0byBwcm9kdWNlIHByb3BlciBkaWFnbm9zdGljcyBmb3IgaW5jb3JyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy9ldGMuIElmIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBsZXQgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKGV4cG9ydFJlZmVyZW5jZUdyYXBoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5vb3BSZWZlcmVuY2VzUmVnaXN0cnkoKTtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZUFuYWx5emVyID0gbmV3IE5nTW9kdWxlUm91dGVBbmFseXplcih0aGlzLm1vZHVsZVJlc29sdmVyLCBldmFsdWF0b3IpO1xuXG4gICAgY29uc3QgZHRzVHJhbnNmb3JtcyA9IG5ldyBEdHNUcmFuc2Zvcm1SZWdpc3RyeSgpO1xuXG4gICAgY29uc3QgaXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy5pbnB1dFByb2dyYW0pO1xuXG4gICAgY29uc3QgcmVzb3VyY2VSZWdpc3RyeSA9IG5ldyBSZXNvdXJjZVJlZ2lzdHJ5KCk7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbk1vZGUgPVxuICAgICAgICB0aGlzLm9wdGlvbnMuY29tcGlsYXRpb25Nb2RlID09PSAncGFydGlhbCcgPyBDb21waWxhdGlvbk1vZGUuUEFSVElBTCA6IENvbXBpbGF0aW9uTW9kZS5GVUxMO1xuXG4gICAgLy8gQ3ljbGVzIGFyZSBoYW5kbGVkIGluIGZ1bGwgY29tcGlsYXRpb24gbW9kZSBieSBcInJlbW90ZSBzY29waW5nXCIuXG4gICAgLy8gXCJSZW1vdGUgc2NvcGluZ1wiIGRvZXMgbm90IHdvcmsgd2VsbCB3aXRoIHRyZWUgc2hha2luZyBmb3IgbGlicmFyaWVzLlxuICAgIC8vIFNvIGluIHBhcnRpYWwgY29tcGlsYXRpb24gbW9kZSwgd2hlbiBidWlsZGluZyBhIGxpYnJhcnksIGEgY3ljbGUgd2lsbCBjYXVzZSBhbiBlcnJvci5cbiAgICBjb25zdCBjeWNsZUhhbmRsaW5nU3RyYXRlZ3kgPSBjb21waWxhdGlvbk1vZGUgPT09IENvbXBpbGF0aW9uTW9kZS5GVUxMID9cbiAgICAgICAgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LlVzZVJlbW90ZVNjb3BpbmcgOlxuICAgICAgICBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuRXJyb3I7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+W10gPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLCBzY29wZVJlYWRlciwgc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LCByZXNvdXJjZVJlZ2lzdHJ5LCBpc0NvcmUsIHRoaXMucmVzb3VyY2VNYW5hZ2VyLFxuICAgICAgICAgIHRoaXMuYWRhcHRlci5yb290RGlycywgdGhpcy5vcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMgfHwgZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgIT09IGZhbHNlLCB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCByZWZFbWl0dGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGgsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG5cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogdW5kZXJzdGFuZCB3aHkgdGhlIGNhc3QgaGVyZSBpcyBuZWNlc3NhcnkgKHNvbWV0aGluZyB0byBkbyB3aXRoIGBudWxsYFxuICAgICAgLy8gbm90IGJlaW5nIGFzc2lnbmFibGUgdG8gYHVua25vd25gIHdoZW4gd3JhcHBlZCBpbiBgUmVhZG9ubHlgKS5cbiAgICAgIC8vIGNsYW5nLWZvcm1hdCBvZmZcbiAgICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLFxuICAgICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyLFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCwgLyoqIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzICovIGZhbHNlLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcixcbiAgICAgICAgKSBhcyBSZWFkb25seTxEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sIHwgbnVsbCx1bmtub3duPj4sXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb25cbiAgICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgICAgLy8gYmVmb3JlIGluamVjdGFibGUgZmFjdG9yaWVzIChzbyBpbmplY3RhYmxlIGZhY3RvcmllcyBjYW4gZGVsZWdhdGUgdG8gdGhlbSlcbiAgICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCBpbmplY3RhYmxlUmVnaXN0cnksIGlzQ29yZSxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgaXNDb3JlLCB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSwgaW5qZWN0YWJsZVJlZ2lzdHJ5LFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHJlZmVyZW5jZXNSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHJvdXRlQW5hbHl6ZXIsIHJlZkVtaXR0ZXIsIHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCB0aGlzLm9wdGlvbnMuaTE4bkluTG9jYWxlKSxcbiAgICBdO1xuXG4gICAgY29uc3QgdHJhaXRDb21waWxlciA9IG5ldyBUcmFpdENvbXBpbGVyKFxuICAgICAgICBoYW5kbGVycywgcmVmbGVjdG9yLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgICAgdGhpcy5vcHRpb25zLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgIT09IGZhbHNlLCBjb21waWxhdGlvbk1vZGUsIGR0c1RyYW5zZm9ybXMsXG4gICAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyKTtcblxuICAgIC8vIFRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbWF5IHVzZSB0aGUgYFByb2dyYW1Ecml2ZXJgIHRvIHByb2R1Y2UgbmV3IGB0cy5Qcm9ncmFtYChzKS4gSWYgdGhpc1xuICAgIC8vIGhhcHBlbnMsIHRoZXkgbmVlZCB0byBiZSB0cmFja2VkIGJ5IHRoZSBgTmdDb21waWxlcmAuXG4gICAgY29uc3Qgbm90aWZ5aW5nRHJpdmVyID1cbiAgICAgICAgbmV3IE5vdGlmeWluZ1Byb2dyYW1Ecml2ZXJXcmFwcGVyKHRoaXMucHJvZ3JhbURyaXZlciwgKHByb2dyYW06IHRzLlByb2dyYW0pID0+IHtcbiAgICAgICAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIHByb2dyYW0pO1xuICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB9KTtcblxuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSBuZXcgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwoXG4gICAgICAgIHRoaXMuaW5wdXRQcm9ncmFtLCBub3RpZnlpbmdEcml2ZXIsIHRyYWl0Q29tcGlsZXIsIHRoaXMuZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCksIHJlZkVtaXR0ZXIsXG4gICAgICAgIHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24sIHNjb3BlUmVnaXN0cnksIHR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcik7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUNoZWNrczogVGVtcGxhdGVDaGVjazxFcnJvckNvZGU+W10gPSBbbmV3IEludmFsaWRCYW5hbmFJbkJveENoZWNrKCldO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbENoZWNrcykge1xuICAgICAgdGVtcGxhdGVDaGVja3MucHVzaChuZXcgTnVsbGlzaENvYWxlc2NpbmdOb3ROdWxsYWJsZUNoZWNrKCkpO1xuICAgIH1cbiAgICBjb25zdCBleHRlbmRlZFRlbXBsYXRlQ2hlY2tlciA9XG4gICAgICAgIG5ldyBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlckltcGwodGVtcGxhdGVUeXBlQ2hlY2tlciwgY2hlY2tlciwgdGVtcGxhdGVDaGVja3MpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlzQ29yZSxcbiAgICAgIHRyYWl0Q29tcGlsZXIsXG4gICAgICByZWZsZWN0b3IsXG4gICAgICBzY29wZVJlZ2lzdHJ5LFxuICAgICAgZHRzVHJhbnNmb3JtcyxcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoLFxuICAgICAgcm91dGVBbmFseXplcixcbiAgICAgIG1ldGFSZWFkZXIsXG4gICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgYWxpYXNpbmdIb3N0LFxuICAgICAgcmVmRW1pdHRlcixcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICByZXNvdXJjZVJlZ2lzdHJ5LFxuICAgICAgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXJcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiBgUHJvZ3JhbWAgaXMgQGFuZ3VsYXIvY29yZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmVQYWNrYWdlKHByb2dyYW06IHRzLlByb2dyYW0pOiBib29sZWFuIHtcbiAgLy8gTG9vayBmb3IgaXRzX2p1c3RfYW5ndWxhci50cyBzb21ld2hlcmUgaW4gdGhlIHByb2dyYW0uXG4gIGNvbnN0IHIzU3ltYm9scyA9IGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbSk7XG4gIGlmIChyM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBMb29rIGZvciB0aGUgY29uc3RhbnQgSVRTX0pVU1RfQU5HVUxBUiBpbiB0aGF0IGZpbGUuXG4gIHJldHVybiByM1N5bWJvbHMuc3RhdGVtZW50cy5zb21lKHN0bXQgPT4ge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgbXVzdCBiZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0YXRlbWVudC5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBiZSBleHBvcnRlZC5cbiAgICBpZiAoc3RtdC5tb2RpZmllcnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhc3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBkZWNsYXJlIElUU19KVVNUX0FOR1VMQVIuXG4gICAgcmV0dXJuIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5zb21lKGRlY2wgPT4ge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIG11c3QgbWF0Y2ggdGhlIG5hbWUuXG4gICAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpIHx8IGRlY2wubmFtZS50ZXh0ICE9PSAnSVRTX0pVU1RfQU5HVUxBUicpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gSXQgbXVzdCBpbml0aWFsaXplIHRoZSB2YXJpYWJsZSB0byB0cnVlLlxuICAgICAgaWYgKGRlY2wuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCB8fCBkZWNsLmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBkZWZpbml0aW9uIG1hdGNoZXMuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogU2luY2UgXCJzdHJpY3RUZW1wbGF0ZXNcIiBpcyBhIHRydWUgc3VwZXJzZXQgb2YgdHlwZSBjaGVja2luZyBjYXBhYmlsaXRpZXMgY29tcGFyZWQgdG9cbiAqIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIsIGl0IGlzIHJlcXVpcmVkIHRoYXQgdGhlIGxhdHRlciBpcyBub3QgZXhwbGljaXRseSBkaXNhYmxlZCBpZiB0aGVcbiAqIGZvcm1lciBpcyBlbmFibGVkLlxuICovXG5mdW5jdGlvbiB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyhvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyk6IHRzLkRpYWdub3N0aWN8bnVsbCB7XG4gIGlmIChvcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXMgPT09IHRydWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5DT05GSUdfU1RSSUNUX1RFTVBMQVRFU19JTVBMSUVTX0ZVTExfVEVNUExBVEVfVFlQRUNIRUNLKSxcbiAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgIGBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcInN0cmljdFRlbXBsYXRlc1wiIGlzIGVuYWJsZWQsIGhvd2V2ZXIgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBkaXNhYmxlZC5cblxuSGF2aW5nIHRoZSBcInN0cmljdFRlbXBsYXRlc1wiIGZsYWcgZW5hYmxlZCBpbXBsaWVzIHRoYXQgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBhbHNvIGVuYWJsZWQsIHNvXG50aGUgbGF0dGVyIGNhbiBub3QgYmUgZXhwbGljaXRseSBkaXNhYmxlZC5cblxuT25lIG9mIHRoZSBmb2xsb3dpbmcgYWN0aW9ucyBpcyByZXF1aXJlZDpcbjEuIFJlbW92ZSB0aGUgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBvcHRpb24uXG4yLiBSZW1vdmUgXCJzdHJpY3RUZW1wbGF0ZXNcIiBvciBzZXQgaXQgdG8gJ2ZhbHNlJy5cblxuTW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb21waWxlciBvcHRpb25zIGNhbiBiZSBmb3VuZCBpbiB0aGUgZG9jdW1lbnRhdGlvbjpcbmh0dHBzOi8vdjkuYW5ndWxhci5pby9ndWlkZS90ZW1wbGF0ZS10eXBlY2hlY2sjdGVtcGxhdGUtdHlwZS1jaGVja2luZ2AsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5jbGFzcyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIgaW1wbGVtZW50cyBSZWZlcmVuY2VzUmVnaXN0cnkge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGdyYXBoOiBSZWZlcmVuY2VHcmFwaCkge31cblxuICBhZGQoc291cmNlOiBEZWNsYXJhdGlvbk5vZGUsIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTxEZWNsYXJhdGlvbk5vZGU+W10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHtub2RlfSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgc291cmNlRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzb3VyY2VGaWxlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSByZWNvcmQgbG9jYWwgcmVmZXJlbmNlcyAobm90IHJlZmVyZW5jZXMgaW50byAuZC50cyBmaWxlcykuXG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkIHx8ICFpc0R0c1BhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgdGhpcy5ncmFwaC5hZGQoc291cmNlLCBub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgTm90aWZ5aW5nUHJvZ3JhbURyaXZlcldyYXBwZXIgaW1wbGVtZW50cyBQcm9ncmFtRHJpdmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGRlbGVnYXRlOiBQcm9ncmFtRHJpdmVyLCBwcml2YXRlIG5vdGlmeU5ld1Byb2dyYW06IChwcm9ncmFtOiB0cy5Qcm9ncmFtKSA9PiB2b2lkKSB7fVxuXG4gIGdldCBzdXBwb3J0c0lubGluZU9wZXJhdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zO1xuICB9XG5cbiAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRQcm9ncmFtKCk7XG4gIH1cblxuICB1cGRhdGVGaWxlcyhjb250ZW50czogTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVXBkYXRlPiwgdXBkYXRlTW9kZTogVXBkYXRlTW9kZSk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUudXBkYXRlRmlsZXMoY29udGVudHMsIHVwZGF0ZU1vZGUpO1xuICAgIHRoaXMubm90aWZ5TmV3UHJvZ3JhbSh0aGlzLmRlbGVnYXRlLmdldFByb2dyYW0oKSk7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlVmVyc2lvbiA9IHRoaXMuZGVsZWdhdGUuZ2V0U291cmNlRmlsZVZlcnNpb24/LmJpbmQodGhpcyk7XG59XG5cbmZ1bmN0aW9uIHZlcnNpb25NYXBGcm9tUHJvZ3JhbShcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkcml2ZXI6IFByb2dyYW1Ecml2ZXIpOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz58bnVsbCB7XG4gIGlmIChkcml2ZXIuZ2V0U291cmNlRmlsZVZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgdmVyc2lvbnMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgcG9zc2libHlSZWRpcmVjdGVkU291cmNlRmlsZSBvZiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICBjb25zdCBzZiA9IHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZShwb3NzaWJseVJlZGlyZWN0ZWRTb3VyY2VGaWxlKTtcbiAgICB2ZXJzaW9ucy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZiksIGRyaXZlci5nZXRTb3VyY2VGaWxlVmVyc2lvbihzZikpO1xuICB9XG4gIHJldHVybiB2ZXJzaW9ucztcbn1cbiJdfQ==