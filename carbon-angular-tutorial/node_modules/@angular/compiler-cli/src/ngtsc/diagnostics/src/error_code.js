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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ngErrorCode = exports.COMPILER_ERRORS_WITH_GUIDES = exports.ERROR_DETAILS_PAGE_BASE_URL = exports.ErrorCode = void 0;
    /**
     * @publicApi
     */
    var ErrorCode;
    (function (ErrorCode) {
        ErrorCode[ErrorCode["DECORATOR_ARG_NOT_LITERAL"] = 1001] = "DECORATOR_ARG_NOT_LITERAL";
        ErrorCode[ErrorCode["DECORATOR_ARITY_WRONG"] = 1002] = "DECORATOR_ARITY_WRONG";
        ErrorCode[ErrorCode["DECORATOR_NOT_CALLED"] = 1003] = "DECORATOR_NOT_CALLED";
        ErrorCode[ErrorCode["DECORATOR_ON_ANONYMOUS_CLASS"] = 1004] = "DECORATOR_ON_ANONYMOUS_CLASS";
        ErrorCode[ErrorCode["DECORATOR_UNEXPECTED"] = 1005] = "DECORATOR_UNEXPECTED";
        /**
         * This error code indicates that there are incompatible decorators on a type or a class field.
         */
        ErrorCode[ErrorCode["DECORATOR_COLLISION"] = 1006] = "DECORATOR_COLLISION";
        ErrorCode[ErrorCode["VALUE_HAS_WRONG_TYPE"] = 1010] = "VALUE_HAS_WRONG_TYPE";
        ErrorCode[ErrorCode["VALUE_NOT_LITERAL"] = 1011] = "VALUE_NOT_LITERAL";
        ErrorCode[ErrorCode["COMPONENT_MISSING_TEMPLATE"] = 2001] = "COMPONENT_MISSING_TEMPLATE";
        ErrorCode[ErrorCode["PIPE_MISSING_NAME"] = 2002] = "PIPE_MISSING_NAME";
        ErrorCode[ErrorCode["PARAM_MISSING_TOKEN"] = 2003] = "PARAM_MISSING_TOKEN";
        ErrorCode[ErrorCode["DIRECTIVE_MISSING_SELECTOR"] = 2004] = "DIRECTIVE_MISSING_SELECTOR";
        /** Raised when an undecorated class is passed in as a provider to a module or a directive. */
        ErrorCode[ErrorCode["UNDECORATED_PROVIDER"] = 2005] = "UNDECORATED_PROVIDER";
        /**
         * Raised when a Directive inherits its constructor from a base class without an Angular
         * decorator.
         */
        ErrorCode[ErrorCode["DIRECTIVE_INHERITS_UNDECORATED_CTOR"] = 2006] = "DIRECTIVE_INHERITS_UNDECORATED_CTOR";
        /**
         * Raised when an undecorated class that is using Angular features
         * has been discovered.
         */
        ErrorCode[ErrorCode["UNDECORATED_CLASS_USING_ANGULAR_FEATURES"] = 2007] = "UNDECORATED_CLASS_USING_ANGULAR_FEATURES";
        /**
         * Raised when an component cannot resolve an external resource, such as a template or a style
         * sheet.
         */
        ErrorCode[ErrorCode["COMPONENT_RESOURCE_NOT_FOUND"] = 2008] = "COMPONENT_RESOURCE_NOT_FOUND";
        /**
         * Raised when a component uses `ShadowDom` view encapsulation, but its selector
         * does not match the shadow DOM tag name requirements.
         */
        ErrorCode[ErrorCode["COMPONENT_INVALID_SHADOW_DOM_SELECTOR"] = 2009] = "COMPONENT_INVALID_SHADOW_DOM_SELECTOR";
        ErrorCode[ErrorCode["SYMBOL_NOT_EXPORTED"] = 3001] = "SYMBOL_NOT_EXPORTED";
        ErrorCode[ErrorCode["SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME"] = 3002] = "SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME";
        /**
         * Raised when a relationship between directives and/or pipes would cause a cyclic import to be
         * created that cannot be handled, such as in partial compilation mode.
         */
        ErrorCode[ErrorCode["IMPORT_CYCLE_DETECTED"] = 3003] = "IMPORT_CYCLE_DETECTED";
        ErrorCode[ErrorCode["CONFIG_FLAT_MODULE_NO_INDEX"] = 4001] = "CONFIG_FLAT_MODULE_NO_INDEX";
        ErrorCode[ErrorCode["CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK"] = 4002] = "CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK";
        /**
         * Raised when a host expression has a parse error, such as a host listener or host binding
         * expression containing a pipe.
         */
        ErrorCode[ErrorCode["HOST_BINDING_PARSE_ERROR"] = 5001] = "HOST_BINDING_PARSE_ERROR";
        /**
         * Raised when the compiler cannot parse a component's template.
         */
        ErrorCode[ErrorCode["TEMPLATE_PARSE_ERROR"] = 5002] = "TEMPLATE_PARSE_ERROR";
        /**
         * Raised when an NgModule contains an invalid reference in `declarations`.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_DECLARATION"] = 6001] = "NGMODULE_INVALID_DECLARATION";
        /**
         * Raised when an NgModule contains an invalid type in `imports`.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_IMPORT"] = 6002] = "NGMODULE_INVALID_IMPORT";
        /**
         * Raised when an NgModule contains an invalid type in `exports`.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_EXPORT"] = 6003] = "NGMODULE_INVALID_EXPORT";
        /**
         * Raised when an NgModule contains a type in `exports` which is neither in `declarations` nor
         * otherwise imported.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_REEXPORT"] = 6004] = "NGMODULE_INVALID_REEXPORT";
        /**
         * Raised when a `ModuleWithProviders` with a missing
         * generic type argument is passed into an `NgModule`.
         */
        ErrorCode[ErrorCode["NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC"] = 6005] = "NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC";
        /**
         * Raised when an NgModule exports multiple directives/pipes of the same name and the compiler
         * attempts to generate private re-exports within the NgModule file.
         */
        ErrorCode[ErrorCode["NGMODULE_REEXPORT_NAME_COLLISION"] = 6006] = "NGMODULE_REEXPORT_NAME_COLLISION";
        /**
         * Raised when a directive/pipe is part of the declarations of two or more NgModules.
         */
        ErrorCode[ErrorCode["NGMODULE_DECLARATION_NOT_UNIQUE"] = 6007] = "NGMODULE_DECLARATION_NOT_UNIQUE";
        /**
         * Not actually raised by the compiler, but reserved for documentation of a View Engine error when
         * a View Engine build depends on an Ivy-compiled NgModule.
         */
        ErrorCode[ErrorCode["NGMODULE_VE_DEPENDENCY_ON_IVY_LIB"] = 6999] = "NGMODULE_VE_DEPENDENCY_ON_IVY_LIB";
        /**
         * An element name failed validation against the DOM schema.
         */
        ErrorCode[ErrorCode["SCHEMA_INVALID_ELEMENT"] = 8001] = "SCHEMA_INVALID_ELEMENT";
        /**
         * An element's attribute name failed validation against the DOM schema.
         */
        ErrorCode[ErrorCode["SCHEMA_INVALID_ATTRIBUTE"] = 8002] = "SCHEMA_INVALID_ATTRIBUTE";
        /**
         * No matching directive was found for a `#ref="target"` expression.
         */
        ErrorCode[ErrorCode["MISSING_REFERENCE_TARGET"] = 8003] = "MISSING_REFERENCE_TARGET";
        /**
         * No matching pipe was found for a
         */
        ErrorCode[ErrorCode["MISSING_PIPE"] = 8004] = "MISSING_PIPE";
        /**
         * The left-hand side of an assignment expression was a template variable. Effectively, the
         * template looked like:
         *
         * ```
         * <ng-template let-something>
         *   <button (click)="something = ...">...</button>
         * </ng-template>
         * ```
         *
         * Template variables are read-only.
         */
        ErrorCode[ErrorCode["WRITE_TO_READ_ONLY_VARIABLE"] = 8005] = "WRITE_TO_READ_ONLY_VARIABLE";
        /**
         * A template variable was declared twice. For example:
         *
         * ```html
         * <div *ngFor="let i of items; let i = index">
         * </div>
         * ```
         */
        ErrorCode[ErrorCode["DUPLICATE_VARIABLE_DECLARATION"] = 8006] = "DUPLICATE_VARIABLE_DECLARATION";
        /**
         * A template has a two way binding (two bindings created by a single syntactial element)
         * in which the input and output are going to different places.
         */
        ErrorCode[ErrorCode["SPLIT_TWO_WAY_BINDING"] = 8007] = "SPLIT_TWO_WAY_BINDING";
        /**
         * A two way binding in a template has an incorrect syntax,
         * parentheses outside brackets. For example:
         *
         * ```
         * <div ([foo])="bar" />
         * ```
         */
        ErrorCode[ErrorCode["INVALID_BANANA_IN_BOX"] = 8101] = "INVALID_BANANA_IN_BOX";
        /**
         * The left side of a nullish coalescing operation is not nullable.
         *
         * ```
         * {{ foo ?? bar }}
         * ```
         * When the type of foo doesn't include `null` or `undefined`.
         */
        ErrorCode[ErrorCode["NULLISH_COALESCING_NOT_NULLABLE"] = 8102] = "NULLISH_COALESCING_NOT_NULLABLE";
        /**
         * The template type-checking engine would need to generate an inline type check block for a
         * component, but the current type-checking environment doesn't support it.
         */
        ErrorCode[ErrorCode["INLINE_TCB_REQUIRED"] = 8900] = "INLINE_TCB_REQUIRED";
        /**
         * The template type-checking engine would need to generate an inline type constructor for a
         * directive or component, but the current type-checking environment doesn't support it.
         */
        ErrorCode[ErrorCode["INLINE_TYPE_CTOR_REQUIRED"] = 8901] = "INLINE_TYPE_CTOR_REQUIRED";
        /**
         * An injectable already has a `ɵprov` property.
         */
        ErrorCode[ErrorCode["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
        // 10XXX error codes are reserved for diagnostics with categories other than
        // `ts.DiagnosticCategory.Error`. These diagnostics are generated by the compiler when configured
        // to do so by a tool such as the Language Service, or by the Language Service itself.
        /**
         * Suggest users to enable `strictTemplates` to make use of full capabilities
         * provided by Angular language service.
         */
        ErrorCode[ErrorCode["SUGGEST_STRICT_TEMPLATES"] = 10001] = "SUGGEST_STRICT_TEMPLATES";
        /**
         * Indicates that a particular structural directive provides advanced type narrowing
         * functionality, but the current template type-checking configuration does not allow its usage in
         * type inference.
         */
        ErrorCode[ErrorCode["SUGGEST_SUBOPTIMAL_TYPE_INFERENCE"] = 10002] = "SUGGEST_SUBOPTIMAL_TYPE_INFERENCE";
    })(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
    /**
     * @internal
     * Base URL for the error details page.
     * Keep this value in sync with a similar const in
     * `packages/core/src/render3/error_code.ts`.
     */
    exports.ERROR_DETAILS_PAGE_BASE_URL = 'https://angular.io/errors';
    /**
     * @internal
     * Contains a set of error messages that have detailed guides at angular.io.
     * Full list of available error guides can be found at https://angular.io/errors
     */
    exports.COMPILER_ERRORS_WITH_GUIDES = new Set([
        ErrorCode.DECORATOR_ARG_NOT_LITERAL,
        ErrorCode.IMPORT_CYCLE_DETECTED,
        ErrorCode.PARAM_MISSING_TOKEN,
        ErrorCode.SCHEMA_INVALID_ELEMENT,
        ErrorCode.SCHEMA_INVALID_ATTRIBUTE,
        ErrorCode.MISSING_REFERENCE_TARGET,
        ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR,
    ]);
    /**
     * @internal
     */
    function ngErrorCode(code) {
        return parseInt('-99' + code);
    }
    exports.ngErrorCode = ngErrorCode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JfY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2Vycm9yX2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUg7O09BRUc7SUFDSCxJQUFZLFNBd05YO0lBeE5ELFdBQVksU0FBUztRQUNuQixzRkFBZ0MsQ0FBQTtRQUNoQyw4RUFBNEIsQ0FBQTtRQUM1Qiw0RUFBMkIsQ0FBQTtRQUMzQiw0RkFBbUMsQ0FBQTtRQUNuQyw0RUFBMkIsQ0FBQTtRQUUzQjs7V0FFRztRQUNILDBFQUEwQixDQUFBO1FBRTFCLDRFQUEyQixDQUFBO1FBQzNCLHNFQUF3QixDQUFBO1FBRXhCLHdGQUFpQyxDQUFBO1FBQ2pDLHNFQUF3QixDQUFBO1FBQ3hCLDBFQUEwQixDQUFBO1FBQzFCLHdGQUFpQyxDQUFBO1FBRWpDLDhGQUE4RjtRQUM5Riw0RUFBMkIsQ0FBQTtRQUUzQjs7O1dBR0c7UUFDSCwwR0FBMEMsQ0FBQTtRQUUxQzs7O1dBR0c7UUFDSCxvSEFBK0MsQ0FBQTtRQUUvQzs7O1dBR0c7UUFDSCw0RkFBbUMsQ0FBQTtRQUVuQzs7O1dBR0c7UUFDSCw4R0FBNEMsQ0FBQTtRQUU1QywwRUFBMEIsQ0FBQTtRQUMxQiw0R0FBMkMsQ0FBQTtRQUMzQzs7O1dBR0c7UUFDSCw4RUFBNEIsQ0FBQTtRQUU1QiwwRkFBa0MsQ0FBQTtRQUNsQyxrSkFBOEQsQ0FBQTtRQUU5RDs7O1dBR0c7UUFDSCxvRkFBK0IsQ0FBQTtRQUUvQjs7V0FFRztRQUNILDRFQUEyQixDQUFBO1FBRTNCOztXQUVHO1FBQ0gsNEZBQW1DLENBQUE7UUFFbkM7O1dBRUc7UUFDSCxrRkFBOEIsQ0FBQTtRQUU5Qjs7V0FFRztRQUNILGtGQUE4QixDQUFBO1FBRTlCOzs7V0FHRztRQUNILHNGQUFnQyxDQUFBO1FBRWhDOzs7V0FHRztRQUNILGdJQUFxRCxDQUFBO1FBRXJEOzs7V0FHRztRQUNILG9HQUF1QyxDQUFBO1FBRXZDOztXQUVHO1FBQ0gsa0dBQXNDLENBQUE7UUFFdEM7OztXQUdHO1FBQ0gsc0dBQXdDLENBQUE7UUFFeEM7O1dBRUc7UUFDSCxnRkFBNkIsQ0FBQTtRQUU3Qjs7V0FFRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsb0ZBQStCLENBQUE7UUFFL0I7O1dBRUc7UUFDSCw0REFBbUIsQ0FBQTtRQUVuQjs7Ozs7Ozs7Ozs7V0FXRztRQUNILDBGQUFrQyxDQUFBO1FBRWxDOzs7Ozs7O1dBT0c7UUFDSCxnR0FBcUMsQ0FBQTtRQUVyQzs7O1dBR0c7UUFDSCw4RUFBNEIsQ0FBQTtRQUU1Qjs7Ozs7OztXQU9HO1FBQ0gsOEVBQTRCLENBQUE7UUFFNUI7Ozs7Ozs7V0FPRztRQUNILGtHQUFzQyxDQUFBO1FBRXRDOzs7V0FHRztRQUNILDBFQUEwQixDQUFBO1FBRTFCOzs7V0FHRztRQUNILHNGQUFnQyxDQUFBO1FBRWhDOztXQUVHO1FBQ0gsc0ZBQWdDLENBQUE7UUFFaEMsNEVBQTRFO1FBQzVFLGlHQUFpRztRQUNqRyxzRkFBc0Y7UUFFdEY7OztXQUdHO1FBQ0gscUZBQWdDLENBQUE7UUFFaEM7Ozs7V0FJRztRQUNILHVHQUF5QyxDQUFBO0lBQzNDLENBQUMsRUF4TlcsU0FBUyxHQUFULGlCQUFTLEtBQVQsaUJBQVMsUUF3TnBCO0lBRUQ7Ozs7O09BS0c7SUFDVSxRQUFBLDJCQUEyQixHQUFHLDJCQUEyQixDQUFDO0lBRXZFOzs7O09BSUc7SUFDVSxRQUFBLDJCQUEyQixHQUFHLElBQUksR0FBRyxDQUFDO1FBQ2pELFNBQVMsQ0FBQyx5QkFBeUI7UUFDbkMsU0FBUyxDQUFDLHFCQUFxQjtRQUMvQixTQUFTLENBQUMsbUJBQW1CO1FBQzdCLFNBQVMsQ0FBQyxzQkFBc0I7UUFDaEMsU0FBUyxDQUFDLHdCQUF3QjtRQUNsQyxTQUFTLENBQUMsd0JBQXdCO1FBQ2xDLFNBQVMsQ0FBQyxxQ0FBcUM7S0FDaEQsQ0FBQyxDQUFDO0lBRUg7O09BRUc7SUFDSCxTQUFnQixXQUFXLENBQUMsSUFBZTtRQUN6QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUZELGtDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZW51bSBFcnJvckNvZGUge1xuICBERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMID0gMTAwMSxcbiAgREVDT1JBVE9SX0FSSVRZX1dST05HID0gMTAwMixcbiAgREVDT1JBVE9SX05PVF9DQUxMRUQgPSAxMDAzLFxuICBERUNPUkFUT1JfT05fQU5PTllNT1VTX0NMQVNTID0gMTAwNCxcbiAgREVDT1JBVE9SX1VORVhQRUNURUQgPSAxMDA1LFxuXG4gIC8qKlxuICAgKiBUaGlzIGVycm9yIGNvZGUgaW5kaWNhdGVzIHRoYXQgdGhlcmUgYXJlIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGEgdHlwZSBvciBhIGNsYXNzIGZpZWxkLlxuICAgKi9cbiAgREVDT1JBVE9SX0NPTExJU0lPTiA9IDEwMDYsXG5cbiAgVkFMVUVfSEFTX1dST05HX1RZUEUgPSAxMDEwLFxuICBWQUxVRV9OT1RfTElURVJBTCA9IDEwMTEsXG5cbiAgQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUgPSAyMDAxLFxuICBQSVBFX01JU1NJTkdfTkFNRSA9IDIwMDIsXG4gIFBBUkFNX01JU1NJTkdfVE9LRU4gPSAyMDAzLFxuICBESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiA9IDIwMDQsXG5cbiAgLyoqIFJhaXNlZCB3aGVuIGFuIHVuZGVjb3JhdGVkIGNsYXNzIGlzIHBhc3NlZCBpbiBhcyBhIHByb3ZpZGVyIHRvIGEgbW9kdWxlIG9yIGEgZGlyZWN0aXZlLiAqL1xuICBVTkRFQ09SQVRFRF9QUk9WSURFUiA9IDIwMDUsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgRGlyZWN0aXZlIGluaGVyaXRzIGl0cyBjb25zdHJ1Y3RvciBmcm9tIGEgYmFzZSBjbGFzcyB3aXRob3V0IGFuIEFuZ3VsYXJcbiAgICogZGVjb3JhdG9yLlxuICAgKi9cbiAgRElSRUNUSVZFX0lOSEVSSVRTX1VOREVDT1JBVEVEX0NUT1IgPSAyMDA2LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiB1bmRlY29yYXRlZCBjbGFzcyB0aGF0IGlzIHVzaW5nIEFuZ3VsYXIgZmVhdHVyZXNcbiAgICogaGFzIGJlZW4gZGlzY292ZXJlZC5cbiAgICovXG4gIFVOREVDT1JBVEVEX0NMQVNTX1VTSU5HX0FOR1VMQVJfRkVBVFVSRVMgPSAyMDA3LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBjb21wb25lbnQgY2Fubm90IHJlc29sdmUgYW4gZXh0ZXJuYWwgcmVzb3VyY2UsIHN1Y2ggYXMgYSB0ZW1wbGF0ZSBvciBhIHN0eWxlXG4gICAqIHNoZWV0LlxuICAgKi9cbiAgQ09NUE9ORU5UX1JFU09VUkNFX05PVF9GT1VORCA9IDIwMDgsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgY29tcG9uZW50IHVzZXMgYFNoYWRvd0RvbWAgdmlldyBlbmNhcHN1bGF0aW9uLCBidXQgaXRzIHNlbGVjdG9yXG4gICAqIGRvZXMgbm90IG1hdGNoIHRoZSBzaGFkb3cgRE9NIHRhZyBuYW1lIHJlcXVpcmVtZW50cy5cbiAgICovXG4gIENPTVBPTkVOVF9JTlZBTElEX1NIQURPV19ET01fU0VMRUNUT1IgPSAyMDA5LFxuXG4gIFNZTUJPTF9OT1RfRVhQT1JURUQgPSAzMDAxLFxuICBTWU1CT0xfRVhQT1JURURfVU5ERVJfRElGRkVSRU5UX05BTUUgPSAzMDAyLFxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSByZWxhdGlvbnNoaXAgYmV0d2VlbiBkaXJlY3RpdmVzIGFuZC9vciBwaXBlcyB3b3VsZCBjYXVzZSBhIGN5Y2xpYyBpbXBvcnQgdG8gYmVcbiAgICogY3JlYXRlZCB0aGF0IGNhbm5vdCBiZSBoYW5kbGVkLCBzdWNoIGFzIGluIHBhcnRpYWwgY29tcGlsYXRpb24gbW9kZS5cbiAgICovXG4gIElNUE9SVF9DWUNMRV9ERVRFQ1RFRCA9IDMwMDMsXG5cbiAgQ09ORklHX0ZMQVRfTU9EVUxFX05PX0lOREVYID0gNDAwMSxcbiAgQ09ORklHX1NUUklDVF9URU1QTEFURVNfSU1QTElFU19GVUxMX1RFTVBMQVRFX1RZUEVDSEVDSyA9IDQwMDIsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgaG9zdCBleHByZXNzaW9uIGhhcyBhIHBhcnNlIGVycm9yLCBzdWNoIGFzIGEgaG9zdCBsaXN0ZW5lciBvciBob3N0IGJpbmRpbmdcbiAgICogZXhwcmVzc2lvbiBjb250YWluaW5nIGEgcGlwZS5cbiAgICovXG4gIEhPU1RfQklORElOR19QQVJTRV9FUlJPUiA9IDUwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIHRoZSBjb21waWxlciBjYW5ub3QgcGFyc2UgYSBjb21wb25lbnQncyB0ZW1wbGF0ZS5cbiAgICovXG4gIFRFTVBMQVRFX1BBUlNFX0VSUk9SID0gNTAwMixcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYW4gTmdNb2R1bGUgY29udGFpbnMgYW4gaW52YWxpZCByZWZlcmVuY2UgaW4gYGRlY2xhcmF0aW9uc2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OID0gNjAwMSxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYW4gTmdNb2R1bGUgY29udGFpbnMgYW4gaW52YWxpZCB0eXBlIGluIGBpbXBvcnRzYC5cbiAgICovXG4gIE5HTU9EVUxFX0lOVkFMSURfSU1QT1JUID0gNjAwMixcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYW4gTmdNb2R1bGUgY29udGFpbnMgYW4gaW52YWxpZCB0eXBlIGluIGBleHBvcnRzYC5cbiAgICovXG4gIE5HTU9EVUxFX0lOVkFMSURfRVhQT1JUID0gNjAwMyxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYW4gTmdNb2R1bGUgY29udGFpbnMgYSB0eXBlIGluIGBleHBvcnRzYCB3aGljaCBpcyBuZWl0aGVyIGluIGBkZWNsYXJhdGlvbnNgIG5vclxuICAgKiBvdGhlcndpc2UgaW1wb3J0ZWQuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX1JFRVhQT1JUID0gNjAwNCxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agd2l0aCBhIG1pc3NpbmdcbiAgICogZ2VuZXJpYyB0eXBlIGFyZ3VtZW50IGlzIHBhc3NlZCBpbnRvIGFuIGBOZ01vZHVsZWAuXG4gICAqL1xuICBOR01PRFVMRV9NT0RVTEVfV0lUSF9QUk9WSURFUlNfTUlTU0lOR19HRU5FUklDID0gNjAwNSxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYW4gTmdNb2R1bGUgZXhwb3J0cyBtdWx0aXBsZSBkaXJlY3RpdmVzL3BpcGVzIG9mIHRoZSBzYW1lIG5hbWUgYW5kIHRoZSBjb21waWxlclxuICAgKiBhdHRlbXB0cyB0byBnZW5lcmF0ZSBwcml2YXRlIHJlLWV4cG9ydHMgd2l0aGluIHRoZSBOZ01vZHVsZSBmaWxlLlxuICAgKi9cbiAgTkdNT0RVTEVfUkVFWFBPUlRfTkFNRV9DT0xMSVNJT04gPSA2MDA2LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhIGRpcmVjdGl2ZS9waXBlIGlzIHBhcnQgb2YgdGhlIGRlY2xhcmF0aW9ucyBvZiB0d28gb3IgbW9yZSBOZ01vZHVsZXMuXG4gICAqL1xuICBOR01PRFVMRV9ERUNMQVJBVElPTl9OT1RfVU5JUVVFID0gNjAwNyxcblxuICAvKipcbiAgICogTm90IGFjdHVhbGx5IHJhaXNlZCBieSB0aGUgY29tcGlsZXIsIGJ1dCByZXNlcnZlZCBmb3IgZG9jdW1lbnRhdGlvbiBvZiBhIFZpZXcgRW5naW5lIGVycm9yIHdoZW5cbiAgICogYSBWaWV3IEVuZ2luZSBidWlsZCBkZXBlbmRzIG9uIGFuIEl2eS1jb21waWxlZCBOZ01vZHVsZS5cbiAgICovXG4gIE5HTU9EVUxFX1ZFX0RFUEVOREVOQ1lfT05fSVZZX0xJQiA9IDY5OTksXG5cbiAgLyoqXG4gICAqIEFuIGVsZW1lbnQgbmFtZSBmYWlsZWQgdmFsaWRhdGlvbiBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLlxuICAgKi9cbiAgU0NIRU1BX0lOVkFMSURfRUxFTUVOVCA9IDgwMDEsXG5cbiAgLyoqXG4gICAqIEFuIGVsZW1lbnQncyBhdHRyaWJ1dGUgbmFtZSBmYWlsZWQgdmFsaWRhdGlvbiBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLlxuICAgKi9cbiAgU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFID0gODAwMixcblxuICAvKipcbiAgICogTm8gbWF0Y2hpbmcgZGlyZWN0aXZlIHdhcyBmb3VuZCBmb3IgYSBgI3JlZj1cInRhcmdldFwiYCBleHByZXNzaW9uLlxuICAgKi9cbiAgTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VUID0gODAwMyxcblxuICAvKipcbiAgICogTm8gbWF0Y2hpbmcgcGlwZSB3YXMgZm91bmQgZm9yIGFcbiAgICovXG4gIE1JU1NJTkdfUElQRSA9IDgwMDQsXG5cbiAgLyoqXG4gICAqIFRoZSBsZWZ0LWhhbmQgc2lkZSBvZiBhbiBhc3NpZ25tZW50IGV4cHJlc3Npb24gd2FzIGEgdGVtcGxhdGUgdmFyaWFibGUuIEVmZmVjdGl2ZWx5LCB0aGVcbiAgICogdGVtcGxhdGUgbG9va2VkIGxpa2U6XG4gICAqXG4gICAqIGBgYFxuICAgKiA8bmctdGVtcGxhdGUgbGV0LXNvbWV0aGluZz5cbiAgICogICA8YnV0dG9uIChjbGljayk9XCJzb21ldGhpbmcgPSAuLi5cIj4uLi48L2J1dHRvbj5cbiAgICogPC9uZy10ZW1wbGF0ZT5cbiAgICogYGBgXG4gICAqXG4gICAqIFRlbXBsYXRlIHZhcmlhYmxlcyBhcmUgcmVhZC1vbmx5LlxuICAgKi9cbiAgV1JJVEVfVE9fUkVBRF9PTkxZX1ZBUklBQkxFID0gODAwNSxcblxuICAvKipcbiAgICogQSB0ZW1wbGF0ZSB2YXJpYWJsZSB3YXMgZGVjbGFyZWQgdHdpY2UuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgKm5nRm9yPVwibGV0IGkgb2YgaXRlbXM7IGxldCBpID0gaW5kZXhcIj5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgRFVQTElDQVRFX1ZBUklBQkxFX0RFQ0xBUkFUSU9OID0gODAwNixcblxuICAvKipcbiAgICogQSB0ZW1wbGF0ZSBoYXMgYSB0d28gd2F5IGJpbmRpbmcgKHR3byBiaW5kaW5ncyBjcmVhdGVkIGJ5IGEgc2luZ2xlIHN5bnRhY3RpYWwgZWxlbWVudClcbiAgICogaW4gd2hpY2ggdGhlIGlucHV0IGFuZCBvdXRwdXQgYXJlIGdvaW5nIHRvIGRpZmZlcmVudCBwbGFjZXMuXG4gICAqL1xuICBTUExJVF9UV09fV0FZX0JJTkRJTkcgPSA4MDA3LFxuXG4gIC8qKlxuICAgKiBBIHR3byB3YXkgYmluZGluZyBpbiBhIHRlbXBsYXRlIGhhcyBhbiBpbmNvcnJlY3Qgc3ludGF4LFxuICAgKiBwYXJlbnRoZXNlcyBvdXRzaWRlIGJyYWNrZXRzLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIDxkaXYgKFtmb29dKT1cImJhclwiIC8+XG4gICAqIGBgYFxuICAgKi9cbiAgSU5WQUxJRF9CQU5BTkFfSU5fQk9YID0gODEwMSxcblxuICAvKipcbiAgICogVGhlIGxlZnQgc2lkZSBvZiBhIG51bGxpc2ggY29hbGVzY2luZyBvcGVyYXRpb24gaXMgbm90IG51bGxhYmxlLlxuICAgKlxuICAgKiBgYGBcbiAgICoge3sgZm9vID8/IGJhciB9fVxuICAgKiBgYGBcbiAgICogV2hlbiB0aGUgdHlwZSBvZiBmb28gZG9lc24ndCBpbmNsdWRlIGBudWxsYCBvciBgdW5kZWZpbmVkYC5cbiAgICovXG4gIE5VTExJU0hfQ09BTEVTQ0lOR19OT1RfTlVMTEFCTEUgPSA4MTAyLFxuXG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBlbmdpbmUgd291bGQgbmVlZCB0byBnZW5lcmF0ZSBhbiBpbmxpbmUgdHlwZSBjaGVjayBibG9jayBmb3IgYVxuICAgKiBjb21wb25lbnQsIGJ1dCB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIGVudmlyb25tZW50IGRvZXNuJ3Qgc3VwcG9ydCBpdC5cbiAgICovXG4gIElOTElORV9UQ0JfUkVRVUlSRUQgPSA4OTAwLFxuXG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBlbmdpbmUgd291bGQgbmVlZCB0byBnZW5lcmF0ZSBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBmb3IgYVxuICAgKiBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBidXQgdGhlIGN1cnJlbnQgdHlwZS1jaGVja2luZyBlbnZpcm9ubWVudCBkb2Vzbid0IHN1cHBvcnQgaXQuXG4gICAqL1xuICBJTkxJTkVfVFlQRV9DVE9SX1JFUVVJUkVEID0gODkwMSxcblxuICAvKipcbiAgICogQW4gaW5qZWN0YWJsZSBhbHJlYWR5IGhhcyBhIGDJtXByb3ZgIHByb3BlcnR5LlxuICAgKi9cbiAgSU5KRUNUQUJMRV9EVVBMSUNBVEVfUFJPViA9IDkwMDEsXG5cbiAgLy8gMTBYWFggZXJyb3IgY29kZXMgYXJlIHJlc2VydmVkIGZvciBkaWFnbm9zdGljcyB3aXRoIGNhdGVnb3JpZXMgb3RoZXIgdGhhblxuICAvLyBgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yYC4gVGhlc2UgZGlhZ25vc3RpY3MgYXJlIGdlbmVyYXRlZCBieSB0aGUgY29tcGlsZXIgd2hlbiBjb25maWd1cmVkXG4gIC8vIHRvIGRvIHNvIGJ5IGEgdG9vbCBzdWNoIGFzIHRoZSBMYW5ndWFnZSBTZXJ2aWNlLCBvciBieSB0aGUgTGFuZ3VhZ2UgU2VydmljZSBpdHNlbGYuXG5cbiAgLyoqXG4gICAqIFN1Z2dlc3QgdXNlcnMgdG8gZW5hYmxlIGBzdHJpY3RUZW1wbGF0ZXNgIHRvIG1ha2UgdXNlIG9mIGZ1bGwgY2FwYWJpbGl0aWVzXG4gICAqIHByb3ZpZGVkIGJ5IEFuZ3VsYXIgbGFuZ3VhZ2Ugc2VydmljZS5cbiAgICovXG4gIFNVR0dFU1RfU1RSSUNUX1RFTVBMQVRFUyA9IDEwMDAxLFxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCBhIHBhcnRpY3VsYXIgc3RydWN0dXJhbCBkaXJlY3RpdmUgcHJvdmlkZXMgYWR2YW5jZWQgdHlwZSBuYXJyb3dpbmdcbiAgICogZnVuY3Rpb25hbGl0eSwgYnV0IHRoZSBjdXJyZW50IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29uZmlndXJhdGlvbiBkb2VzIG5vdCBhbGxvdyBpdHMgdXNhZ2UgaW5cbiAgICogdHlwZSBpbmZlcmVuY2UuXG4gICAqL1xuICBTVUdHRVNUX1NVQk9QVElNQUxfVFlQRV9JTkZFUkVOQ0UgPSAxMDAwMixcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEJhc2UgVVJMIGZvciB0aGUgZXJyb3IgZGV0YWlscyBwYWdlLlxuICogS2VlcCB0aGlzIHZhbHVlIGluIHN5bmMgd2l0aCBhIHNpbWlsYXIgY29uc3QgaW5cbiAqIGBwYWNrYWdlcy9jb3JlL3NyYy9yZW5kZXIzL2Vycm9yX2NvZGUudHNgLlxuICovXG5leHBvcnQgY29uc3QgRVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMID0gJ2h0dHBzOi8vYW5ndWxhci5pby9lcnJvcnMnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29udGFpbnMgYSBzZXQgb2YgZXJyb3IgbWVzc2FnZXMgdGhhdCBoYXZlIGRldGFpbGVkIGd1aWRlcyBhdCBhbmd1bGFyLmlvLlxuICogRnVsbCBsaXN0IG9mIGF2YWlsYWJsZSBlcnJvciBndWlkZXMgY2FuIGJlIGZvdW5kIGF0IGh0dHBzOi8vYW5ndWxhci5pby9lcnJvcnNcbiAqL1xuZXhwb3J0IGNvbnN0IENPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUyA9IG5ldyBTZXQoW1xuICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCxcbiAgRXJyb3JDb2RlLklNUE9SVF9DWUNMRV9ERVRFQ1RFRCxcbiAgRXJyb3JDb2RlLlBBUkFNX01JU1NJTkdfVE9LRU4sXG4gIEVycm9yQ29kZS5TQ0hFTUFfSU5WQUxJRF9FTEVNRU5ULFxuICBFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFLFxuICBFcnJvckNvZGUuTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VULFxuICBFcnJvckNvZGUuQ09NUE9ORU5UX0lOVkFMSURfU0hBRE9XX0RPTV9TRUxFQ1RPUixcbl0pO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gbmdFcnJvckNvZGUoY29kZTogRXJyb3JDb2RlKTogbnVtYmVyIHtcbiAgcmV0dXJuIHBhcnNlSW50KCctOTknICsgY29kZSk7XG59XG4iXX0=