/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ASTWithSource, EmptyExpr } from '../expression_parser/ast';
import { createTokenForExternalReference, createTokenForReference, Identifiers } from '../identifiers';
import * as html from '../ml_parser/ast';
import { ParseTreeResult } from '../ml_parser/html_parser';
import { removeWhitespaces, replaceNgsp } from '../ml_parser/html_whitespaces';
import { expandNodes } from '../ml_parser/icu_ast_expander';
import { InterpolationConfig } from '../ml_parser/interpolation_config';
import { isNgTemplate, splitNsName } from '../ml_parser/tags';
import { identifierName, ParseError, ParseErrorLevel, ParseSourceSpan, syntaxError } from '../parse_util';
import { ProviderElementContext, ProviderViewContext } from '../provider_analyzer';
import { CssSelector, SelectorMatcher } from '../selector';
import { isStyleUrlResolvable } from '../style_url_resolver';
import { newArray } from '../util';
import { BindingParser } from './binding_parser';
import * as t from './template_ast';
import { PreparsedElementType, preparseElement } from './template_preparser';
const BIND_NAME_REGEXP = /^(?:(?:(?:(bind-)|(let-)|(ref-|#)|(on-)|(bindon-)|(@))(.*))|\[\(([^\)]+)\)\]|\[([^\]]+)\]|\(([^\)]+)\))$/;
// Group 1 = "bind-"
const KW_BIND_IDX = 1;
// Group 2 = "let-"
const KW_LET_IDX = 2;
// Group 3 = "ref-/#"
const KW_REF_IDX = 3;
// Group 4 = "on-"
const KW_ON_IDX = 4;
// Group 5 = "bindon-"
const KW_BINDON_IDX = 5;
// Group 6 = "@"
const KW_AT_IDX = 6;
// Group 7 = the identifier after "bind-", "let-", "ref-/#", "on-", "bindon-" or "@"
const IDENT_KW_IDX = 7;
// Group 8 = identifier inside [()]
const IDENT_BANANA_BOX_IDX = 8;
// Group 9 = identifier inside []
const IDENT_PROPERTY_IDX = 9;
// Group 10 = identifier inside ()
const IDENT_EVENT_IDX = 10;
const TEMPLATE_ATTR_PREFIX = '*';
const CLASS_ATTR = 'class';
let _TEXT_CSS_SELECTOR;
function TEXT_CSS_SELECTOR() {
    if (!_TEXT_CSS_SELECTOR) {
        _TEXT_CSS_SELECTOR = CssSelector.parse('*')[0];
    }
    return _TEXT_CSS_SELECTOR;
}
export class TemplateParseError extends ParseError {
    constructor(message, span, level) {
        super(span, message, level);
    }
}
export class TemplateParseResult {
    constructor(templateAst, usedPipes, errors) {
        this.templateAst = templateAst;
        this.usedPipes = usedPipes;
        this.errors = errors;
    }
}
export class TemplateParser {
    constructor(_config, _reflector, _exprParser, _schemaRegistry, _htmlParser, _console, transforms) {
        this._config = _config;
        this._reflector = _reflector;
        this._exprParser = _exprParser;
        this._schemaRegistry = _schemaRegistry;
        this._htmlParser = _htmlParser;
        this._console = _console;
        this.transforms = transforms;
    }
    get expressionParser() {
        return this._exprParser;
    }
    parse(component, template, directives, pipes, schemas, templateUrl, preserveWhitespaces) {
        var _a;
        const result = this.tryParse(component, template, directives, pipes, schemas, templateUrl, preserveWhitespaces);
        const warnings = result.errors.filter(error => error.level === ParseErrorLevel.WARNING);
        const errors = result.errors.filter(error => error.level === ParseErrorLevel.ERROR);
        if (warnings.length > 0) {
            (_a = this._console) === null || _a === void 0 ? void 0 : _a.warn(`Template parse warnings:\n${warnings.join('\n')}`);
        }
        if (errors.length > 0) {
            const errorString = errors.join('\n');
            throw syntaxError(`Template parse errors:\n${errorString}`, errors);
        }
        return { template: result.templateAst, pipes: result.usedPipes };
    }
    tryParse(component, template, directives, pipes, schemas, templateUrl, preserveWhitespaces) {
        let htmlParseResult = typeof template === 'string' ?
            this._htmlParser.parse(template, templateUrl, {
                tokenizeExpansionForms: true,
                interpolationConfig: this.getInterpolationConfig(component)
            }) :
            template;
        if (!preserveWhitespaces) {
            htmlParseResult = removeWhitespaces(htmlParseResult);
        }
        return this.tryParseHtml(this.expandHtml(htmlParseResult), component, directives, pipes, schemas);
    }
    tryParseHtml(htmlAstWithErrors, component, directives, pipes, schemas) {
        let result;
        const errors = htmlAstWithErrors.errors;
        const usedPipes = [];
        if (htmlAstWithErrors.rootNodes.length > 0) {
            const uniqDirectives = removeSummaryDuplicates(directives);
            const uniqPipes = removeSummaryDuplicates(pipes);
            const providerViewContext = new ProviderViewContext(this._reflector, component);
            let interpolationConfig = undefined;
            if (component.template && component.template.interpolation) {
                interpolationConfig = {
                    start: component.template.interpolation[0],
                    end: component.template.interpolation[1]
                };
            }
            const bindingParser = new BindingParser(this._exprParser, interpolationConfig, this._schemaRegistry, uniqPipes, errors);
            const parseVisitor = new TemplateParseVisitor(this._reflector, this._config, providerViewContext, uniqDirectives, bindingParser, this._schemaRegistry, schemas, errors);
            result = html.visitAll(parseVisitor, htmlAstWithErrors.rootNodes, EMPTY_ELEMENT_CONTEXT);
            errors.push(...providerViewContext.errors);
            usedPipes.push(...bindingParser.getUsedPipes());
        }
        else {
            result = [];
        }
        this._assertNoReferenceDuplicationOnTemplate(result, errors);
        if (errors.length > 0) {
            return new TemplateParseResult(result, usedPipes, errors);
        }
        if (this.transforms) {
            this.transforms.forEach((transform) => {
                result = t.templateVisitAll(transform, result);
            });
        }
        return new TemplateParseResult(result, usedPipes, errors);
    }
    expandHtml(htmlAstWithErrors, forced = false) {
        const errors = htmlAstWithErrors.errors;
        if (errors.length == 0 || forced) {
            // Transform ICU messages to angular directives
            const expandedHtmlAst = expandNodes(htmlAstWithErrors.rootNodes);
            errors.push(...expandedHtmlAst.errors);
            htmlAstWithErrors = new ParseTreeResult(expandedHtmlAst.nodes, errors);
        }
        return htmlAstWithErrors;
    }
    getInterpolationConfig(component) {
        if (component.template) {
            return InterpolationConfig.fromArray(component.template.interpolation);
        }
        return undefined;
    }
    /** @internal */
    _assertNoReferenceDuplicationOnTemplate(result, errors) {
        const existingReferences = [];
        result.filter(element => !!element.references)
            .forEach(element => element.references.forEach((reference) => {
            const name = reference.name;
            if (existingReferences.indexOf(name) < 0) {
                existingReferences.push(name);
            }
            else {
                const error = new TemplateParseError(`Reference "#${name}" is defined several times`, reference.sourceSpan, ParseErrorLevel.ERROR);
                errors.push(error);
            }
        }));
    }
}
class TemplateParseVisitor {
    constructor(reflector, config, providerViewContext, directives, _bindingParser, _schemaRegistry, _schemas, _targetErrors) {
        this.reflector = reflector;
        this.config = config;
        this.providerViewContext = providerViewContext;
        this._bindingParser = _bindingParser;
        this._schemaRegistry = _schemaRegistry;
        this._schemas = _schemas;
        this._targetErrors = _targetErrors;
        this.selectorMatcher = new SelectorMatcher();
        this.directivesIndex = new Map();
        this.ngContentCount = 0;
        // Note: queries start with id 1 so we can use the number in a Bloom filter!
        this.contentQueryStartId = providerViewContext.component.viewQueries.length + 1;
        directives.forEach((directive, index) => {
            const selector = CssSelector.parse(directive.selector);
            this.selectorMatcher.addSelectables(selector, directive);
            this.directivesIndex.set(directive, index);
        });
    }
    visitExpansion(expansion, context) {
        return null;
    }
    visitExpansionCase(expansionCase, context) {
        return null;
    }
    visitText(text, parent) {
        const ngContentIndex = parent.findNgContentIndex(TEXT_CSS_SELECTOR());
        const valueNoNgsp = replaceNgsp(text.value);
        const expr = this._bindingParser.parseInterpolation(valueNoNgsp, text.sourceSpan);
        return expr ? new t.BoundTextAst(expr, ngContentIndex, text.sourceSpan) :
            new t.TextAst(valueNoNgsp, ngContentIndex, text.sourceSpan);
    }
    visitAttribute(attribute, context) {
        return new t.AttrAst(attribute.name, attribute.value, attribute.sourceSpan);
    }
    visitComment(comment, context) {
        return null;
    }
    visitElement(element, parent) {
        const queryStartIndex = this.contentQueryStartId;
        const elName = element.name;
        const preparsedElement = preparseElement(element);
        if (preparsedElement.type === PreparsedElementType.SCRIPT ||
            preparsedElement.type === PreparsedElementType.STYLE) {
            // Skipping <script> for security reasons
            // Skipping <style> as we already processed them
            // in the StyleCompiler
            return null;
        }
        if (preparsedElement.type === PreparsedElementType.STYLESHEET &&
            isStyleUrlResolvable(preparsedElement.hrefAttr)) {
            // Skipping stylesheets with either relative urls or package scheme as we already processed
            // them in the StyleCompiler
            return null;
        }
        const matchableAttrs = [];
        const elementOrDirectiveProps = [];
        const elementOrDirectiveRefs = [];
        const elementVars = [];
        const events = [];
        const templateElementOrDirectiveProps = [];
        const templateMatchableAttrs = [];
        const templateElementVars = [];
        let hasInlineTemplates = false;
        const attrs = [];
        const isTemplateElement = isNgTemplate(element.name);
        element.attrs.forEach(attr => {
            const parsedVariables = [];
            const hasBinding = this._parseAttr(isTemplateElement, attr, matchableAttrs, elementOrDirectiveProps, events, elementOrDirectiveRefs, elementVars);
            elementVars.push(...parsedVariables.map(v => t.VariableAst.fromParsedVariable(v)));
            let templateValue;
            let templateKey;
            const normalizedName = this._normalizeAttributeName(attr.name);
            if (normalizedName.startsWith(TEMPLATE_ATTR_PREFIX)) {
                templateValue = attr.value;
                templateKey = normalizedName.substring(TEMPLATE_ATTR_PREFIX.length);
            }
            const hasTemplateBinding = templateValue != null;
            if (hasTemplateBinding) {
                if (hasInlineTemplates) {
                    this._reportError(`Can't have multiple template bindings on one element. Use only one attribute prefixed with *`, attr.sourceSpan);
                }
                hasInlineTemplates = true;
                const parsedVariables = [];
                const absoluteOffset = (attr.valueSpan || attr.sourceSpan).start.offset;
                this._bindingParser.parseInlineTemplateBinding(templateKey, templateValue, attr.sourceSpan, absoluteOffset, templateMatchableAttrs, templateElementOrDirectiveProps, parsedVariables, false /* isIvyAst */);
                templateElementVars.push(...parsedVariables.map(v => t.VariableAst.fromParsedVariable(v)));
            }
            if (!hasBinding && !hasTemplateBinding) {
                // don't include the bindings as attributes as well in the AST
                attrs.push(this.visitAttribute(attr, null));
                matchableAttrs.push([attr.name, attr.value]);
            }
        });
        const elementCssSelector = createElementCssSelector(elName, matchableAttrs);
        const { directives: directiveMetas, matchElement } = this._parseDirectives(this.selectorMatcher, elementCssSelector);
        const references = [];
        const boundDirectivePropNames = new Set();
        const directiveAsts = this._createDirectiveAsts(isTemplateElement, element.name, directiveMetas, elementOrDirectiveProps, elementOrDirectiveRefs, element.sourceSpan, references, boundDirectivePropNames);
        const elementProps = this._createElementPropertyAsts(element.name, elementOrDirectiveProps, boundDirectivePropNames);
        const isViewRoot = parent.isTemplateElement || hasInlineTemplates;
        const providerContext = new ProviderElementContext(this.providerViewContext, parent.providerContext, isViewRoot, directiveAsts, attrs, references, isTemplateElement, queryStartIndex, element.sourceSpan);
        const children = html.visitAll(preparsedElement.nonBindable ? NON_BINDABLE_VISITOR : this, element.children, ElementContext.create(isTemplateElement, directiveAsts, isTemplateElement ? parent.providerContext : providerContext));
        providerContext.afterElement();
        // Override the actual selector when the `ngProjectAs` attribute is provided
        const projectionSelector = preparsedElement.projectAs != '' ?
            CssSelector.parse(preparsedElement.projectAs)[0] :
            elementCssSelector;
        const ngContentIndex = parent.findNgContentIndex(projectionSelector);
        let parsedElement;
        if (preparsedElement.type === PreparsedElementType.NG_CONTENT) {
            // `<ng-content>` element
            if (element.children && !element.children.every(_isEmptyTextNode)) {
                this._reportError(`<ng-content> element cannot have content.`, element.sourceSpan);
            }
            parsedElement = new t.NgContentAst(this.ngContentCount++, hasInlineTemplates ? null : ngContentIndex, element.sourceSpan);
        }
        else if (isTemplateElement) {
            // `<ng-template>` element
            this._assertAllEventsPublishedByDirectives(directiveAsts, events);
            this._assertNoComponentsNorElementBindingsOnTemplate(directiveAsts, elementProps, element.sourceSpan);
            parsedElement = new t.EmbeddedTemplateAst(attrs, events, references, elementVars, providerContext.transformedDirectiveAsts, providerContext.transformProviders, providerContext.transformedHasViewContainer, providerContext.queryMatches, children, hasInlineTemplates ? null : ngContentIndex, element.sourceSpan);
        }
        else {
            // element other than `<ng-content>` and `<ng-template>`
            this._assertElementExists(matchElement, element);
            this._assertOnlyOneComponent(directiveAsts, element.sourceSpan);
            const ngContentIndex = hasInlineTemplates ? null : parent.findNgContentIndex(projectionSelector);
            parsedElement = new t.ElementAst(elName, attrs, elementProps, events, references, providerContext.transformedDirectiveAsts, providerContext.transformProviders, providerContext.transformedHasViewContainer, providerContext.queryMatches, children, hasInlineTemplates ? null : ngContentIndex, element.sourceSpan, element.endSourceSpan || null);
        }
        if (hasInlineTemplates) {
            // The element as a *-attribute
            const templateQueryStartIndex = this.contentQueryStartId;
            const templateSelector = createElementCssSelector('ng-template', templateMatchableAttrs);
            const { directives } = this._parseDirectives(this.selectorMatcher, templateSelector);
            const templateBoundDirectivePropNames = new Set();
            const templateDirectiveAsts = this._createDirectiveAsts(true, elName, directives, templateElementOrDirectiveProps, [], element.sourceSpan, [], templateBoundDirectivePropNames);
            const templateElementProps = this._createElementPropertyAsts(elName, templateElementOrDirectiveProps, templateBoundDirectivePropNames);
            this._assertNoComponentsNorElementBindingsOnTemplate(templateDirectiveAsts, templateElementProps, element.sourceSpan);
            const templateProviderContext = new ProviderElementContext(this.providerViewContext, parent.providerContext, parent.isTemplateElement, templateDirectiveAsts, [], [], true, templateQueryStartIndex, element.sourceSpan);
            templateProviderContext.afterElement();
            parsedElement = new t.EmbeddedTemplateAst([], [], [], templateElementVars, templateProviderContext.transformedDirectiveAsts, templateProviderContext.transformProviders, templateProviderContext.transformedHasViewContainer, templateProviderContext.queryMatches, [parsedElement], ngContentIndex, element.sourceSpan);
        }
        return parsedElement;
    }
    _parseAttr(isTemplateElement, attr, targetMatchableAttrs, targetProps, targetEvents, targetRefs, targetVars) {
        const name = this._normalizeAttributeName(attr.name);
        const value = attr.value;
        const srcSpan = attr.sourceSpan;
        const absoluteOffset = attr.valueSpan ? attr.valueSpan.start.offset : srcSpan.start.offset;
        const boundEvents = [];
        const bindParts = name.match(BIND_NAME_REGEXP);
        let hasBinding = false;
        if (bindParts !== null) {
            hasBinding = true;
            if (bindParts[KW_BIND_IDX] != null) {
                this._bindingParser.parsePropertyBinding(bindParts[IDENT_KW_IDX], value, false, srcSpan, absoluteOffset, attr.valueSpan, targetMatchableAttrs, targetProps);
            }
            else if (bindParts[KW_LET_IDX]) {
                if (isTemplateElement) {
                    const identifier = bindParts[IDENT_KW_IDX];
                    this._parseVariable(identifier, value, srcSpan, targetVars);
                }
                else {
                    this._reportError(`"let-" is only supported on ng-template elements.`, srcSpan);
                }
            }
            else if (bindParts[KW_REF_IDX]) {
                const identifier = bindParts[IDENT_KW_IDX];
                this._parseReference(identifier, value, srcSpan, targetRefs);
            }
            else if (bindParts[KW_ON_IDX]) {
                this._bindingParser.parseEvent(bindParts[IDENT_KW_IDX], value, srcSpan, attr.valueSpan || srcSpan, targetMatchableAttrs, boundEvents);
            }
            else if (bindParts[KW_BINDON_IDX]) {
                this._bindingParser.parsePropertyBinding(bindParts[IDENT_KW_IDX], value, false, srcSpan, absoluteOffset, attr.valueSpan, targetMatchableAttrs, targetProps);
                this._parseAssignmentEvent(bindParts[IDENT_KW_IDX], value, srcSpan, attr.valueSpan || srcSpan, targetMatchableAttrs, boundEvents);
            }
            else if (bindParts[KW_AT_IDX]) {
                this._bindingParser.parseLiteralAttr(name, value, srcSpan, absoluteOffset, attr.valueSpan, targetMatchableAttrs, targetProps);
            }
            else if (bindParts[IDENT_BANANA_BOX_IDX]) {
                this._bindingParser.parsePropertyBinding(bindParts[IDENT_BANANA_BOX_IDX], value, false, srcSpan, absoluteOffset, attr.valueSpan, targetMatchableAttrs, targetProps);
                this._parseAssignmentEvent(bindParts[IDENT_BANANA_BOX_IDX], value, srcSpan, attr.valueSpan || srcSpan, targetMatchableAttrs, boundEvents);
            }
            else if (bindParts[IDENT_PROPERTY_IDX]) {
                this._bindingParser.parsePropertyBinding(bindParts[IDENT_PROPERTY_IDX], value, false, srcSpan, absoluteOffset, attr.valueSpan, targetMatchableAttrs, targetProps);
            }
            else if (bindParts[IDENT_EVENT_IDX]) {
                this._bindingParser.parseEvent(bindParts[IDENT_EVENT_IDX], value, srcSpan, attr.valueSpan || srcSpan, targetMatchableAttrs, boundEvents);
            }
        }
        else {
            hasBinding = this._bindingParser.parsePropertyInterpolation(name, value, srcSpan, attr.valueSpan, targetMatchableAttrs, targetProps);
        }
        if (!hasBinding) {
            this._bindingParser.parseLiteralAttr(name, value, srcSpan, absoluteOffset, attr.valueSpan, targetMatchableAttrs, targetProps);
        }
        targetEvents.push(...boundEvents.map(e => t.BoundEventAst.fromParsedEvent(e)));
        return hasBinding;
    }
    _normalizeAttributeName(attrName) {
        return /^data-/i.test(attrName) ? attrName.substring(5) : attrName;
    }
    _parseVariable(identifier, value, sourceSpan, targetVars) {
        if (identifier.indexOf('-') > -1) {
            this._reportError(`"-" is not allowed in variable names`, sourceSpan);
        }
        else if (identifier.length === 0) {
            this._reportError(`Variable does not have a name`, sourceSpan);
        }
        targetVars.push(new t.VariableAst(identifier, value, sourceSpan));
    }
    _parseReference(identifier, value, sourceSpan, targetRefs) {
        if (identifier.indexOf('-') > -1) {
            this._reportError(`"-" is not allowed in reference names`, sourceSpan);
        }
        else if (identifier.length === 0) {
            this._reportError(`Reference does not have a name`, sourceSpan);
        }
        targetRefs.push(new ElementOrDirectiveRef(identifier, value, sourceSpan));
    }
    _parseAssignmentEvent(name, expression, sourceSpan, valueSpan, targetMatchableAttrs, targetEvents) {
        this._bindingParser.parseEvent(`${name}Change`, `${expression}=$event`, sourceSpan, valueSpan, targetMatchableAttrs, targetEvents);
    }
    _parseDirectives(selectorMatcher, elementCssSelector) {
        // Need to sort the directives so that we get consistent results throughout,
        // as selectorMatcher uses Maps inside.
        // Also deduplicate directives as they might match more than one time!
        const directives = newArray(this.directivesIndex.size);
        // Whether any directive selector matches on the element name
        let matchElement = false;
        selectorMatcher.match(elementCssSelector, (selector, directive) => {
            directives[this.directivesIndex.get(directive)] = directive;
            matchElement = matchElement || selector.hasElementSelector();
        });
        return {
            directives: directives.filter(dir => !!dir),
            matchElement,
        };
    }
    _createDirectiveAsts(isTemplateElement, elementName, directives, props, elementOrDirectiveRefs, elementSourceSpan, targetReferences, targetBoundDirectivePropNames) {
        const matchedReferences = new Set();
        let component = null;
        const directiveAsts = directives.map((directive) => {
            const sourceSpan = new ParseSourceSpan(elementSourceSpan.start, elementSourceSpan.end, elementSourceSpan.fullStart, `Directive ${identifierName(directive.type)}`);
            if (directive.isComponent) {
                component = directive;
            }
            const directiveProperties = [];
            const boundProperties = this._bindingParser.createDirectiveHostPropertyAsts(directive, elementName, sourceSpan);
            let hostProperties = boundProperties.map(prop => t.BoundElementPropertyAst.fromBoundProperty(prop));
            // Note: We need to check the host properties here as well,
            // as we don't know the element name in the DirectiveWrapperCompiler yet.
            hostProperties = this._checkPropertiesInSchema(elementName, hostProperties);
            const parsedEvents = this._bindingParser.createDirectiveHostEventAsts(directive, sourceSpan);
            this._createDirectivePropertyAsts(directive.inputs, props, directiveProperties, targetBoundDirectivePropNames);
            elementOrDirectiveRefs.forEach((elOrDirRef) => {
                if ((elOrDirRef.value.length === 0 && directive.isComponent) ||
                    (elOrDirRef.isReferenceToDirective(directive))) {
                    targetReferences.push(new t.ReferenceAst(elOrDirRef.name, createTokenForReference(directive.type.reference), elOrDirRef.value, elOrDirRef.sourceSpan));
                    matchedReferences.add(elOrDirRef.name);
                }
            });
            const hostEvents = parsedEvents.map(e => t.BoundEventAst.fromParsedEvent(e));
            const contentQueryStartId = this.contentQueryStartId;
            this.contentQueryStartId += directive.queries.length;
            return new t.DirectiveAst(directive, directiveProperties, hostProperties, hostEvents, contentQueryStartId, sourceSpan);
        });
        elementOrDirectiveRefs.forEach((elOrDirRef) => {
            if (elOrDirRef.value.length > 0) {
                if (!matchedReferences.has(elOrDirRef.name)) {
                    this._reportError(`There is no directive with "exportAs" set to "${elOrDirRef.value}"`, elOrDirRef.sourceSpan);
                }
            }
            else if (!component) {
                let refToken = null;
                if (isTemplateElement) {
                    refToken = createTokenForExternalReference(this.reflector, Identifiers.TemplateRef);
                }
                targetReferences.push(new t.ReferenceAst(elOrDirRef.name, refToken, elOrDirRef.value, elOrDirRef.sourceSpan));
            }
        });
        return directiveAsts;
    }
    _createDirectivePropertyAsts(directiveProperties, boundProps, targetBoundDirectiveProps, targetBoundDirectivePropNames) {
        if (directiveProperties) {
            const boundPropsByName = new Map();
            boundProps.forEach(boundProp => {
                const prevValue = boundPropsByName.get(boundProp.name);
                if (!prevValue || prevValue.isLiteral) {
                    // give [a]="b" a higher precedence than a="b" on the same element
                    boundPropsByName.set(boundProp.name, boundProp);
                }
            });
            Object.keys(directiveProperties).forEach(dirProp => {
                const elProp = directiveProperties[dirProp];
                const boundProp = boundPropsByName.get(elProp);
                // Bindings are optional, so this binding only needs to be set up if an expression is given.
                if (boundProp) {
                    targetBoundDirectivePropNames.add(boundProp.name);
                    if (!isEmptyExpression(boundProp.expression)) {
                        targetBoundDirectiveProps.push(new t.BoundDirectivePropertyAst(dirProp, boundProp.name, boundProp.expression, boundProp.sourceSpan));
                    }
                }
            });
        }
    }
    _createElementPropertyAsts(elementName, props, boundDirectivePropNames) {
        const boundElementProps = [];
        props.forEach((prop) => {
            if (!prop.isLiteral && !boundDirectivePropNames.has(prop.name)) {
                const boundProp = this._bindingParser.createBoundElementProperty(elementName, prop);
                boundElementProps.push(t.BoundElementPropertyAst.fromBoundProperty(boundProp));
            }
        });
        return this._checkPropertiesInSchema(elementName, boundElementProps);
    }
    _findComponentDirectives(directives) {
        return directives.filter(directive => directive.directive.isComponent);
    }
    _findComponentDirectiveNames(directives) {
        return this._findComponentDirectives(directives)
            .map(directive => identifierName(directive.directive.type));
    }
    _assertOnlyOneComponent(directives, sourceSpan) {
        const componentTypeNames = this._findComponentDirectiveNames(directives);
        if (componentTypeNames.length > 1) {
            this._reportError(`More than one component matched on this element.\n` +
                `Make sure that only one component's selector can match a given element.\n` +
                `Conflicting components: ${componentTypeNames.join(',')}`, sourceSpan);
        }
    }
    /**
     * Make sure that non-angular tags conform to the schemas.
     *
     * Note: An element is considered an angular tag when at least one directive selector matches the
     * tag name.
     *
     * @param matchElement Whether any directive has matched on the tag name
     * @param element the html element
     */
    _assertElementExists(matchElement, element) {
        const elName = element.name.replace(/^:xhtml:/, '');
        if (!matchElement && !this._schemaRegistry.hasElement(elName, this._schemas)) {
            let errorMsg = `'${elName}' is not a known element:\n`;
            errorMsg += `1. If '${elName}' is an Angular component, then verify that it is part of this module.\n`;
            if (elName.indexOf('-') > -1) {
                errorMsg += `2. If '${elName}' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.`;
            }
            else {
                errorMsg +=
                    `2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.`;
            }
            this._reportError(errorMsg, element.sourceSpan);
        }
    }
    _assertNoComponentsNorElementBindingsOnTemplate(directives, elementProps, sourceSpan) {
        const componentTypeNames = this._findComponentDirectiveNames(directives);
        if (componentTypeNames.length > 0) {
            this._reportError(`Components on an embedded template: ${componentTypeNames.join(',')}`, sourceSpan);
        }
        elementProps.forEach(prop => {
            this._reportError(`Property binding ${prop.name} not used by any directive on an embedded template. Make sure that the property name is spelled correctly and all directives are listed in the "@NgModule.declarations".`, sourceSpan);
        });
    }
    _assertAllEventsPublishedByDirectives(directives, events) {
        const allDirectiveEvents = new Set();
        directives.forEach(directive => {
            Object.keys(directive.directive.outputs).forEach(k => {
                const eventName = directive.directive.outputs[k];
                allDirectiveEvents.add(eventName);
            });
        });
        events.forEach(event => {
            if (event.target != null || !allDirectiveEvents.has(event.name)) {
                this._reportError(`Event binding ${event
                    .fullName} not emitted by any directive on an embedded template. Make sure that the event name is spelled correctly and all directives are listed in the "@NgModule.declarations".`, event.sourceSpan);
            }
        });
    }
    _checkPropertiesInSchema(elementName, boundProps) {
        // Note: We can't filter out empty expressions before this method,
        // as we still want to validate them!
        return boundProps.filter((boundProp) => {
            if (boundProp.type === 0 /* Property */ &&
                !this._schemaRegistry.hasProperty(elementName, boundProp.name, this._schemas)) {
                let errorMsg = `Can't bind to '${boundProp.name}' since it isn't a known property of '${elementName}'.`;
                if (elementName.startsWith('ng-')) {
                    errorMsg +=
                        `\n1. If '${boundProp
                            .name}' is an Angular directive, then add 'CommonModule' to the '@NgModule.imports' of this component.` +
                            `\n2. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.`;
                }
                else if (elementName.indexOf('-') > -1) {
                    errorMsg +=
                        `\n1. If '${elementName}' is an Angular component and it has '${boundProp.name}' input, then verify that it is part of this module.` +
                            `\n2. If '${elementName}' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.` +
                            `\n3. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.`;
                }
                this._reportError(errorMsg, boundProp.sourceSpan);
            }
            return !isEmptyExpression(boundProp.value);
        });
    }
    _reportError(message, sourceSpan, level = ParseErrorLevel.ERROR) {
        this._targetErrors.push(new ParseError(sourceSpan, message, level));
    }
}
class NonBindableVisitor {
    visitElement(ast, parent) {
        const preparsedElement = preparseElement(ast);
        if (preparsedElement.type === PreparsedElementType.SCRIPT ||
            preparsedElement.type === PreparsedElementType.STYLE ||
            preparsedElement.type === PreparsedElementType.STYLESHEET) {
            // Skipping <script> for security reasons
            // Skipping <style> and stylesheets as we already processed them
            // in the StyleCompiler
            return null;
        }
        const attrNameAndValues = ast.attrs.map((attr) => [attr.name, attr.value]);
        const selector = createElementCssSelector(ast.name, attrNameAndValues);
        const ngContentIndex = parent.findNgContentIndex(selector);
        const children = html.visitAll(this, ast.children, EMPTY_ELEMENT_CONTEXT);
        return new t.ElementAst(ast.name, html.visitAll(this, ast.attrs), [], [], [], [], [], false, [], children, ngContentIndex, ast.sourceSpan, ast.endSourceSpan);
    }
    visitComment(comment, context) {
        return null;
    }
    visitAttribute(attribute, context) {
        return new t.AttrAst(attribute.name, attribute.value, attribute.sourceSpan);
    }
    visitText(text, parent) {
        const ngContentIndex = parent.findNgContentIndex(TEXT_CSS_SELECTOR());
        return new t.TextAst(text.value, ngContentIndex, text.sourceSpan);
    }
    visitExpansion(expansion, context) {
        return expansion;
    }
    visitExpansionCase(expansionCase, context) {
        return expansionCase;
    }
}
/**
 * A reference to an element or directive in a template. E.g., the reference in this template:
 *
 * <div #myMenu="coolMenu">
 *
 * would be {name: 'myMenu', value: 'coolMenu', sourceSpan: ...}
 */
class ElementOrDirectiveRef {
    constructor(name, value, sourceSpan) {
        this.name = name;
        this.value = value;
        this.sourceSpan = sourceSpan;
    }
    /** Gets whether this is a reference to the given directive. */
    isReferenceToDirective(directive) {
        return splitExportAs(directive.exportAs).indexOf(this.value) !== -1;
    }
}
/** Splits a raw, potentially comma-delimited `exportAs` value into an array of names. */
function splitExportAs(exportAs) {
    return exportAs ? exportAs.split(',').map(e => e.trim()) : [];
}
export function splitClasses(classAttrValue) {
    return classAttrValue.trim().split(/\s+/g);
}
class ElementContext {
    constructor(isTemplateElement, _ngContentIndexMatcher, _wildcardNgContentIndex, providerContext) {
        this.isTemplateElement = isTemplateElement;
        this._ngContentIndexMatcher = _ngContentIndexMatcher;
        this._wildcardNgContentIndex = _wildcardNgContentIndex;
        this.providerContext = providerContext;
    }
    static create(isTemplateElement, directives, providerContext) {
        const matcher = new SelectorMatcher();
        let wildcardNgContentIndex = null;
        const component = directives.find(directive => directive.directive.isComponent);
        if (component) {
            const ngContentSelectors = component.directive.template.ngContentSelectors;
            for (let i = 0; i < ngContentSelectors.length; i++) {
                const selector = ngContentSelectors[i];
                if (selector === '*') {
                    wildcardNgContentIndex = i;
                }
                else {
                    matcher.addSelectables(CssSelector.parse(ngContentSelectors[i]), i);
                }
            }
        }
        return new ElementContext(isTemplateElement, matcher, wildcardNgContentIndex, providerContext);
    }
    findNgContentIndex(selector) {
        const ngContentIndices = [];
        this._ngContentIndexMatcher.match(selector, (selector, ngContentIndex) => {
            ngContentIndices.push(ngContentIndex);
        });
        ngContentIndices.sort();
        if (this._wildcardNgContentIndex != null) {
            ngContentIndices.push(this._wildcardNgContentIndex);
        }
        return ngContentIndices.length > 0 ? ngContentIndices[0] : null;
    }
}
export function createElementCssSelector(elementName, attributes) {
    const cssSelector = new CssSelector();
    const elNameNoNs = splitNsName(elementName)[1];
    cssSelector.setElement(elNameNoNs);
    for (let i = 0; i < attributes.length; i++) {
        const attrName = attributes[i][0];
        const attrNameNoNs = splitNsName(attrName)[1];
        const attrValue = attributes[i][1];
        cssSelector.addAttribute(attrNameNoNs, attrValue);
        if (attrName.toLowerCase() == CLASS_ATTR) {
            const classes = splitClasses(attrValue);
            classes.forEach(className => cssSelector.addClassName(className));
        }
    }
    return cssSelector;
}
const EMPTY_ELEMENT_CONTEXT = new ElementContext(true, new SelectorMatcher(), null, null);
const NON_BINDABLE_VISITOR = new NonBindableVisitor();
function _isEmptyTextNode(node) {
    return node instanceof html.Text && node.value.trim().length == 0;
}
export function removeSummaryDuplicates(items) {
    const map = new Map();
    items.forEach((item) => {
        if (!map.get(item.type.reference)) {
            map.set(item.type.reference, item);
        }
    });
    return Array.from(map.values());
}
export function isEmptyExpression(ast) {
    if (ast instanceof ASTWithSource) {
        ast = ast.ast;
    }
    return ast instanceof EmptyExpr;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXIvc3JjL3RlbXBsYXRlX3BhcnNlci90ZW1wbGF0ZV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBTUgsT0FBTyxFQUFNLGFBQWEsRUFBRSxTQUFTLEVBQThDLE1BQU0sMEJBQTBCLENBQUM7QUFFcEgsT0FBTyxFQUFDLCtCQUErQixFQUFFLHVCQUF1QixFQUFFLFdBQVcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3JHLE9BQU8sS0FBSyxJQUFJLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFhLGVBQWUsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxpQkFBaUIsRUFBRSxXQUFXLEVBQUMsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RSxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFDLFlBQVksRUFBRSxXQUFXLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1RCxPQUFPLEVBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RyxPQUFPLEVBQUMsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUVqRixPQUFPLEVBQUMsV0FBVyxFQUFFLGVBQWUsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUN6RCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUMzRCxPQUFPLEVBQVUsUUFBUSxFQUFDLE1BQU0sU0FBUyxDQUFDO0FBRTFDLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FB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LEtBQVU7SUFDdkYsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUU5QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxHQUFRO0lBQ3hDLElBQUksR0FBRyxZQUFZLGFBQWEsRUFBRTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztLQUNmO0lBQ0QsT0FBTyxHQUFHLFlBQVksU0FBUyxDQUFDO0FBQ2xDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5LCBDb21waWxlUGlwZVN1bW1hcnksIENvbXBpbGVUb2tlbk1ldGFkYXRhLCBDb21waWxlVHlwZU1ldGFkYXRhfSBmcm9tICcuLi9jb21waWxlX21ldGFkYXRhJztcbmltcG9ydCB7Q29tcGlsZVJlZmxlY3Rvcn0gZnJvbSAnLi4vY29tcGlsZV9yZWZsZWN0b3InO1xuaW1wb3J0IHtDb21waWxlckNvbmZpZ30gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7U2NoZW1hTWV0YWRhdGF9IGZyb20gJy4uL2NvcmUnO1xuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEVtcHR5RXhwciwgUGFyc2VkRXZlbnQsIFBhcnNlZFByb3BlcnR5LCBQYXJzZWRWYXJpYWJsZX0gZnJvbSAnLi4vZXhwcmVzc2lvbl9wYXJzZXIvYXN0JztcbmltcG9ydCB7UGFyc2VyfSBmcm9tICcuLi9leHByZXNzaW9uX3BhcnNlci9wYXJzZXInO1xuaW1wb3J0IHtjcmVhdGVUb2tlbkZvckV4dGVybmFsUmVmZXJlbmNlLCBjcmVhdGVUb2tlbkZvclJlZmVyZW5jZSwgSWRlbnRpZmllcnN9IGZyb20gJy4uL2lkZW50aWZpZXJzJztcbmltcG9ydCAqIGFzIGh0bWwgZnJvbSAnLi4vbWxfcGFyc2VyL2FzdCc7XG5pbXBvcnQge0h0bWxQYXJzZXIsIFBhcnNlVHJlZVJlc3VsdH0gZnJvbSAnLi4vbWxfcGFyc2VyL2h0bWxfcGFyc2VyJztcbmltcG9ydCB7cmVtb3ZlV2hpdGVzcGFjZXMsIHJlcGxhY2VOZ3NwfSBmcm9tICcuLi9tbF9wYXJzZXIvaHRtbF93aGl0ZXNwYWNlcyc7XG5pbXBvcnQge2V4cGFuZE5vZGVzfSBmcm9tICcuLi9tbF9wYXJzZXIvaWN1X2FzdF9leHBhbmRlcic7XG5pbXBvcnQge0ludGVycG9sYXRpb25Db25maWd9IGZyb20gJy4uL21sX3BhcnNlci9pbnRlcnBvbGF0aW9uX2NvbmZpZyc7XG5pbXBvcnQge2lzTmdUZW1wbGF0ZSwgc3BsaXROc05hbWV9IGZyb20gJy4uL21sX3BhcnNlci90YWdzJztcbmltcG9ydCB7aWRlbnRpZmllck5hbWUsIFBhcnNlRXJyb3IsIFBhcnNlRXJyb3JMZXZlbCwgUGFyc2VTb3VyY2VTcGFuLCBzeW50YXhFcnJvcn0gZnJvbSAnLi4vcGFyc2VfdXRpbCc7XG5pbXBvcnQge1Byb3ZpZGVyRWxlbWVudENvbnRleHQsIFByb3ZpZGVyVmlld0NvbnRleHR9IGZyb20gJy4uL3Byb3ZpZGVyX2FuYWx5emVyJztcbmltcG9ydCB7RWxlbWVudFNjaGVtYVJlZ2lzdHJ5fSBmcm9tICcuLi9zY2hlbWEvZWxlbWVudF9zY2hlbWFfcmVnaXN0cnknO1xuaW1wb3J0IHtDc3NTZWxlY3RvciwgU2VsZWN0b3JNYXRjaGVyfSBmcm9tICcuLi9zZWxlY3Rvcic7XG5pbXBvcnQge2lzU3R5bGVVcmxSZXNvbHZhYmxlfSBmcm9tICcuLi9zdHlsZV91cmxfcmVzb2x2ZXInO1xuaW1wb3J0IHtDb25zb2xlLCBuZXdBcnJheX0gZnJvbSAnLi4vdXRpbCc7XG5cbmltcG9ydCB7QmluZGluZ1BhcnNlcn0gZnJvbSAnLi9iaW5kaW5nX3BhcnNlcic7XG5pbXBvcnQgKiBhcyB0IGZyb20gJy4vdGVtcGxhdGVfYXN0JztcbmltcG9ydCB7UHJlcGFyc2VkRWxlbWVudFR5cGUsIHByZXBhcnNlRWxlbWVudH0gZnJvbSAnLi90ZW1wbGF0ZV9wcmVwYXJzZXInO1xuXG5jb25zdCBCSU5EX05BTUVfUkVHRVhQID1cbiAgICAvXig/Oig/Oig/OihiaW5kLSl8KGxldC0pfChyZWYtfCMpfChvbi0pfChiaW5kb24tKXwoQCkpKC4qKSl8XFxbXFwoKFteXFwpXSspXFwpXFxdfFxcWyhbXlxcXV0rKVxcXXxcXCgoW15cXCldKylcXCkpJC87XG5cbi8vIEdyb3VwIDEgPSBcImJpbmQtXCJcbmNvbnN0IEtXX0JJTkRfSURYID0gMTtcbi8vIEdyb3VwIDIgPSBcImxldC1cIlxuY29uc3QgS1dfTEVUX0lEWCA9IDI7XG4vLyBHcm91cCAzID0gXCJyZWYtLyNcIlxuY29uc3QgS1dfUkVGX0lEWCA9IDM7XG4vLyBHcm91cCA0ID0gXCJvbi1cIlxuY29uc3QgS1dfT05fSURYID0gNDtcbi8vIEdyb3VwIDUgPSBcImJpbmRvbi1cIlxuY29uc3QgS1dfQklORE9OX0lEWCA9IDU7XG4vLyBHcm91cCA2ID0gXCJAXCJcbmNvbnN0IEtXX0FUX0lEWCA9IDY7XG4vLyBHcm91cCA3ID0gdGhlIGlkZW50aWZpZXIgYWZ0ZXIgXCJiaW5kLVwiLCBcImxldC1cIiwgXCJyZWYtLyNcIiwgXCJvbi1cIiwgXCJiaW5kb24tXCIgb3IgXCJAXCJcbmNvbnN0IElERU5UX0tXX0lEWCA9IDc7XG4vLyBHcm91cCA4ID0gaWRlbnRpZmllciBpbnNpZGUgWygpXVxuY29uc3QgSURFTlRfQkFOQU5BX0JPWF9JRFggPSA4O1xuLy8gR3JvdXAgOSA9IGlkZW50aWZpZXIgaW5zaWRlIFtdXG5jb25zdCBJREVOVF9QUk9QRVJUWV9JRFggPSA5O1xuLy8gR3JvdXAgMTAgPSBpZGVudGlmaWVyIGluc2lkZSAoKVxuY29uc3QgSURFTlRfRVZFTlRfSURYID0gMTA7XG5cbmNvbnN0IFRFTVBMQVRFX0FUVFJfUFJFRklYID0gJyonO1xuY29uc3QgQ0xBU1NfQVRUUiA9ICdjbGFzcyc7XG5cbmxldCBfVEVYVF9DU1NfU0VMRUNUT1IhOiBDc3NTZWxlY3RvcjtcbmZ1bmN0aW9uIFRFWFRfQ1NTX1NFTEVDVE9SKCk6IENzc1NlbGVjdG9yIHtcbiAgaWYgKCFfVEVYVF9DU1NfU0VMRUNUT1IpIHtcbiAgICBfVEVYVF9DU1NfU0VMRUNUT1IgPSBDc3NTZWxlY3Rvci5wYXJzZSgnKicpWzBdO1xuICB9XG4gIHJldHVybiBfVEVYVF9DU1NfU0VMRUNUT1I7XG59XG5cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZVBhcnNlRXJyb3IgZXh0ZW5kcyBQYXJzZUVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGxldmVsOiBQYXJzZUVycm9yTGV2ZWwpIHtcbiAgICBzdXBlcihzcGFuLCBtZXNzYWdlLCBsZXZlbCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlUGFyc2VSZXN1bHQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyB0ZW1wbGF0ZUFzdD86IHQuVGVtcGxhdGVBc3RbXSwgcHVibGljIHVzZWRQaXBlcz86IENvbXBpbGVQaXBlU3VtbWFyeVtdLFxuICAgICAgcHVibGljIGVycm9ycz86IFBhcnNlRXJyb3JbXSkge31cbn1cblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlUGFyc2VyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIF9jb25maWc6IENvbXBpbGVyQ29uZmlnLCBwcml2YXRlIF9yZWZsZWN0b3I6IENvbXBpbGVSZWZsZWN0b3IsXG4gICAgICBwcml2YXRlIF9leHByUGFyc2VyOiBQYXJzZXIsIHByaXZhdGUgX3NjaGVtYVJlZ2lzdHJ5OiBFbGVtZW50U2NoZW1hUmVnaXN0cnksXG4gICAgICBwcml2YXRlIF9odG1sUGFyc2VyOiBIdG1sUGFyc2VyLCBwcml2YXRlIF9jb25zb2xlOiBDb25zb2xlfG51bGwsXG4gICAgICBwdWJsaWMgdHJhbnNmb3JtczogdC5UZW1wbGF0ZUFzdFZpc2l0b3JbXSkge31cblxuICBwdWJsaWMgZ2V0IGV4cHJlc3Npb25QYXJzZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2V4cHJQYXJzZXI7XG4gIH1cblxuICBwYXJzZShcbiAgICAgIGNvbXBvbmVudDogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLCB0ZW1wbGF0ZTogc3RyaW5nfFBhcnNlVHJlZVJlc3VsdCxcbiAgICAgIGRpcmVjdGl2ZXM6IENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5W10sIHBpcGVzOiBDb21waWxlUGlwZVN1bW1hcnlbXSwgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSxcbiAgICAgIHRlbXBsYXRlVXJsOiBzdHJpbmcsXG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuKToge3RlbXBsYXRlOiB0LlRlbXBsYXRlQXN0W10sIHBpcGVzOiBDb21waWxlUGlwZVN1bW1hcnlbXX0ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudHJ5UGFyc2UoXG4gICAgICAgIGNvbXBvbmVudCwgdGVtcGxhdGUsIGRpcmVjdGl2ZXMsIHBpcGVzLCBzY2hlbWFzLCB0ZW1wbGF0ZVVybCwgcHJlc2VydmVXaGl0ZXNwYWNlcyk7XG4gICAgY29uc3Qgd2FybmluZ3MgPSByZXN1bHQuZXJyb3JzIS5maWx0ZXIoZXJyb3IgPT4gZXJyb3IubGV2ZWwgPT09IFBhcnNlRXJyb3JMZXZlbC5XQVJOSU5HKTtcblxuICAgIGNvbnN0IGVycm9ycyA9IHJlc3VsdC5lcnJvcnMhLmZpbHRlcihlcnJvciA9PiBlcnJvci5sZXZlbCA9PT0gUGFyc2VFcnJvckxldmVsLkVSUk9SKTtcblxuICAgIGlmICh3YXJuaW5ncy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9jb25zb2xlPy53YXJuKGBUZW1wbGF0ZSBwYXJzZSB3YXJuaW5nczpcXG4ke3dhcm5pbmdzLmpvaW4oJ1xcbicpfWApO1xuICAgIH1cblxuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZXJyb3JTdHJpbmcgPSBlcnJvcnMuam9pbignXFxuJyk7XG4gICAgICB0aHJvdyBzeW50YXhFcnJvcihgVGVtcGxhdGUgcGFyc2UgZXJyb3JzOlxcbiR7ZXJyb3JTdHJpbmd9YCwgZXJyb3JzKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3RlbXBsYXRlOiByZXN1bHQudGVtcGxhdGVBc3QhLCBwaXBlczogcmVzdWx0LnVzZWRQaXBlcyF9O1xuICB9XG5cbiAgdHJ5UGFyc2UoXG4gICAgICBjb21wb25lbnQ6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSwgdGVtcGxhdGU6IHN0cmluZ3xQYXJzZVRyZWVSZXN1bHQsXG4gICAgICBkaXJlY3RpdmVzOiBDb21waWxlRGlyZWN0aXZlU3VtbWFyeVtdLCBwaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10sIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10sXG4gICAgICB0ZW1wbGF0ZVVybDogc3RyaW5nLCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuKTogVGVtcGxhdGVQYXJzZVJlc3VsdCB7XG4gICAgbGV0IGh0bWxQYXJzZVJlc3VsdCA9IHR5cGVvZiB0ZW1wbGF0ZSA9PT0gJ3N0cmluZycgP1xuICAgICAgICB0aGlzLl9odG1sUGFyc2VyIS5wYXJzZSh0ZW1wbGF0ZSwgdGVtcGxhdGVVcmwsIHtcbiAgICAgICAgICB0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlLFxuICAgICAgICAgIGludGVycG9sYXRpb25Db25maWc6IHRoaXMuZ2V0SW50ZXJwb2xhdGlvbkNvbmZpZyhjb21wb25lbnQpXG4gICAgICAgIH0pIDpcbiAgICAgICAgdGVtcGxhdGU7XG5cbiAgICBpZiAoIXByZXNlcnZlV2hpdGVzcGFjZXMpIHtcbiAgICAgIGh0bWxQYXJzZVJlc3VsdCA9IHJlbW92ZVdoaXRlc3BhY2VzKGh0bWxQYXJzZVJlc3VsdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudHJ5UGFyc2VIdG1sKFxuICAgICAgICB0aGlzLmV4cGFuZEh0bWwoaHRtbFBhcnNlUmVzdWx0KSwgY29tcG9uZW50LCBkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hcyk7XG4gIH1cblxuICB0cnlQYXJzZUh0bWwoXG4gICAgICBodG1sQXN0V2l0aEVycm9yczogUGFyc2VUcmVlUmVzdWx0LCBjb21wb25lbnQ6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSxcbiAgICAgIGRpcmVjdGl2ZXM6IENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5W10sIHBpcGVzOiBDb21waWxlUGlwZVN1bW1hcnlbXSxcbiAgICAgIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiBUZW1wbGF0ZVBhcnNlUmVzdWx0IHtcbiAgICBsZXQgcmVzdWx0OiB0LlRlbXBsYXRlQXN0W107XG4gICAgY29uc3QgZXJyb3JzID0gaHRtbEFzdFdpdGhFcnJvcnMuZXJyb3JzO1xuICAgIGNvbnN0IHVzZWRQaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10gPSBbXTtcbiAgICBpZiAoaHRtbEFzdFdpdGhFcnJvcnMucm9vdE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHVuaXFEaXJlY3RpdmVzID0gcmVtb3ZlU3VtbWFyeUR1cGxpY2F0ZXMoZGlyZWN0aXZlcyk7XG4gICAgICBjb25zdCB1bmlxUGlwZXMgPSByZW1vdmVTdW1tYXJ5RHVwbGljYXRlcyhwaXBlcyk7XG4gICAgICBjb25zdCBwcm92aWRlclZpZXdDb250ZXh0ID0gbmV3IFByb3ZpZGVyVmlld0NvbnRleHQodGhpcy5fcmVmbGVjdG9yLCBjb21wb25lbnQpO1xuICAgICAgbGV0IGludGVycG9sYXRpb25Db25maWc6IEludGVycG9sYXRpb25Db25maWcgPSB1bmRlZmluZWQhO1xuICAgICAgaWYgKGNvbXBvbmVudC50ZW1wbGF0ZSAmJiBjb21wb25lbnQudGVtcGxhdGUuaW50ZXJwb2xhdGlvbikge1xuICAgICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnID0ge1xuICAgICAgICAgIHN0YXJ0OiBjb21wb25lbnQudGVtcGxhdGUuaW50ZXJwb2xhdGlvblswXSxcbiAgICAgICAgICBlbmQ6IGNvbXBvbmVudC50ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uWzFdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBjb25zdCBiaW5kaW5nUGFyc2VyID0gbmV3IEJpbmRpbmdQYXJzZXIoXG4gICAgICAgICAgdGhpcy5fZXhwclBhcnNlciwgaW50ZXJwb2xhdGlvbkNvbmZpZyEsIHRoaXMuX3NjaGVtYVJlZ2lzdHJ5LCB1bmlxUGlwZXMsIGVycm9ycyk7XG4gICAgICBjb25zdCBwYXJzZVZpc2l0b3IgPSBuZXcgVGVtcGxhdGVQYXJzZVZpc2l0b3IoXG4gICAgICAgICAgdGhpcy5fcmVmbGVjdG9yLCB0aGlzLl9jb25maWcsIHByb3ZpZGVyVmlld0NvbnRleHQsIHVuaXFEaXJlY3RpdmVzLCBiaW5kaW5nUGFyc2VyLFxuICAgICAgICAgIHRoaXMuX3NjaGVtYVJlZ2lzdHJ5LCBzY2hlbWFzLCBlcnJvcnMpO1xuICAgICAgcmVzdWx0ID0gaHRtbC52aXNpdEFsbChwYXJzZVZpc2l0b3IsIGh0bWxBc3RXaXRoRXJyb3JzLnJvb3ROb2RlcywgRU1QVFlfRUxFTUVOVF9DT05URVhUKTtcbiAgICAgIGVycm9ycy5wdXNoKC4uLnByb3ZpZGVyVmlld0NvbnRleHQuZXJyb3JzKTtcbiAgICAgIHVzZWRQaXBlcy5wdXNoKC4uLmJpbmRpbmdQYXJzZXIuZ2V0VXNlZFBpcGVzKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSBbXTtcbiAgICB9XG4gICAgdGhpcy5fYXNzZXJ0Tm9SZWZlcmVuY2VEdXBsaWNhdGlvbk9uVGVtcGxhdGUocmVzdWx0LCBlcnJvcnMpO1xuXG4gICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gbmV3IFRlbXBsYXRlUGFyc2VSZXN1bHQocmVzdWx0LCB1c2VkUGlwZXMsIGVycm9ycyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudHJhbnNmb3Jtcykge1xuICAgICAgdGhpcy50cmFuc2Zvcm1zLmZvckVhY2goKHRyYW5zZm9ybTogdC5UZW1wbGF0ZUFzdFZpc2l0b3IpID0+IHtcbiAgICAgICAgcmVzdWx0ID0gdC50ZW1wbGF0ZVZpc2l0QWxsKHRyYW5zZm9ybSwgcmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVGVtcGxhdGVQYXJzZVJlc3VsdChyZXN1bHQsIHVzZWRQaXBlcywgZXJyb3JzKTtcbiAgfVxuXG4gIGV4cGFuZEh0bWwoaHRtbEFzdFdpdGhFcnJvcnM6IFBhcnNlVHJlZVJlc3VsdCwgZm9yY2VkOiBib29sZWFuID0gZmFsc2UpOiBQYXJzZVRyZWVSZXN1bHQge1xuICAgIGNvbnN0IGVycm9yczogUGFyc2VFcnJvcltdID0gaHRtbEFzdFdpdGhFcnJvcnMuZXJyb3JzO1xuXG4gICAgaWYgKGVycm9ycy5sZW5ndGggPT0gMCB8fCBmb3JjZWQpIHtcbiAgICAgIC8vIFRyYW5zZm9ybSBJQ1UgbWVzc2FnZXMgdG8gYW5ndWxhciBkaXJlY3RpdmVzXG4gICAgICBjb25zdCBleHBhbmRlZEh0bWxBc3QgPSBleHBhbmROb2RlcyhodG1sQXN0V2l0aEVycm9ycy5yb290Tm9kZXMpO1xuICAgICAgZXJyb3JzLnB1c2goLi4uZXhwYW5kZWRIdG1sQXN0LmVycm9ycyk7XG4gICAgICBodG1sQXN0V2l0aEVycm9ycyA9IG5ldyBQYXJzZVRyZWVSZXN1bHQoZXhwYW5kZWRIdG1sQXN0Lm5vZGVzLCBlcnJvcnMpO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbEFzdFdpdGhFcnJvcnM7XG4gIH1cblxuICBnZXRJbnRlcnBvbGF0aW9uQ29uZmlnKGNvbXBvbmVudDogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhKTogSW50ZXJwb2xhdGlvbkNvbmZpZ3x1bmRlZmluZWQge1xuICAgIGlmIChjb21wb25lbnQudGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBJbnRlcnBvbGF0aW9uQ29uZmlnLmZyb21BcnJheShjb21wb25lbnQudGVtcGxhdGUuaW50ZXJwb2xhdGlvbik7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF9hc3NlcnROb1JlZmVyZW5jZUR1cGxpY2F0aW9uT25UZW1wbGF0ZShyZXN1bHQ6IHQuVGVtcGxhdGVBc3RbXSwgZXJyb3JzOiBUZW1wbGF0ZVBhcnNlRXJyb3JbXSk6XG4gICAgICB2b2lkIHtcbiAgICBjb25zdCBleGlzdGluZ1JlZmVyZW5jZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICByZXN1bHQuZmlsdGVyKGVsZW1lbnQgPT4gISEoPGFueT5lbGVtZW50KS5yZWZlcmVuY2VzKVxuICAgICAgICAuZm9yRWFjaChlbGVtZW50ID0+ICg8YW55PmVsZW1lbnQpLnJlZmVyZW5jZXMuZm9yRWFjaCgocmVmZXJlbmNlOiB0LlJlZmVyZW5jZUFzdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSByZWZlcmVuY2UubmFtZTtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWZlcmVuY2VzLmluZGV4T2YobmFtZSkgPCAwKSB7XG4gICAgICAgICAgICBleGlzdGluZ1JlZmVyZW5jZXMucHVzaChuYW1lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgVGVtcGxhdGVQYXJzZUVycm9yKFxuICAgICAgICAgICAgICAgIGBSZWZlcmVuY2UgXCIjJHtuYW1lfVwiIGlzIGRlZmluZWQgc2V2ZXJhbCB0aW1lc2AsIHJlZmVyZW5jZS5zb3VyY2VTcGFuLFxuICAgICAgICAgICAgICAgIFBhcnNlRXJyb3JMZXZlbC5FUlJPUik7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gIH1cbn1cblxuY2xhc3MgVGVtcGxhdGVQYXJzZVZpc2l0b3IgaW1wbGVtZW50cyBodG1sLlZpc2l0b3Ige1xuICBzZWxlY3Rvck1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKCk7XG4gIGRpcmVjdGl2ZXNJbmRleCA9IG5ldyBNYXA8Q29tcGlsZURpcmVjdGl2ZVN1bW1hcnksIG51bWJlcj4oKTtcbiAgbmdDb250ZW50Q291bnQgPSAwO1xuICBjb250ZW50UXVlcnlTdGFydElkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogQ29tcGlsZVJlZmxlY3RvciwgcHJpdmF0ZSBjb25maWc6IENvbXBpbGVyQ29uZmlnLFxuICAgICAgcHVibGljIHByb3ZpZGVyVmlld0NvbnRleHQ6IFByb3ZpZGVyVmlld0NvbnRleHQsIGRpcmVjdGl2ZXM6IENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5W10sXG4gICAgICBwcml2YXRlIF9iaW5kaW5nUGFyc2VyOiBCaW5kaW5nUGFyc2VyLCBwcml2YXRlIF9zY2hlbWFSZWdpc3RyeTogRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBfc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSwgcHJpdmF0ZSBfdGFyZ2V0RXJyb3JzOiBUZW1wbGF0ZVBhcnNlRXJyb3JbXSkge1xuICAgIC8vIE5vdGU6IHF1ZXJpZXMgc3RhcnQgd2l0aCBpZCAxIHNvIHdlIGNhbiB1c2UgdGhlIG51bWJlciBpbiBhIEJsb29tIGZpbHRlciFcbiAgICB0aGlzLmNvbnRlbnRRdWVyeVN0YXJ0SWQgPSBwcm92aWRlclZpZXdDb250ZXh0LmNvbXBvbmVudC52aWV3UXVlcmllcy5sZW5ndGggKyAxO1xuICAgIGRpcmVjdGl2ZXMuZm9yRWFjaCgoZGlyZWN0aXZlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSBDc3NTZWxlY3Rvci5wYXJzZShkaXJlY3RpdmUuc2VsZWN0b3IhKTtcbiAgICAgIHRoaXMuc2VsZWN0b3JNYXRjaGVyLmFkZFNlbGVjdGFibGVzKHNlbGVjdG9yLCBkaXJlY3RpdmUpO1xuICAgICAgdGhpcy5kaXJlY3RpdmVzSW5kZXguc2V0KGRpcmVjdGl2ZSwgaW5kZXgpO1xuICAgIH0pO1xuICB9XG5cbiAgdmlzaXRFeHBhbnNpb24oZXhwYW5zaW9uOiBodG1sLkV4cGFuc2lvbiwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uQ2FzZShleHBhbnNpb25DYXNlOiBodG1sLkV4cGFuc2lvbkNhc2UsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB2aXNpdFRleHQodGV4dDogaHRtbC5UZXh0LCBwYXJlbnQ6IEVsZW1lbnRDb250ZXh0KTogYW55IHtcbiAgICBjb25zdCBuZ0NvbnRlbnRJbmRleCA9IHBhcmVudC5maW5kTmdDb250ZW50SW5kZXgoVEVYVF9DU1NfU0VMRUNUT1IoKSkhO1xuICAgIGNvbnN0IHZhbHVlTm9OZ3NwID0gcmVwbGFjZU5nc3AodGV4dC52YWx1ZSk7XG4gICAgY29uc3QgZXhwciA9IHRoaXMuX2JpbmRpbmdQYXJzZXIucGFyc2VJbnRlcnBvbGF0aW9uKHZhbHVlTm9OZ3NwLCB0ZXh0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBleHByID8gbmV3IHQuQm91bmRUZXh0QXN0KGV4cHIsIG5nQ29udGVudEluZGV4LCB0ZXh0LnNvdXJjZVNwYW4pIDpcbiAgICAgICAgICAgICAgICAgIG5ldyB0LlRleHRBc3QodmFsdWVOb05nc3AsIG5nQ29udGVudEluZGV4LCB0ZXh0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgdmlzaXRBdHRyaWJ1dGUoYXR0cmlidXRlOiBodG1sLkF0dHJpYnV0ZSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbmV3IHQuQXR0ckFzdChhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlLCBhdHRyaWJ1dGUuc291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdENvbW1lbnQoY29tbWVudDogaHRtbC5Db21tZW50LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IGh0bWwuRWxlbWVudCwgcGFyZW50OiBFbGVtZW50Q29udGV4dCk6IGFueSB7XG4gICAgY29uc3QgcXVlcnlTdGFydEluZGV4ID0gdGhpcy5jb250ZW50UXVlcnlTdGFydElkO1xuICAgIGNvbnN0IGVsTmFtZSA9IGVsZW1lbnQubmFtZTtcbiAgICBjb25zdCBwcmVwYXJzZWRFbGVtZW50ID0gcHJlcGFyc2VFbGVtZW50KGVsZW1lbnQpO1xuICAgIGlmIChwcmVwYXJzZWRFbGVtZW50LnR5cGUgPT09IFByZXBhcnNlZEVsZW1lbnRUeXBlLlNDUklQVCB8fFxuICAgICAgICBwcmVwYXJzZWRFbGVtZW50LnR5cGUgPT09IFByZXBhcnNlZEVsZW1lbnRUeXBlLlNUWUxFKSB7XG4gICAgICAvLyBTa2lwcGluZyA8c2NyaXB0PiBmb3Igc2VjdXJpdHkgcmVhc29uc1xuICAgICAgLy8gU2tpcHBpbmcgPHN0eWxlPiBhcyB3ZSBhbHJlYWR5IHByb2Nlc3NlZCB0aGVtXG4gICAgICAvLyBpbiB0aGUgU3R5bGVDb21waWxlclxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChwcmVwYXJzZWRFbGVtZW50LnR5cGUgPT09IFByZXBhcnNlZEVsZW1lbnRUeXBlLlNUWUxFU0hFRVQgJiZcbiAgICAgICAgaXNTdHlsZVVybFJlc29sdmFibGUocHJlcGFyc2VkRWxlbWVudC5ocmVmQXR0cikpIHtcbiAgICAgIC8vIFNraXBwaW5nIHN0eWxlc2hlZXRzIHdpdGggZWl0aGVyIHJlbGF0aXZlIHVybHMgb3IgcGFja2FnZSBzY2hlbWUgYXMgd2UgYWxyZWFkeSBwcm9jZXNzZWRcbiAgICAgIC8vIHRoZW0gaW4gdGhlIFN0eWxlQ29tcGlsZXJcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoYWJsZUF0dHJzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXTtcbiAgICBjb25zdCBlbGVtZW50T3JEaXJlY3RpdmVQcm9wczogUGFyc2VkUHJvcGVydHlbXSA9IFtdO1xuICAgIGNvbnN0IGVsZW1lbnRPckRpcmVjdGl2ZVJlZnM6IEVsZW1lbnRPckRpcmVjdGl2ZVJlZltdID0gW107XG4gICAgY29uc3QgZWxlbWVudFZhcnM6IHQuVmFyaWFibGVBc3RbXSA9IFtdO1xuICAgIGNvbnN0IGV2ZW50czogdC5Cb3VuZEV2ZW50QXN0W10gPSBbXTtcblxuICAgIGNvbnN0IHRlbXBsYXRlRWxlbWVudE9yRGlyZWN0aXZlUHJvcHM6IFBhcnNlZFByb3BlcnR5W10gPSBbXTtcbiAgICBjb25zdCB0ZW1wbGF0ZU1hdGNoYWJsZUF0dHJzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXTtcbiAgICBjb25zdCB0ZW1wbGF0ZUVsZW1lbnRWYXJzOiB0LlZhcmlhYmxlQXN0W10gPSBbXTtcblxuICAgIGxldCBoYXNJbmxpbmVUZW1wbGF0ZXMgPSBmYWxzZTtcbiAgICBjb25zdCBhdHRyczogdC5BdHRyQXN0W10gPSBbXTtcbiAgICBjb25zdCBpc1RlbXBsYXRlRWxlbWVudCA9IGlzTmdUZW1wbGF0ZShlbGVtZW50Lm5hbWUpO1xuXG4gICAgZWxlbWVudC5hdHRycy5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgY29uc3QgcGFyc2VkVmFyaWFibGVzOiBQYXJzZWRWYXJpYWJsZVtdID0gW107XG4gICAgICBjb25zdCBoYXNCaW5kaW5nID0gdGhpcy5fcGFyc2VBdHRyKFxuICAgICAgICAgIGlzVGVtcGxhdGVFbGVtZW50LCBhdHRyLCBtYXRjaGFibGVBdHRycywgZWxlbWVudE9yRGlyZWN0aXZlUHJvcHMsIGV2ZW50cyxcbiAgICAgICAgICBlbGVtZW50T3JEaXJlY3RpdmVSZWZzLCBlbGVtZW50VmFycyk7XG4gICAgICBlbGVtZW50VmFycy5wdXNoKC4uLnBhcnNlZFZhcmlhYmxlcy5tYXAodiA9PiB0LlZhcmlhYmxlQXN0LmZyb21QYXJzZWRWYXJpYWJsZSh2KSkpO1xuXG4gICAgICBsZXQgdGVtcGxhdGVWYWx1ZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICAgIGxldCB0ZW1wbGF0ZUtleTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWROYW1lID0gdGhpcy5fbm9ybWFsaXplQXR0cmlidXRlTmFtZShhdHRyLm5hbWUpO1xuXG4gICAgICBpZiAobm9ybWFsaXplZE5hbWUuc3RhcnRzV2l0aChURU1QTEFURV9BVFRSX1BSRUZJWCkpIHtcbiAgICAgICAgdGVtcGxhdGVWYWx1ZSA9IGF0dHIudmFsdWU7XG4gICAgICAgIHRlbXBsYXRlS2V5ID0gbm9ybWFsaXplZE5hbWUuc3Vic3RyaW5nKFRFTVBMQVRFX0FUVFJfUFJFRklYLmxlbmd0aCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhc1RlbXBsYXRlQmluZGluZyA9IHRlbXBsYXRlVmFsdWUgIT0gbnVsbDtcbiAgICAgIGlmIChoYXNUZW1wbGF0ZUJpbmRpbmcpIHtcbiAgICAgICAgaWYgKGhhc0lubGluZVRlbXBsYXRlcykge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBgQ2FuJ3QgaGF2ZSBtdWx0aXBsZSB0ZW1wbGF0ZSBiaW5kaW5ncyBvbiBvbmUgZWxlbWVudC4gVXNlIG9ubHkgb25lIGF0dHJpYnV0ZSBwcmVmaXhlZCB3aXRoICpgLFxuICAgICAgICAgICAgICBhdHRyLnNvdXJjZVNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGhhc0lubGluZVRlbXBsYXRlcyA9IHRydWU7XG4gICAgICAgIGNvbnN0IHBhcnNlZFZhcmlhYmxlczogUGFyc2VkVmFyaWFibGVbXSA9IFtdO1xuICAgICAgICBjb25zdCBhYnNvbHV0ZU9mZnNldCA9IChhdHRyLnZhbHVlU3BhbiB8fCBhdHRyLnNvdXJjZVNwYW4pLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgdGhpcy5fYmluZGluZ1BhcnNlci5wYXJzZUlubGluZVRlbXBsYXRlQmluZGluZyhcbiAgICAgICAgICAgIHRlbXBsYXRlS2V5ISwgdGVtcGxhdGVWYWx1ZSEsIGF0dHIuc291cmNlU3BhbiwgYWJzb2x1dGVPZmZzZXQsIHRlbXBsYXRlTWF0Y2hhYmxlQXR0cnMsXG4gICAgICAgICAgICB0ZW1wbGF0ZUVsZW1lbnRPckRpcmVjdGl2ZVByb3BzLCBwYXJzZWRWYXJpYWJsZXMsIGZhbHNlIC8qIGlzSXZ5QXN0ICovKTtcbiAgICAgICAgdGVtcGxhdGVFbGVtZW50VmFycy5wdXNoKC4uLnBhcnNlZFZhcmlhYmxlcy5tYXAodiA9PiB0LlZhcmlhYmxlQXN0LmZyb21QYXJzZWRWYXJpYWJsZSh2KSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWhhc0JpbmRpbmcgJiYgIWhhc1RlbXBsYXRlQmluZGluZykge1xuICAgICAgICAvLyBkb24ndCBpbmNsdWRlIHRoZSBiaW5kaW5ncyBhcyBhdHRyaWJ1dGVzIGFzIHdlbGwgaW4gdGhlIEFTVFxuICAgICAgICBhdHRycy5wdXNoKHRoaXMudmlzaXRBdHRyaWJ1dGUoYXR0ciwgbnVsbCkpO1xuICAgICAgICBtYXRjaGFibGVBdHRycy5wdXNoKFthdHRyLm5hbWUsIGF0dHIudmFsdWVdKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGVsZW1lbnRDc3NTZWxlY3RvciA9IGNyZWF0ZUVsZW1lbnRDc3NTZWxlY3RvcihlbE5hbWUsIG1hdGNoYWJsZUF0dHJzKTtcbiAgICBjb25zdCB7ZGlyZWN0aXZlczogZGlyZWN0aXZlTWV0YXMsIG1hdGNoRWxlbWVudH0gPVxuICAgICAgICB0aGlzLl9wYXJzZURpcmVjdGl2ZXModGhpcy5zZWxlY3Rvck1hdGNoZXIsIGVsZW1lbnRDc3NTZWxlY3Rvcik7XG4gICAgY29uc3QgcmVmZXJlbmNlczogdC5SZWZlcmVuY2VBc3RbXSA9IFtdO1xuICAgIGNvbnN0IGJvdW5kRGlyZWN0aXZlUHJvcE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlQXN0cyA9IHRoaXMuX2NyZWF0ZURpcmVjdGl2ZUFzdHMoXG4gICAgICAgIGlzVGVtcGxhdGVFbGVtZW50LCBlbGVtZW50Lm5hbWUsIGRpcmVjdGl2ZU1ldGFzLCBlbGVtZW50T3JEaXJlY3RpdmVQcm9wcyxcbiAgICAgICAgZWxlbWVudE9yRGlyZWN0aXZlUmVmcywgZWxlbWVudC5zb3VyY2VTcGFuLCByZWZlcmVuY2VzLCBib3VuZERpcmVjdGl2ZVByb3BOYW1lcyk7XG4gICAgY29uc3QgZWxlbWVudFByb3BzOiB0LkJvdW5kRWxlbWVudFByb3BlcnR5QXN0W10gPSB0aGlzLl9jcmVhdGVFbGVtZW50UHJvcGVydHlBc3RzKFxuICAgICAgICBlbGVtZW50Lm5hbWUsIGVsZW1lbnRPckRpcmVjdGl2ZVByb3BzLCBib3VuZERpcmVjdGl2ZVByb3BOYW1lcyk7XG4gICAgY29uc3QgaXNWaWV3Um9vdCA9IHBhcmVudC5pc1RlbXBsYXRlRWxlbWVudCB8fCBoYXNJbmxpbmVUZW1wbGF0ZXM7XG5cbiAgICBjb25zdCBwcm92aWRlckNvbnRleHQgPSBuZXcgUHJvdmlkZXJFbGVtZW50Q29udGV4dChcbiAgICAgICAgdGhpcy5wcm92aWRlclZpZXdDb250ZXh0LCBwYXJlbnQucHJvdmlkZXJDb250ZXh0ISwgaXNWaWV3Um9vdCwgZGlyZWN0aXZlQXN0cywgYXR0cnMsXG4gICAgICAgIHJlZmVyZW5jZXMsIGlzVGVtcGxhdGVFbGVtZW50LCBxdWVyeVN0YXJ0SW5kZXgsIGVsZW1lbnQuc291cmNlU3Bhbik7XG5cbiAgICBjb25zdCBjaGlsZHJlbjogdC5UZW1wbGF0ZUFzdFtdID0gaHRtbC52aXNpdEFsbChcbiAgICAgICAgcHJlcGFyc2VkRWxlbWVudC5ub25CaW5kYWJsZSA/IE5PTl9CSU5EQUJMRV9WSVNJVE9SIDogdGhpcywgZWxlbWVudC5jaGlsZHJlbixcbiAgICAgICAgRWxlbWVudENvbnRleHQuY3JlYXRlKFxuICAgICAgICAgICAgaXNUZW1wbGF0ZUVsZW1lbnQsIGRpcmVjdGl2ZUFzdHMsXG4gICAgICAgICAgICBpc1RlbXBsYXRlRWxlbWVudCA/IHBhcmVudC5wcm92aWRlckNvbnRleHQhIDogcHJvdmlkZXJDb250ZXh0KSk7XG4gICAgcHJvdmlkZXJDb250ZXh0LmFmdGVyRWxlbWVudCgpO1xuICAgIC8vIE92ZXJyaWRlIHRoZSBhY3R1YWwgc2VsZWN0b3Igd2hlbiB0aGUgYG5nUHJvamVjdEFzYCBhdHRyaWJ1dGUgaXMgcHJvdmlkZWRcbiAgICBjb25zdCBwcm9qZWN0aW9uU2VsZWN0b3IgPSBwcmVwYXJzZWRFbGVtZW50LnByb2plY3RBcyAhPSAnJyA/XG4gICAgICAgIENzc1NlbGVjdG9yLnBhcnNlKHByZXBhcnNlZEVsZW1lbnQucHJvamVjdEFzKVswXSA6XG4gICAgICAgIGVsZW1lbnRDc3NTZWxlY3RvcjtcbiAgICBjb25zdCBuZ0NvbnRlbnRJbmRleCA9IHBhcmVudC5maW5kTmdDb250ZW50SW5kZXgocHJvamVjdGlvblNlbGVjdG9yKSE7XG4gICAgbGV0IHBhcnNlZEVsZW1lbnQ6IHQuVGVtcGxhdGVBc3Q7XG5cbiAgICBpZiAocHJlcGFyc2VkRWxlbWVudC50eXBlID09PSBQcmVwYXJzZWRFbGVtZW50VHlwZS5OR19DT05URU5UKSB7XG4gICAgICAvLyBgPG5nLWNvbnRlbnQ+YCBlbGVtZW50XG4gICAgICBpZiAoZWxlbWVudC5jaGlsZHJlbiAmJiAhZWxlbWVudC5jaGlsZHJlbi5ldmVyeShfaXNFbXB0eVRleHROb2RlKSkge1xuICAgICAgICB0aGlzLl9yZXBvcnRFcnJvcihgPG5nLWNvbnRlbnQ+IGVsZW1lbnQgY2Fubm90IGhhdmUgY29udGVudC5gLCBlbGVtZW50LnNvdXJjZVNwYW4pO1xuICAgICAgfVxuXG4gICAgICBwYXJzZWRFbGVtZW50ID0gbmV3IHQuTmdDb250ZW50QXN0KFxuICAgICAgICAgIHRoaXMubmdDb250ZW50Q291bnQrKywgaGFzSW5saW5lVGVtcGxhdGVzID8gbnVsbCEgOiBuZ0NvbnRlbnRJbmRleCwgZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICB9IGVsc2UgaWYgKGlzVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAvLyBgPG5nLXRlbXBsYXRlPmAgZWxlbWVudFxuICAgICAgdGhpcy5fYXNzZXJ0QWxsRXZlbnRzUHVibGlzaGVkQnlEaXJlY3RpdmVzKGRpcmVjdGl2ZUFzdHMsIGV2ZW50cyk7XG4gICAgICB0aGlzLl9hc3NlcnROb0NvbXBvbmVudHNOb3JFbGVtZW50QmluZGluZ3NPblRlbXBsYXRlKFxuICAgICAgICAgIGRpcmVjdGl2ZUFzdHMsIGVsZW1lbnRQcm9wcywgZWxlbWVudC5zb3VyY2VTcGFuKTtcblxuICAgICAgcGFyc2VkRWxlbWVudCA9IG5ldyB0LkVtYmVkZGVkVGVtcGxhdGVBc3QoXG4gICAgICAgICAgYXR0cnMsIGV2ZW50cywgcmVmZXJlbmNlcywgZWxlbWVudFZhcnMsIHByb3ZpZGVyQ29udGV4dC50cmFuc2Zvcm1lZERpcmVjdGl2ZUFzdHMsXG4gICAgICAgICAgcHJvdmlkZXJDb250ZXh0LnRyYW5zZm9ybVByb3ZpZGVycywgcHJvdmlkZXJDb250ZXh0LnRyYW5zZm9ybWVkSGFzVmlld0NvbnRhaW5lcixcbiAgICAgICAgICBwcm92aWRlckNvbnRleHQucXVlcnlNYXRjaGVzLCBjaGlsZHJlbiwgaGFzSW5saW5lVGVtcGxhdGVzID8gbnVsbCEgOiBuZ0NvbnRlbnRJbmRleCxcbiAgICAgICAgICBlbGVtZW50LnNvdXJjZVNwYW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlbGVtZW50IG90aGVyIHRoYW4gYDxuZy1jb250ZW50PmAgYW5kIGA8bmctdGVtcGxhdGU+YFxuICAgICAgdGhpcy5fYXNzZXJ0RWxlbWVudEV4aXN0cyhtYXRjaEVsZW1lbnQsIGVsZW1lbnQpO1xuICAgICAgdGhpcy5fYXNzZXJ0T25seU9uZUNvbXBvbmVudChkaXJlY3RpdmVBc3RzLCBlbGVtZW50LnNvdXJjZVNwYW4pO1xuXG4gICAgICBjb25zdCBuZ0NvbnRlbnRJbmRleCA9XG4gICAgICAgICAgaGFzSW5saW5lVGVtcGxhdGVzID8gbnVsbCA6IHBhcmVudC5maW5kTmdDb250ZW50SW5kZXgocHJvamVjdGlvblNlbGVjdG9yKTtcbiAgICAgIHBhcnNlZEVsZW1lbnQgPSBuZXcgdC5FbGVtZW50QXN0KFxuICAgICAgICAgIGVsTmFtZSwgYXR0cnMsIGVsZW1lbnRQcm9wcywgZXZlbnRzLCByZWZlcmVuY2VzLCBwcm92aWRlckNvbnRleHQudHJhbnNmb3JtZWREaXJlY3RpdmVBc3RzLFxuICAgICAgICAgIHByb3ZpZGVyQ29udGV4dC50cmFuc2Zvcm1Qcm92aWRlcnMsIHByb3ZpZGVyQ29udGV4dC50cmFuc2Zvcm1lZEhhc1ZpZXdDb250YWluZXIsXG4gICAgICAgICAgcHJvdmlkZXJDb250ZXh0LnF1ZXJ5TWF0Y2hlcywgY2hpbGRyZW4sIGhhc0lubGluZVRlbXBsYXRlcyA/IG51bGwgOiBuZ0NvbnRlbnRJbmRleCxcbiAgICAgICAgICBlbGVtZW50LnNvdXJjZVNwYW4sIGVsZW1lbnQuZW5kU291cmNlU3BhbiB8fCBudWxsKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzSW5saW5lVGVtcGxhdGVzKSB7XG4gICAgICAvLyBUaGUgZWxlbWVudCBhcyBhICotYXR0cmlidXRlXG4gICAgICBjb25zdCB0ZW1wbGF0ZVF1ZXJ5U3RhcnRJbmRleCA9IHRoaXMuY29udGVudFF1ZXJ5U3RhcnRJZDtcbiAgICAgIGNvbnN0IHRlbXBsYXRlU2VsZWN0b3IgPSBjcmVhdGVFbGVtZW50Q3NzU2VsZWN0b3IoJ25nLXRlbXBsYXRlJywgdGVtcGxhdGVNYXRjaGFibGVBdHRycyk7XG4gICAgICBjb25zdCB7ZGlyZWN0aXZlc30gPSB0aGlzLl9wYXJzZURpcmVjdGl2ZXModGhpcy5zZWxlY3Rvck1hdGNoZXIsIHRlbXBsYXRlU2VsZWN0b3IpO1xuICAgICAgY29uc3QgdGVtcGxhdGVCb3VuZERpcmVjdGl2ZVByb3BOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgY29uc3QgdGVtcGxhdGVEaXJlY3RpdmVBc3RzID0gdGhpcy5fY3JlYXRlRGlyZWN0aXZlQXN0cyhcbiAgICAgICAgICB0cnVlLCBlbE5hbWUsIGRpcmVjdGl2ZXMsIHRlbXBsYXRlRWxlbWVudE9yRGlyZWN0aXZlUHJvcHMsIFtdLCBlbGVtZW50LnNvdXJjZVNwYW4sIFtdLFxuICAgICAgICAgIHRlbXBsYXRlQm91bmREaXJlY3RpdmVQcm9wTmFtZXMpO1xuICAgICAgY29uc3QgdGVtcGxhdGVFbGVtZW50UHJvcHM6IHQuQm91bmRFbGVtZW50UHJvcGVydHlBc3RbXSA9IHRoaXMuX2NyZWF0ZUVsZW1lbnRQcm9wZXJ0eUFzdHMoXG4gICAgICAgICAgZWxOYW1lLCB0ZW1wbGF0ZUVsZW1lbnRPckRpcmVjdGl2ZVByb3BzLCB0ZW1wbGF0ZUJvdW5kRGlyZWN0aXZlUHJvcE5hbWVzKTtcbiAgICAgIHRoaXMuX2Fzc2VydE5vQ29tcG9uZW50c05vckVsZW1lbnRCaW5kaW5nc09uVGVtcGxhdGUoXG4gICAgICAgICAgdGVtcGxhdGVEaXJlY3RpdmVBc3RzLCB0ZW1wbGF0ZUVsZW1lbnRQcm9wcywgZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlUHJvdmlkZXJDb250ZXh0ID0gbmV3IFByb3ZpZGVyRWxlbWVudENvbnRleHQoXG4gICAgICAgICAgdGhpcy5wcm92aWRlclZpZXdDb250ZXh0LCBwYXJlbnQucHJvdmlkZXJDb250ZXh0ISwgcGFyZW50LmlzVGVtcGxhdGVFbGVtZW50LFxuICAgICAgICAgIHRlbXBsYXRlRGlyZWN0aXZlQXN0cywgW10sIFtdLCB0cnVlLCB0ZW1wbGF0ZVF1ZXJ5U3RhcnRJbmRleCwgZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICAgIHRlbXBsYXRlUHJvdmlkZXJDb250ZXh0LmFmdGVyRWxlbWVudCgpO1xuXG4gICAgICBwYXJzZWRFbGVtZW50ID0gbmV3IHQuRW1iZWRkZWRUZW1wbGF0ZUFzdChcbiAgICAgICAgICBbXSwgW10sIFtdLCB0ZW1wbGF0ZUVsZW1lbnRWYXJzLCB0ZW1wbGF0ZVByb3ZpZGVyQ29udGV4dC50cmFuc2Zvcm1lZERpcmVjdGl2ZUFzdHMsXG4gICAgICAgICAgdGVtcGxhdGVQcm92aWRlckNvbnRleHQudHJhbnNmb3JtUHJvdmlkZXJzLFxuICAgICAgICAgIHRlbXBsYXRlUHJvdmlkZXJDb250ZXh0LnRyYW5zZm9ybWVkSGFzVmlld0NvbnRhaW5lciwgdGVtcGxhdGVQcm92aWRlckNvbnRleHQucXVlcnlNYXRjaGVzLFxuICAgICAgICAgIFtwYXJzZWRFbGVtZW50XSwgbmdDb250ZW50SW5kZXgsIGVsZW1lbnQuc291cmNlU3Bhbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlZEVsZW1lbnQ7XG4gIH1cblxuICBwcml2YXRlIF9wYXJzZUF0dHIoXG4gICAgICBpc1RlbXBsYXRlRWxlbWVudDogYm9vbGVhbiwgYXR0cjogaHRtbC5BdHRyaWJ1dGUsIHRhcmdldE1hdGNoYWJsZUF0dHJzOiBzdHJpbmdbXVtdLFxuICAgICAgdGFyZ2V0UHJvcHM6IFBhcnNlZFByb3BlcnR5W10sIHRhcmdldEV2ZW50czogdC5Cb3VuZEV2ZW50QXN0W10sXG4gICAgICB0YXJnZXRSZWZzOiBFbGVtZW50T3JEaXJlY3RpdmVSZWZbXSwgdGFyZ2V0VmFyczogdC5WYXJpYWJsZUFzdFtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMuX25vcm1hbGl6ZUF0dHJpYnV0ZU5hbWUoYXR0ci5uYW1lKTtcbiAgICBjb25zdCB2YWx1ZSA9IGF0dHIudmFsdWU7XG4gICAgY29uc3Qgc3JjU3BhbiA9IGF0dHIuc291cmNlU3BhbjtcbiAgICBjb25zdCBhYnNvbHV0ZU9mZnNldCA9IGF0dHIudmFsdWVTcGFuID8gYXR0ci52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0IDogc3JjU3Bhbi5zdGFydC5vZmZzZXQ7XG5cbiAgICBjb25zdCBib3VuZEV2ZW50czogUGFyc2VkRXZlbnRbXSA9IFtdO1xuICAgIGNvbnN0IGJpbmRQYXJ0cyA9IG5hbWUubWF0Y2goQklORF9OQU1FX1JFR0VYUCk7XG4gICAgbGV0IGhhc0JpbmRpbmcgPSBmYWxzZTtcblxuICAgIGlmIChiaW5kUGFydHMgIT09IG51bGwpIHtcbiAgICAgIGhhc0JpbmRpbmcgPSB0cnVlO1xuICAgICAgaWYgKGJpbmRQYXJ0c1tLV19CSU5EX0lEWF0gIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9iaW5kaW5nUGFyc2VyLnBhcnNlUHJvcGVydHlCaW5kaW5nKFxuICAgICAgICAgICAgYmluZFBhcnRzW0lERU5UX0tXX0lEWF0sIHZhbHVlLCBmYWxzZSwgc3JjU3BhbiwgYWJzb2x1dGVPZmZzZXQsIGF0dHIudmFsdWVTcGFuLFxuICAgICAgICAgICAgdGFyZ2V0TWF0Y2hhYmxlQXR0cnMsIHRhcmdldFByb3BzKTtcblxuICAgICAgfSBlbHNlIGlmIChiaW5kUGFydHNbS1dfTEVUX0lEWF0pIHtcbiAgICAgICAgaWYgKGlzVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IGJpbmRQYXJ0c1tJREVOVF9LV19JRFhdO1xuICAgICAgICAgIHRoaXMuX3BhcnNlVmFyaWFibGUoaWRlbnRpZmllciwgdmFsdWUsIHNyY1NwYW4sIHRhcmdldFZhcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKGBcImxldC1cIiBpcyBvbmx5IHN1cHBvcnRlZCBvbiBuZy10ZW1wbGF0ZSBlbGVtZW50cy5gLCBzcmNTcGFuKTtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKGJpbmRQYXJ0c1tLV19SRUZfSURYXSkge1xuICAgICAgICBjb25zdCBpZGVudGlmaWVyID0gYmluZFBhcnRzW0lERU5UX0tXX0lEWF07XG4gICAgICAgIHRoaXMuX3BhcnNlUmVmZXJlbmNlKGlkZW50aWZpZXIsIHZhbHVlLCBzcmNTcGFuLCB0YXJnZXRSZWZzKTtcblxuICAgICAgfSBlbHNlIGlmIChiaW5kUGFydHNbS1dfT05fSURYXSkge1xuICAgICAgICB0aGlzLl9iaW5kaW5nUGFyc2VyLnBhcnNlRXZlbnQoXG4gICAgICAgICAgICBiaW5kUGFydHNbSURFTlRfS1dfSURYXSwgdmFsdWUsIHNyY1NwYW4sIGF0dHIudmFsdWVTcGFuIHx8IHNyY1NwYW4sXG4gICAgICAgICAgICB0YXJnZXRNYXRjaGFibGVBdHRycywgYm91bmRFdmVudHMpO1xuXG4gICAgICB9IGVsc2UgaWYgKGJpbmRQYXJ0c1tLV19CSU5ET05fSURYXSkge1xuICAgICAgICB0aGlzLl9iaW5kaW5nUGFyc2VyLnBhcnNlUHJvcGVydHlCaW5kaW5nKFxuICAgICAgICAgICAgYmluZFBhcnRzW0lERU5UX0tXX0lEWF0sIHZhbHVlLCBmYWxzZSwgc3JjU3BhbiwgYWJzb2x1dGVPZmZzZXQsIGF0dHIudmFsdWVTcGFuLFxuICAgICAgICAgICAgdGFyZ2V0TWF0Y2hhYmxlQXR0cnMsIHRhcmdldFByb3BzKTtcbiAgICAgICAgdGhpcy5fcGFyc2VBc3NpZ25tZW50RXZlbnQoXG4gICAgICAgICAgICBiaW5kUGFydHNbSURFTlRfS1dfSURYXSwgdmFsdWUsIHNyY1NwYW4sIGF0dHIudmFsdWVTcGFuIHx8IHNyY1NwYW4sXG4gICAgICAgICAgICB0YXJnZXRNYXRjaGFibGVBdHRycywgYm91bmRFdmVudHMpO1xuXG4gICAgICB9IGVsc2UgaWYgKGJpbmRQYXJ0c1tLV19BVF9JRFhdKSB7XG4gICAgICAgIHRoaXMuX2JpbmRpbmdQYXJzZXIucGFyc2VMaXRlcmFsQXR0cihcbiAgICAgICAgICAgIG5hbWUsIHZhbHVlLCBzcmNTcGFuLCBhYnNvbHV0ZU9mZnNldCwgYXR0ci52YWx1ZVNwYW4sIHRhcmdldE1hdGNoYWJsZUF0dHJzLFxuICAgICAgICAgICAgdGFyZ2V0UHJvcHMpO1xuXG4gICAgICB9IGVsc2UgaWYgKGJpbmRQYXJ0c1tJREVOVF9CQU5BTkFfQk9YX0lEWF0pIHtcbiAgICAgICAgdGhpcy5fYmluZGluZ1BhcnNlci5wYXJzZVByb3BlcnR5QmluZGluZyhcbiAgICAgICAgICAgIGJpbmRQYXJ0c1tJREVOVF9CQU5BTkFfQk9YX0lEWF0sIHZhbHVlLCBmYWxzZSwgc3JjU3BhbiwgYWJzb2x1dGVPZmZzZXQsIGF0dHIudmFsdWVTcGFuLFxuICAgICAgICAgICAgdGFyZ2V0TWF0Y2hhYmxlQXR0cnMsIHRhcmdldFByb3BzKTtcbiAgICAgICAgdGhpcy5fcGFyc2VBc3NpZ25tZW50RXZlbnQoXG4gICAgICAgICAgICBiaW5kUGFydHNbSURFTlRfQkFOQU5BX0JPWF9JRFhdLCB2YWx1ZSwgc3JjU3BhbiwgYXR0ci52YWx1ZVNwYW4gfHwgc3JjU3BhbixcbiAgICAgICAgICAgIHRhcmdldE1hdGNoYWJsZUF0dHJzLCBib3VuZEV2ZW50cyk7XG5cbiAgICAgIH0gZWxzZSBpZiAoYmluZFBhcnRzW0lERU5UX1BST1BFUlRZX0lEWF0pIHtcbiAgICAgICAgdGhpcy5fYmluZGluZ1BhcnNlci5wYXJzZVByb3BlcnR5QmluZGluZyhcbiAgICAgICAgICAgIGJpbmRQYXJ0c1tJREVOVF9QUk9QRVJUWV9JRFhdLCB2YWx1ZSwgZmFsc2UsIHNyY1NwYW4sIGFic29sdXRlT2Zmc2V0LCBhdHRyLnZhbHVlU3BhbixcbiAgICAgICAgICAgIHRhcmdldE1hdGNoYWJsZUF0dHJzLCB0YXJnZXRQcm9wcyk7XG5cbiAgICAgIH0gZWxzZSBpZiAoYmluZFBhcnRzW0lERU5UX0VWRU5UX0lEWF0pIHtcbiAgICAgICAgdGhpcy5fYmluZGluZ1BhcnNlci5wYXJzZUV2ZW50KFxuICAgICAgICAgICAgYmluZFBhcnRzW0lERU5UX0VWRU5UX0lEWF0sIHZhbHVlLCBzcmNTcGFuLCBhdHRyLnZhbHVlU3BhbiB8fCBzcmNTcGFuLFxuICAgICAgICAgICAgdGFyZ2V0TWF0Y2hhYmxlQXR0cnMsIGJvdW5kRXZlbnRzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaGFzQmluZGluZyA9IHRoaXMuX2JpbmRpbmdQYXJzZXIucGFyc2VQcm9wZXJ0eUludGVycG9sYXRpb24oXG4gICAgICAgICAgbmFtZSwgdmFsdWUsIHNyY1NwYW4sIGF0dHIudmFsdWVTcGFuLCB0YXJnZXRNYXRjaGFibGVBdHRycywgdGFyZ2V0UHJvcHMpO1xuICAgIH1cblxuICAgIGlmICghaGFzQmluZGluZykge1xuICAgICAgdGhpcy5fYmluZGluZ1BhcnNlci5wYXJzZUxpdGVyYWxBdHRyKFxuICAgICAgICAgIG5hbWUsIHZhbHVlLCBzcmNTcGFuLCBhYnNvbHV0ZU9mZnNldCwgYXR0ci52YWx1ZVNwYW4sIHRhcmdldE1hdGNoYWJsZUF0dHJzLCB0YXJnZXRQcm9wcyk7XG4gICAgfVxuXG4gICAgdGFyZ2V0RXZlbnRzLnB1c2goLi4uYm91bmRFdmVudHMubWFwKGUgPT4gdC5Cb3VuZEV2ZW50QXN0LmZyb21QYXJzZWRFdmVudChlKSkpO1xuXG4gICAgcmV0dXJuIGhhc0JpbmRpbmc7XG4gIH1cblxuICBwcml2YXRlIF9ub3JtYWxpemVBdHRyaWJ1dGVOYW1lKGF0dHJOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiAvXmRhdGEtL2kudGVzdChhdHRyTmFtZSkgPyBhdHRyTmFtZS5zdWJzdHJpbmcoNSkgOiBhdHRyTmFtZTtcbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVmFyaWFibGUoXG4gICAgICBpZGVudGlmaWVyOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbiwgdGFyZ2V0VmFyczogdC5WYXJpYWJsZUFzdFtdKSB7XG4gICAgaWYgKGlkZW50aWZpZXIuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgIHRoaXMuX3JlcG9ydEVycm9yKGBcIi1cIiBpcyBub3QgYWxsb3dlZCBpbiB2YXJpYWJsZSBuYW1lc2AsIHNvdXJjZVNwYW4pO1xuICAgIH0gZWxzZSBpZiAoaWRlbnRpZmllci5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuX3JlcG9ydEVycm9yKGBWYXJpYWJsZSBkb2VzIG5vdCBoYXZlIGEgbmFtZWAsIHNvdXJjZVNwYW4pO1xuICAgIH1cblxuICAgIHRhcmdldFZhcnMucHVzaChuZXcgdC5WYXJpYWJsZUFzdChpZGVudGlmaWVyLCB2YWx1ZSwgc291cmNlU3BhbikpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcGFyc2VSZWZlcmVuY2UoXG4gICAgICBpZGVudGlmaWVyOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICAgIHRhcmdldFJlZnM6IEVsZW1lbnRPckRpcmVjdGl2ZVJlZltdKSB7XG4gICAgaWYgKGlkZW50aWZpZXIuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgIHRoaXMuX3JlcG9ydEVycm9yKGBcIi1cIiBpcyBub3QgYWxsb3dlZCBpbiByZWZlcmVuY2UgbmFtZXNgLCBzb3VyY2VTcGFuKTtcbiAgICB9IGVsc2UgaWYgKGlkZW50aWZpZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLl9yZXBvcnRFcnJvcihgUmVmZXJlbmNlIGRvZXMgbm90IGhhdmUgYSBuYW1lYCwgc291cmNlU3Bhbik7XG4gICAgfVxuXG4gICAgdGFyZ2V0UmVmcy5wdXNoKG5ldyBFbGVtZW50T3JEaXJlY3RpdmVSZWYoaWRlbnRpZmllciwgdmFsdWUsIHNvdXJjZVNwYW4pKTtcbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlQXNzaWdubWVudEV2ZW50KFxuICAgICAgbmFtZTogc3RyaW5nLCBleHByZXNzaW9uOiBzdHJpbmcsIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbiwgdmFsdWVTcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICB0YXJnZXRNYXRjaGFibGVBdHRyczogc3RyaW5nW11bXSwgdGFyZ2V0RXZlbnRzOiBQYXJzZWRFdmVudFtdKSB7XG4gICAgdGhpcy5fYmluZGluZ1BhcnNlci5wYXJzZUV2ZW50KFxuICAgICAgICBgJHtuYW1lfUNoYW5nZWAsIGAke2V4cHJlc3Npb259PSRldmVudGAsIHNvdXJjZVNwYW4sIHZhbHVlU3BhbiwgdGFyZ2V0TWF0Y2hhYmxlQXR0cnMsXG4gICAgICAgIHRhcmdldEV2ZW50cyk7XG4gIH1cblxuICBwcml2YXRlIF9wYXJzZURpcmVjdGl2ZXMoc2VsZWN0b3JNYXRjaGVyOiBTZWxlY3Rvck1hdGNoZXIsIGVsZW1lbnRDc3NTZWxlY3RvcjogQ3NzU2VsZWN0b3IpOlxuICAgICAge2RpcmVjdGl2ZXM6IENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5W10sIG1hdGNoRWxlbWVudDogYm9vbGVhbn0ge1xuICAgIC8vIE5lZWQgdG8gc29ydCB0aGUgZGlyZWN0aXZlcyBzbyB0aGF0IHdlIGdldCBjb25zaXN0ZW50IHJlc3VsdHMgdGhyb3VnaG91dCxcbiAgICAvLyBhcyBzZWxlY3Rvck1hdGNoZXIgdXNlcyBNYXBzIGluc2lkZS5cbiAgICAvLyBBbHNvIGRlZHVwbGljYXRlIGRpcmVjdGl2ZXMgYXMgdGhleSBtaWdodCBtYXRjaCBtb3JlIHRoYW4gb25lIHRpbWUhXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IG5ld0FycmF5KHRoaXMuZGlyZWN0aXZlc0luZGV4LnNpemUpO1xuICAgIC8vIFdoZXRoZXIgYW55IGRpcmVjdGl2ZSBzZWxlY3RvciBtYXRjaGVzIG9uIHRoZSBlbGVtZW50IG5hbWVcbiAgICBsZXQgbWF0Y2hFbGVtZW50ID0gZmFsc2U7XG5cbiAgICBzZWxlY3Rvck1hdGNoZXIubWF0Y2goZWxlbWVudENzc1NlbGVjdG9yLCAoc2VsZWN0b3IsIGRpcmVjdGl2ZSkgPT4ge1xuICAgICAgZGlyZWN0aXZlc1t0aGlzLmRpcmVjdGl2ZXNJbmRleC5nZXQoZGlyZWN0aXZlKSFdID0gZGlyZWN0aXZlO1xuICAgICAgbWF0Y2hFbGVtZW50ID0gbWF0Y2hFbGVtZW50IHx8IHNlbGVjdG9yLmhhc0VsZW1lbnRTZWxlY3RvcigpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRpcmVjdGl2ZXM6IGRpcmVjdGl2ZXMuZmlsdGVyKGRpciA9PiAhIWRpciksXG4gICAgICBtYXRjaEVsZW1lbnQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZURpcmVjdGl2ZUFzdHMoXG4gICAgICBpc1RlbXBsYXRlRWxlbWVudDogYm9vbGVhbiwgZWxlbWVudE5hbWU6IHN0cmluZywgZGlyZWN0aXZlczogQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnlbXSxcbiAgICAgIHByb3BzOiBQYXJzZWRQcm9wZXJ0eVtdLCBlbGVtZW50T3JEaXJlY3RpdmVSZWZzOiBFbGVtZW50T3JEaXJlY3RpdmVSZWZbXSxcbiAgICAgIGVsZW1lbnRTb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIHRhcmdldFJlZmVyZW5jZXM6IHQuUmVmZXJlbmNlQXN0W10sXG4gICAgICB0YXJnZXRCb3VuZERpcmVjdGl2ZVByb3BOYW1lczogU2V0PHN0cmluZz4pOiB0LkRpcmVjdGl2ZUFzdFtdIHtcbiAgICBjb25zdCBtYXRjaGVkUmVmZXJlbmNlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGxldCBjb21wb25lbnQ6IENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5ID0gbnVsbCE7XG5cbiAgICBjb25zdCBkaXJlY3RpdmVBc3RzID0gZGlyZWN0aXZlcy5tYXAoKGRpcmVjdGl2ZSkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlU3BhbiA9IG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICAgICAgZWxlbWVudFNvdXJjZVNwYW4uc3RhcnQsIGVsZW1lbnRTb3VyY2VTcGFuLmVuZCwgZWxlbWVudFNvdXJjZVNwYW4uZnVsbFN0YXJ0LFxuICAgICAgICAgIGBEaXJlY3RpdmUgJHtpZGVudGlmaWVyTmFtZShkaXJlY3RpdmUudHlwZSl9YCk7XG5cbiAgICAgIGlmIChkaXJlY3RpdmUuaXNDb21wb25lbnQpIHtcbiAgICAgICAgY29tcG9uZW50ID0gZGlyZWN0aXZlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlyZWN0aXZlUHJvcGVydGllczogdC5Cb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0W10gPSBbXTtcbiAgICAgIGNvbnN0IGJvdW5kUHJvcGVydGllcyA9XG4gICAgICAgICAgdGhpcy5fYmluZGluZ1BhcnNlci5jcmVhdGVEaXJlY3RpdmVIb3N0UHJvcGVydHlBc3RzKGRpcmVjdGl2ZSwgZWxlbWVudE5hbWUsIHNvdXJjZVNwYW4pITtcblxuICAgICAgbGV0IGhvc3RQcm9wZXJ0aWVzID1cbiAgICAgICAgICBib3VuZFByb3BlcnRpZXMubWFwKHByb3AgPT4gdC5Cb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdC5mcm9tQm91bmRQcm9wZXJ0eShwcm9wKSk7XG4gICAgICAvLyBOb3RlOiBXZSBuZWVkIHRvIGNoZWNrIHRoZSBob3N0IHByb3BlcnRpZXMgaGVyZSBhcyB3ZWxsLFxuICAgICAgLy8gYXMgd2UgZG9uJ3Qga25vdyB0aGUgZWxlbWVudCBuYW1lIGluIHRoZSBEaXJlY3RpdmVXcmFwcGVyQ29tcGlsZXIgeWV0LlxuICAgICAgaG9zdFByb3BlcnRpZXMgPSB0aGlzLl9jaGVja1Byb3BlcnRpZXNJblNjaGVtYShlbGVtZW50TmFtZSwgaG9zdFByb3BlcnRpZXMpO1xuICAgICAgY29uc3QgcGFyc2VkRXZlbnRzID0gdGhpcy5fYmluZGluZ1BhcnNlci5jcmVhdGVEaXJlY3RpdmVIb3N0RXZlbnRBc3RzKGRpcmVjdGl2ZSwgc291cmNlU3BhbikhO1xuICAgICAgdGhpcy5fY3JlYXRlRGlyZWN0aXZlUHJvcGVydHlBc3RzKFxuICAgICAgICAgIGRpcmVjdGl2ZS5pbnB1dHMsIHByb3BzLCBkaXJlY3RpdmVQcm9wZXJ0aWVzLCB0YXJnZXRCb3VuZERpcmVjdGl2ZVByb3BOYW1lcyk7XG4gICAgICBlbGVtZW50T3JEaXJlY3RpdmVSZWZzLmZvckVhY2goKGVsT3JEaXJSZWYpID0+IHtcbiAgICAgICAgaWYgKChlbE9yRGlyUmVmLnZhbHVlLmxlbmd0aCA9PT0gMCAmJiBkaXJlY3RpdmUuaXNDb21wb25lbnQpIHx8XG4gICAgICAgICAgICAoZWxPckRpclJlZi5pc1JlZmVyZW5jZVRvRGlyZWN0aXZlKGRpcmVjdGl2ZSkpKSB7XG4gICAgICAgICAgdGFyZ2V0UmVmZXJlbmNlcy5wdXNoKG5ldyB0LlJlZmVyZW5jZUFzdChcbiAgICAgICAgICAgICAgZWxPckRpclJlZi5uYW1lLCBjcmVhdGVUb2tlbkZvclJlZmVyZW5jZShkaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpLCBlbE9yRGlyUmVmLnZhbHVlLFxuICAgICAgICAgICAgICBlbE9yRGlyUmVmLnNvdXJjZVNwYW4pKTtcbiAgICAgICAgICBtYXRjaGVkUmVmZXJlbmNlcy5hZGQoZWxPckRpclJlZi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBob3N0RXZlbnRzID0gcGFyc2VkRXZlbnRzLm1hcChlID0+IHQuQm91bmRFdmVudEFzdC5mcm9tUGFyc2VkRXZlbnQoZSkpO1xuICAgICAgY29uc3QgY29udGVudFF1ZXJ5U3RhcnRJZCA9IHRoaXMuY29udGVudFF1ZXJ5U3RhcnRJZDtcbiAgICAgIHRoaXMuY29udGVudFF1ZXJ5U3RhcnRJZCArPSBkaXJlY3RpdmUucXVlcmllcy5sZW5ndGg7XG4gICAgICByZXR1cm4gbmV3IHQuRGlyZWN0aXZlQXN0KFxuICAgICAgICAgIGRpcmVjdGl2ZSwgZGlyZWN0aXZlUHJvcGVydGllcywgaG9zdFByb3BlcnRpZXMsIGhvc3RFdmVudHMsIGNvbnRlbnRRdWVyeVN0YXJ0SWQsXG4gICAgICAgICAgc291cmNlU3Bhbik7XG4gICAgfSk7XG5cbiAgICBlbGVtZW50T3JEaXJlY3RpdmVSZWZzLmZvckVhY2goKGVsT3JEaXJSZWYpID0+IHtcbiAgICAgIGlmIChlbE9yRGlyUmVmLnZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKCFtYXRjaGVkUmVmZXJlbmNlcy5oYXMoZWxPckRpclJlZi5uYW1lKSkge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBgVGhlcmUgaXMgbm8gZGlyZWN0aXZlIHdpdGggXCJleHBvcnRBc1wiIHNldCB0byBcIiR7ZWxPckRpclJlZi52YWx1ZX1cImAsXG4gICAgICAgICAgICAgIGVsT3JEaXJSZWYuc291cmNlU3Bhbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICBsZXQgcmVmVG9rZW46IENvbXBpbGVUb2tlbk1ldGFkYXRhID0gbnVsbCE7XG4gICAgICAgIGlmIChpc1RlbXBsYXRlRWxlbWVudCkge1xuICAgICAgICAgIHJlZlRva2VuID0gY3JlYXRlVG9rZW5Gb3JFeHRlcm5hbFJlZmVyZW5jZSh0aGlzLnJlZmxlY3RvciwgSWRlbnRpZmllcnMuVGVtcGxhdGVSZWYpO1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldFJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgIG5ldyB0LlJlZmVyZW5jZUFzdChlbE9yRGlyUmVmLm5hbWUsIHJlZlRva2VuLCBlbE9yRGlyUmVmLnZhbHVlLCBlbE9yRGlyUmVmLnNvdXJjZVNwYW4pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZGlyZWN0aXZlQXN0cztcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZURpcmVjdGl2ZVByb3BlcnR5QXN0cyhcbiAgICAgIGRpcmVjdGl2ZVByb3BlcnRpZXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9LCBib3VuZFByb3BzOiBQYXJzZWRQcm9wZXJ0eVtdLFxuICAgICAgdGFyZ2V0Qm91bmREaXJlY3RpdmVQcm9wczogdC5Cb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0W10sXG4gICAgICB0YXJnZXRCb3VuZERpcmVjdGl2ZVByb3BOYW1lczogU2V0PHN0cmluZz4pIHtcbiAgICBpZiAoZGlyZWN0aXZlUHJvcGVydGllcykge1xuICAgICAgY29uc3QgYm91bmRQcm9wc0J5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBQYXJzZWRQcm9wZXJ0eT4oKTtcbiAgICAgIGJvdW5kUHJvcHMuZm9yRWFjaChib3VuZFByb3AgPT4ge1xuICAgICAgICBjb25zdCBwcmV2VmFsdWUgPSBib3VuZFByb3BzQnlOYW1lLmdldChib3VuZFByb3AubmFtZSk7XG4gICAgICAgIGlmICghcHJldlZhbHVlIHx8IHByZXZWYWx1ZS5pc0xpdGVyYWwpIHtcbiAgICAgICAgICAvLyBnaXZlIFthXT1cImJcIiBhIGhpZ2hlciBwcmVjZWRlbmNlIHRoYW4gYT1cImJcIiBvbiB0aGUgc2FtZSBlbGVtZW50XG4gICAgICAgICAgYm91bmRQcm9wc0J5TmFtZS5zZXQoYm91bmRQcm9wLm5hbWUsIGJvdW5kUHJvcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBPYmplY3Qua2V5cyhkaXJlY3RpdmVQcm9wZXJ0aWVzKS5mb3JFYWNoKGRpclByb3AgPT4ge1xuICAgICAgICBjb25zdCBlbFByb3AgPSBkaXJlY3RpdmVQcm9wZXJ0aWVzW2RpclByb3BdO1xuICAgICAgICBjb25zdCBib3VuZFByb3AgPSBib3VuZFByb3BzQnlOYW1lLmdldChlbFByb3ApO1xuXG4gICAgICAgIC8vIEJpbmRpbmdzIGFyZSBvcHRpb25hbCwgc28gdGhpcyBiaW5kaW5nIG9ubHkgbmVlZHMgdG8gYmUgc2V0IHVwIGlmIGFuIGV4cHJlc3Npb24gaXMgZ2l2ZW4uXG4gICAgICAgIGlmIChib3VuZFByb3ApIHtcbiAgICAgICAgICB0YXJnZXRCb3VuZERpcmVjdGl2ZVByb3BOYW1lcy5hZGQoYm91bmRQcm9wLm5hbWUpO1xuICAgICAgICAgIGlmICghaXNFbXB0eUV4cHJlc3Npb24oYm91bmRQcm9wLmV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgICB0YXJnZXRCb3VuZERpcmVjdGl2ZVByb3BzLnB1c2gobmV3IHQuQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdChcbiAgICAgICAgICAgICAgICBkaXJQcm9wLCBib3VuZFByb3AubmFtZSwgYm91bmRQcm9wLmV4cHJlc3Npb24sIGJvdW5kUHJvcC5zb3VyY2VTcGFuKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVFbGVtZW50UHJvcGVydHlBc3RzKFxuICAgICAgZWxlbWVudE5hbWU6IHN0cmluZywgcHJvcHM6IFBhcnNlZFByb3BlcnR5W10sXG4gICAgICBib3VuZERpcmVjdGl2ZVByb3BOYW1lczogU2V0PHN0cmluZz4pOiB0LkJvdW5kRWxlbWVudFByb3BlcnR5QXN0W10ge1xuICAgIGNvbnN0IGJvdW5kRWxlbWVudFByb3BzOiB0LkJvdW5kRWxlbWVudFByb3BlcnR5QXN0W10gPSBbXTtcblxuICAgIHByb3BzLmZvckVhY2goKHByb3A6IFBhcnNlZFByb3BlcnR5KSA9PiB7XG4gICAgICBpZiAoIXByb3AuaXNMaXRlcmFsICYmICFib3VuZERpcmVjdGl2ZVByb3BOYW1lcy5oYXMocHJvcC5uYW1lKSkge1xuICAgICAgICBjb25zdCBib3VuZFByb3AgPSB0aGlzLl9iaW5kaW5nUGFyc2VyLmNyZWF0ZUJvdW5kRWxlbWVudFByb3BlcnR5KGVsZW1lbnROYW1lLCBwcm9wKTtcbiAgICAgICAgYm91bmRFbGVtZW50UHJvcHMucHVzaCh0LkJvdW5kRWxlbWVudFByb3BlcnR5QXN0LmZyb21Cb3VuZFByb3BlcnR5KGJvdW5kUHJvcCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLl9jaGVja1Byb3BlcnRpZXNJblNjaGVtYShlbGVtZW50TmFtZSwgYm91bmRFbGVtZW50UHJvcHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmluZENvbXBvbmVudERpcmVjdGl2ZXMoZGlyZWN0aXZlczogdC5EaXJlY3RpdmVBc3RbXSk6IHQuRGlyZWN0aXZlQXN0W10ge1xuICAgIHJldHVybiBkaXJlY3RpdmVzLmZpbHRlcihkaXJlY3RpdmUgPT4gZGlyZWN0aXZlLmRpcmVjdGl2ZS5pc0NvbXBvbmVudCk7XG4gIH1cblxuICBwcml2YXRlIF9maW5kQ29tcG9uZW50RGlyZWN0aXZlTmFtZXMoZGlyZWN0aXZlczogdC5EaXJlY3RpdmVBc3RbXSk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5fZmluZENvbXBvbmVudERpcmVjdGl2ZXMoZGlyZWN0aXZlcylcbiAgICAgICAgLm1hcChkaXJlY3RpdmUgPT4gaWRlbnRpZmllck5hbWUoZGlyZWN0aXZlLmRpcmVjdGl2ZS50eXBlKSEpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXNzZXJ0T25seU9uZUNvbXBvbmVudChkaXJlY3RpdmVzOiB0LkRpcmVjdGl2ZUFzdFtdLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pIHtcbiAgICBjb25zdCBjb21wb25lbnRUeXBlTmFtZXMgPSB0aGlzLl9maW5kQ29tcG9uZW50RGlyZWN0aXZlTmFtZXMoZGlyZWN0aXZlcyk7XG4gICAgaWYgKGNvbXBvbmVudFR5cGVOYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLl9yZXBvcnRFcnJvcihcbiAgICAgICAgICBgTW9yZSB0aGFuIG9uZSBjb21wb25lbnQgbWF0Y2hlZCBvbiB0aGlzIGVsZW1lbnQuXFxuYCArXG4gICAgICAgICAgICAgIGBNYWtlIHN1cmUgdGhhdCBvbmx5IG9uZSBjb21wb25lbnQncyBzZWxlY3RvciBjYW4gbWF0Y2ggYSBnaXZlbiBlbGVtZW50LlxcbmAgK1xuICAgICAgICAgICAgICBgQ29uZmxpY3RpbmcgY29tcG9uZW50czogJHtjb21wb25lbnRUeXBlTmFtZXMuam9pbignLCcpfWAsXG4gICAgICAgICAgc291cmNlU3Bhbik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1ha2Ugc3VyZSB0aGF0IG5vbi1hbmd1bGFyIHRhZ3MgY29uZm9ybSB0byB0aGUgc2NoZW1hcy5cbiAgICpcbiAgICogTm90ZTogQW4gZWxlbWVudCBpcyBjb25zaWRlcmVkIGFuIGFuZ3VsYXIgdGFnIHdoZW4gYXQgbGVhc3Qgb25lIGRpcmVjdGl2ZSBzZWxlY3RvciBtYXRjaGVzIHRoZVxuICAgKiB0YWcgbmFtZS5cbiAgICpcbiAgICogQHBhcmFtIG1hdGNoRWxlbWVudCBXaGV0aGVyIGFueSBkaXJlY3RpdmUgaGFzIG1hdGNoZWQgb24gdGhlIHRhZyBuYW1lXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBodG1sIGVsZW1lbnRcbiAgICovXG4gIHByaXZhdGUgX2Fzc2VydEVsZW1lbnRFeGlzdHMobWF0Y2hFbGVtZW50OiBib29sZWFuLCBlbGVtZW50OiBodG1sLkVsZW1lbnQpIHtcbiAgICBjb25zdCBlbE5hbWUgPSBlbGVtZW50Lm5hbWUucmVwbGFjZSgvXjp4aHRtbDovLCAnJyk7XG5cbiAgICBpZiAoIW1hdGNoRWxlbWVudCAmJiAhdGhpcy5fc2NoZW1hUmVnaXN0cnkuaGFzRWxlbWVudChlbE5hbWUsIHRoaXMuX3NjaGVtYXMpKSB7XG4gICAgICBsZXQgZXJyb3JNc2cgPSBgJyR7ZWxOYW1lfScgaXMgbm90IGEga25vd24gZWxlbWVudDpcXG5gO1xuICAgICAgZXJyb3JNc2cgKz0gYDEuIElmICcke1xuICAgICAgICAgIGVsTmFtZX0nIGlzIGFuIEFuZ3VsYXIgY29tcG9uZW50LCB0aGVuIHZlcmlmeSB0aGF0IGl0IGlzIHBhcnQgb2YgdGhpcyBtb2R1bGUuXFxuYDtcbiAgICAgIGlmIChlbE5hbWUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgICAgZXJyb3JNc2cgKz0gYDIuIElmICcke1xuICAgICAgICAgICAgZWxOYW1lfScgaXMgYSBXZWIgQ29tcG9uZW50IHRoZW4gYWRkICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudCB0byBzdXBwcmVzcyB0aGlzIG1lc3NhZ2UuYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgMi4gVG8gYWxsb3cgYW55IGVsZW1lbnQgYWRkICdOT19FUlJPUlNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudC5gO1xuICAgICAgfVxuICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoZXJyb3JNc2csIGVsZW1lbnQuc291cmNlU3Bhbik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfYXNzZXJ0Tm9Db21wb25lbnRzTm9yRWxlbWVudEJpbmRpbmdzT25UZW1wbGF0ZShcbiAgICAgIGRpcmVjdGl2ZXM6IHQuRGlyZWN0aXZlQXN0W10sIGVsZW1lbnRQcm9wczogdC5Cb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdFtdLFxuICAgICAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuKSB7XG4gICAgY29uc3QgY29tcG9uZW50VHlwZU5hbWVzOiBzdHJpbmdbXSA9IHRoaXMuX2ZpbmRDb21wb25lbnREaXJlY3RpdmVOYW1lcyhkaXJlY3RpdmVzKTtcbiAgICBpZiAoY29tcG9uZW50VHlwZU5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgIGBDb21wb25lbnRzIG9uIGFuIGVtYmVkZGVkIHRlbXBsYXRlOiAke2NvbXBvbmVudFR5cGVOYW1lcy5qb2luKCcsJyl9YCwgc291cmNlU3Bhbik7XG4gICAgfVxuICAgIGVsZW1lbnRQcm9wcy5mb3JFYWNoKHByb3AgPT4ge1xuICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgYFByb3BlcnR5IGJpbmRpbmcgJHtcbiAgICAgICAgICAgICAgcHJvcC5uYW1lfSBub3QgdXNlZCBieSBhbnkgZGlyZWN0aXZlIG9uIGFuIGVtYmVkZGVkIHRlbXBsYXRlLiBNYWtlIHN1cmUgdGhhdCB0aGUgcHJvcGVydHkgbmFtZSBpcyBzcGVsbGVkIGNvcnJlY3RseSBhbmQgYWxsIGRpcmVjdGl2ZXMgYXJlIGxpc3RlZCBpbiB0aGUgXCJATmdNb2R1bGUuZGVjbGFyYXRpb25zXCIuYCxcbiAgICAgICAgICBzb3VyY2VTcGFuKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2Fzc2VydEFsbEV2ZW50c1B1Ymxpc2hlZEJ5RGlyZWN0aXZlcyhcbiAgICAgIGRpcmVjdGl2ZXM6IHQuRGlyZWN0aXZlQXN0W10sIGV2ZW50czogdC5Cb3VuZEV2ZW50QXN0W10pIHtcbiAgICBjb25zdCBhbGxEaXJlY3RpdmVFdmVudHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGRpcmVjdGl2ZXMuZm9yRWFjaChkaXJlY3RpdmUgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZGlyZWN0aXZlLmRpcmVjdGl2ZS5vdXRwdXRzKS5mb3JFYWNoKGsgPT4ge1xuICAgICAgICBjb25zdCBldmVudE5hbWUgPSBkaXJlY3RpdmUuZGlyZWN0aXZlLm91dHB1dHNba107XG4gICAgICAgIGFsbERpcmVjdGl2ZUV2ZW50cy5hZGQoZXZlbnROYW1lKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZXZlbnRzLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPSBudWxsIHx8ICFhbGxEaXJlY3RpdmVFdmVudHMuaGFzKGV2ZW50Lm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgYEV2ZW50IGJpbmRpbmcgJHtcbiAgICAgICAgICAgICAgICBldmVudFxuICAgICAgICAgICAgICAgICAgICAuZnVsbE5hbWV9IG5vdCBlbWl0dGVkIGJ5IGFueSBkaXJlY3RpdmUgb24gYW4gZW1iZWRkZWQgdGVtcGxhdGUuIE1ha2Ugc3VyZSB0aGF0IHRoZSBldmVudCBuYW1lIGlzIHNwZWxsZWQgY29ycmVjdGx5IGFuZCBhbGwgZGlyZWN0aXZlcyBhcmUgbGlzdGVkIGluIHRoZSBcIkBOZ01vZHVsZS5kZWNsYXJhdGlvbnNcIi5gLFxuICAgICAgICAgICAgZXZlbnQuc291cmNlU3Bhbik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9jaGVja1Byb3BlcnRpZXNJblNjaGVtYShlbGVtZW50TmFtZTogc3RyaW5nLCBib3VuZFByb3BzOiB0LkJvdW5kRWxlbWVudFByb3BlcnR5QXN0W10pOlxuICAgICAgdC5Cb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdFtdIHtcbiAgICAvLyBOb3RlOiBXZSBjYW4ndCBmaWx0ZXIgb3V0IGVtcHR5IGV4cHJlc3Npb25zIGJlZm9yZSB0aGlzIG1ldGhvZCxcbiAgICAvLyBhcyB3ZSBzdGlsbCB3YW50IHRvIHZhbGlkYXRlIHRoZW0hXG4gICAgcmV0dXJuIGJvdW5kUHJvcHMuZmlsdGVyKChib3VuZFByb3ApID0+IHtcbiAgICAgIGlmIChib3VuZFByb3AudHlwZSA9PT0gdC5Qcm9wZXJ0eUJpbmRpbmdUeXBlLlByb3BlcnR5ICYmXG4gICAgICAgICAgIXRoaXMuX3NjaGVtYVJlZ2lzdHJ5Lmhhc1Byb3BlcnR5KGVsZW1lbnROYW1lLCBib3VuZFByb3AubmFtZSwgdGhpcy5fc2NoZW1hcykpIHtcbiAgICAgICAgbGV0IGVycm9yTXNnID0gYENhbid0IGJpbmQgdG8gJyR7Ym91bmRQcm9wLm5hbWV9JyBzaW5jZSBpdCBpc24ndCBhIGtub3duIHByb3BlcnR5IG9mICcke1xuICAgICAgICAgICAgZWxlbWVudE5hbWV9Jy5gO1xuICAgICAgICBpZiAoZWxlbWVudE5hbWUuc3RhcnRzV2l0aCgnbmctJykpIHtcbiAgICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgICBgXFxuMS4gSWYgJyR7XG4gICAgICAgICAgICAgICAgICBib3VuZFByb3BcbiAgICAgICAgICAgICAgICAgICAgICAubmFtZX0nIGlzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLCB0aGVuIGFkZCAnQ29tbW9uTW9kdWxlJyB0byB0aGUgJ0BOZ01vZHVsZS5pbXBvcnRzJyBvZiB0aGlzIGNvbXBvbmVudC5gICtcbiAgICAgICAgICAgICAgYFxcbjIuIFRvIGFsbG93IGFueSBwcm9wZXJ0eSBhZGQgJ05PX0VSUk9SU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50LmA7XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudE5hbWUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgICBgXFxuMS4gSWYgJyR7ZWxlbWVudE5hbWV9JyBpcyBhbiBBbmd1bGFyIGNvbXBvbmVudCBhbmQgaXQgaGFzICcke1xuICAgICAgICAgICAgICAgICAgYm91bmRQcm9wLm5hbWV9JyBpbnB1dCwgdGhlbiB2ZXJpZnkgdGhhdCBpdCBpcyBwYXJ0IG9mIHRoaXMgbW9kdWxlLmAgK1xuICAgICAgICAgICAgICBgXFxuMi4gSWYgJyR7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50TmFtZX0nIGlzIGEgV2ViIENvbXBvbmVudCB0aGVuIGFkZCAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQgdG8gc3VwcHJlc3MgdGhpcyBtZXNzYWdlLmAgK1xuICAgICAgICAgICAgICBgXFxuMy4gVG8gYWxsb3cgYW55IHByb3BlcnR5IGFkZCAnTk9fRVJST1JTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQuYDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9yZXBvcnRFcnJvcihlcnJvck1zZywgYm91bmRQcm9wLnNvdXJjZVNwYW4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuICFpc0VtcHR5RXhwcmVzc2lvbihib3VuZFByb3AudmFsdWUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVwb3J0RXJyb3IoXG4gICAgICBtZXNzYWdlOiBzdHJpbmcsIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICAgIGxldmVsOiBQYXJzZUVycm9yTGV2ZWwgPSBQYXJzZUVycm9yTGV2ZWwuRVJST1IpIHtcbiAgICB0aGlzLl90YXJnZXRFcnJvcnMucHVzaChuZXcgUGFyc2VFcnJvcihzb3VyY2VTcGFuLCBtZXNzYWdlLCBsZXZlbCkpO1xuICB9XG59XG5cbmNsYXNzIE5vbkJpbmRhYmxlVmlzaXRvciBpbXBsZW1lbnRzIGh0bWwuVmlzaXRvciB7XG4gIHZpc2l0RWxlbWVudChhc3Q6IGh0bWwuRWxlbWVudCwgcGFyZW50OiBFbGVtZW50Q29udGV4dCk6IHQuRWxlbWVudEFzdHxudWxsIHtcbiAgICBjb25zdCBwcmVwYXJzZWRFbGVtZW50ID0gcHJlcGFyc2VFbGVtZW50KGFzdCk7XG4gICAgaWYgKHByZXBhcnNlZEVsZW1lbnQudHlwZSA9PT0gUHJlcGFyc2VkRWxlbWVudFR5cGUuU0NSSVBUIHx8XG4gICAgICAgIHByZXBhcnNlZEVsZW1lbnQudHlwZSA9PT0gUHJlcGFyc2VkRWxlbWVudFR5cGUuU1RZTEUgfHxcbiAgICAgICAgcHJlcGFyc2VkRWxlbWVudC50eXBlID09PSBQcmVwYXJzZWRFbGVtZW50VHlwZS5TVFlMRVNIRUVUKSB7XG4gICAgICAvLyBTa2lwcGluZyA8c2NyaXB0PiBmb3Igc2VjdXJpdHkgcmVhc29uc1xuICAgICAgLy8gU2tpcHBpbmcgPHN0eWxlPiBhbmQgc3R5bGVzaGVldHMgYXMgd2UgYWxyZWFkeSBwcm9jZXNzZWQgdGhlbVxuICAgICAgLy8gaW4gdGhlIFN0eWxlQ29tcGlsZXJcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGF0dHJOYW1lQW5kVmFsdWVzID0gYXN0LmF0dHJzLm1hcCgoYXR0cik6IFtzdHJpbmcsIHN0cmluZ10gPT4gW2F0dHIubmFtZSwgYXR0ci52YWx1ZV0pO1xuICAgIGNvbnN0IHNlbGVjdG9yID0gY3JlYXRlRWxlbWVudENzc1NlbGVjdG9yKGFzdC5uYW1lLCBhdHRyTmFtZUFuZFZhbHVlcyk7XG4gICAgY29uc3QgbmdDb250ZW50SW5kZXggPSBwYXJlbnQuZmluZE5nQ29udGVudEluZGV4KHNlbGVjdG9yKTtcbiAgICBjb25zdCBjaGlsZHJlbjogdC5UZW1wbGF0ZUFzdFtdID0gaHRtbC52aXNpdEFsbCh0aGlzLCBhc3QuY2hpbGRyZW4sIEVNUFRZX0VMRU1FTlRfQ09OVEVYVCk7XG4gICAgcmV0dXJuIG5ldyB0LkVsZW1lbnRBc3QoXG4gICAgICAgIGFzdC5uYW1lLCBodG1sLnZpc2l0QWxsKHRoaXMsIGFzdC5hdHRycyksIFtdLCBbXSwgW10sIFtdLCBbXSwgZmFsc2UsIFtdLCBjaGlsZHJlbixcbiAgICAgICAgbmdDb250ZW50SW5kZXgsIGFzdC5zb3VyY2VTcGFuLCBhc3QuZW5kU291cmNlU3Bhbik7XG4gIH1cbiAgdmlzaXRDb21tZW50KGNvbW1lbnQ6IGh0bWwuQ29tbWVudCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHZpc2l0QXR0cmlidXRlKGF0dHJpYnV0ZTogaHRtbC5BdHRyaWJ1dGUsIGNvbnRleHQ6IGFueSk6IHQuQXR0ckFzdCB7XG4gICAgcmV0dXJuIG5ldyB0LkF0dHJBc3QoYXR0cmlidXRlLm5hbWUsIGF0dHJpYnV0ZS52YWx1ZSwgYXR0cmlidXRlLnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgdmlzaXRUZXh0KHRleHQ6IGh0bWwuVGV4dCwgcGFyZW50OiBFbGVtZW50Q29udGV4dCk6IHQuVGV4dEFzdCB7XG4gICAgY29uc3QgbmdDb250ZW50SW5kZXggPSBwYXJlbnQuZmluZE5nQ29udGVudEluZGV4KFRFWFRfQ1NTX1NFTEVDVE9SKCkpITtcbiAgICByZXR1cm4gbmV3IHQuVGV4dEFzdCh0ZXh0LnZhbHVlLCBuZ0NvbnRlbnRJbmRleCwgdGV4dC5zb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uKGV4cGFuc2lvbjogaHRtbC5FeHBhbnNpb24sIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGV4cGFuc2lvbjtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uQ2FzZShleHBhbnNpb25DYXNlOiBodG1sLkV4cGFuc2lvbkNhc2UsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGV4cGFuc2lvbkNhc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHJlZmVyZW5jZSB0byBhbiBlbGVtZW50IG9yIGRpcmVjdGl2ZSBpbiBhIHRlbXBsYXRlLiBFLmcuLCB0aGUgcmVmZXJlbmNlIGluIHRoaXMgdGVtcGxhdGU6XG4gKlxuICogPGRpdiAjbXlNZW51PVwiY29vbE1lbnVcIj5cbiAqXG4gKiB3b3VsZCBiZSB7bmFtZTogJ215TWVudScsIHZhbHVlOiAnY29vbE1lbnUnLCBzb3VyY2VTcGFuOiAuLi59XG4gKi9cbmNsYXNzIEVsZW1lbnRPckRpcmVjdGl2ZVJlZiB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBuYW1lOiBzdHJpbmcsIHB1YmxpYyB2YWx1ZTogc3RyaW5nLCBwdWJsaWMgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuKSB7fVxuXG4gIC8qKiBHZXRzIHdoZXRoZXIgdGhpcyBpcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2l2ZW4gZGlyZWN0aXZlLiAqL1xuICBpc1JlZmVyZW5jZVRvRGlyZWN0aXZlKGRpcmVjdGl2ZTogQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnkpIHtcbiAgICByZXR1cm4gc3BsaXRFeHBvcnRBcyhkaXJlY3RpdmUuZXhwb3J0QXMpLmluZGV4T2YodGhpcy52YWx1ZSkgIT09IC0xO1xuICB9XG59XG5cbi8qKiBTcGxpdHMgYSByYXcsIHBvdGVudGlhbGx5IGNvbW1hLWRlbGltaXRlZCBgZXhwb3J0QXNgIHZhbHVlIGludG8gYW4gYXJyYXkgb2YgbmFtZXMuICovXG5mdW5jdGlvbiBzcGxpdEV4cG9ydEFzKGV4cG9ydEFzOiBzdHJpbmd8bnVsbCk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGV4cG9ydEFzID8gZXhwb3J0QXMuc3BsaXQoJywnKS5tYXAoZSA9PiBlLnRyaW0oKSkgOiBbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0Q2xhc3NlcyhjbGFzc0F0dHJWYWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gY2xhc3NBdHRyVmFsdWUudHJpbSgpLnNwbGl0KC9cXHMrL2cpO1xufVxuXG5jbGFzcyBFbGVtZW50Q29udGV4dCB7XG4gIHN0YXRpYyBjcmVhdGUoXG4gICAgICBpc1RlbXBsYXRlRWxlbWVudDogYm9vbGVhbiwgZGlyZWN0aXZlczogdC5EaXJlY3RpdmVBc3RbXSxcbiAgICAgIHByb3ZpZGVyQ29udGV4dDogUHJvdmlkZXJFbGVtZW50Q29udGV4dCk6IEVsZW1lbnRDb250ZXh0IHtcbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcigpO1xuICAgIGxldCB3aWxkY2FyZE5nQ29udGVudEluZGV4OiBudW1iZXIgPSBudWxsITtcbiAgICBjb25zdCBjb21wb25lbnQgPSBkaXJlY3RpdmVzLmZpbmQoZGlyZWN0aXZlID0+IGRpcmVjdGl2ZS5kaXJlY3RpdmUuaXNDb21wb25lbnQpO1xuICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgIGNvbnN0IG5nQ29udGVudFNlbGVjdG9ycyA9IGNvbXBvbmVudC5kaXJlY3RpdmUudGVtcGxhdGUgIS5uZ0NvbnRlbnRTZWxlY3RvcnM7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5nQ29udGVudFNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBzZWxlY3RvciA9IG5nQ29udGVudFNlbGVjdG9yc1tpXTtcbiAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnKicpIHtcbiAgICAgICAgICB3aWxkY2FyZE5nQ29udGVudEluZGV4ID0gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKG5nQ29udGVudFNlbGVjdG9yc1tpXSksIGkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgRWxlbWVudENvbnRleHQoaXNUZW1wbGF0ZUVsZW1lbnQsIG1hdGNoZXIsIHdpbGRjYXJkTmdDb250ZW50SW5kZXgsIHByb3ZpZGVyQ29udGV4dCk7XG4gIH1cbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgaXNUZW1wbGF0ZUVsZW1lbnQ6IGJvb2xlYW4sIHByaXZhdGUgX25nQ29udGVudEluZGV4TWF0Y2hlcjogU2VsZWN0b3JNYXRjaGVyLFxuICAgICAgcHJpdmF0ZSBfd2lsZGNhcmROZ0NvbnRlbnRJbmRleDogbnVtYmVyfG51bGwsXG4gICAgICBwdWJsaWMgcHJvdmlkZXJDb250ZXh0OiBQcm92aWRlckVsZW1lbnRDb250ZXh0fG51bGwpIHt9XG5cbiAgZmluZE5nQ29udGVudEluZGV4KHNlbGVjdG9yOiBDc3NTZWxlY3Rvcik6IG51bWJlcnxudWxsIHtcbiAgICBjb25zdCBuZ0NvbnRlbnRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xuICAgIHRoaXMuX25nQ29udGVudEluZGV4TWF0Y2hlci5tYXRjaChzZWxlY3RvciwgKHNlbGVjdG9yLCBuZ0NvbnRlbnRJbmRleCkgPT4ge1xuICAgICAgbmdDb250ZW50SW5kaWNlcy5wdXNoKG5nQ29udGVudEluZGV4KTtcbiAgICB9KTtcbiAgICBuZ0NvbnRlbnRJbmRpY2VzLnNvcnQoKTtcbiAgICBpZiAodGhpcy5fd2lsZGNhcmROZ0NvbnRlbnRJbmRleCAhPSBudWxsKSB7XG4gICAgICBuZ0NvbnRlbnRJbmRpY2VzLnB1c2godGhpcy5fd2lsZGNhcmROZ0NvbnRlbnRJbmRleCk7XG4gICAgfVxuICAgIHJldHVybiBuZ0NvbnRlbnRJbmRpY2VzLmxlbmd0aCA+IDAgPyBuZ0NvbnRlbnRJbmRpY2VzWzBdIDogbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRWxlbWVudENzc1NlbGVjdG9yKFxuICAgIGVsZW1lbnROYW1lOiBzdHJpbmcsIGF0dHJpYnV0ZXM6IFtzdHJpbmcsIHN0cmluZ11bXSk6IENzc1NlbGVjdG9yIHtcbiAgY29uc3QgY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3IoKTtcbiAgY29uc3QgZWxOYW1lTm9OcyA9IHNwbGl0TnNOYW1lKGVsZW1lbnROYW1lKVsxXTtcblxuICBjc3NTZWxlY3Rvci5zZXRFbGVtZW50KGVsTmFtZU5vTnMpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGF0dHJOYW1lID0gYXR0cmlidXRlc1tpXVswXTtcbiAgICBjb25zdCBhdHRyTmFtZU5vTnMgPSBzcGxpdE5zTmFtZShhdHRyTmFtZSlbMV07XG4gICAgY29uc3QgYXR0clZhbHVlID0gYXR0cmlidXRlc1tpXVsxXTtcblxuICAgIGNzc1NlbGVjdG9yLmFkZEF0dHJpYnV0ZShhdHRyTmFtZU5vTnMsIGF0dHJWYWx1ZSk7XG4gICAgaWYgKGF0dHJOYW1lLnRvTG93ZXJDYXNlKCkgPT0gQ0xBU1NfQVRUUikge1xuICAgICAgY29uc3QgY2xhc3NlcyA9IHNwbGl0Q2xhc3NlcyhhdHRyVmFsdWUpO1xuICAgICAgY2xhc3Nlcy5mb3JFYWNoKGNsYXNzTmFtZSA9PiBjc3NTZWxlY3Rvci5hZGRDbGFzc05hbWUoY2xhc3NOYW1lKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjc3NTZWxlY3Rvcjtcbn1cblxuY29uc3QgRU1QVFlfRUxFTUVOVF9DT05URVhUID0gbmV3IEVsZW1lbnRDb250ZXh0KHRydWUsIG5ldyBTZWxlY3Rvck1hdGNoZXIoKSwgbnVsbCwgbnVsbCk7XG5jb25zdCBOT05fQklOREFCTEVfVklTSVRPUiA9IG5ldyBOb25CaW5kYWJsZVZpc2l0b3IoKTtcblxuZnVuY3Rpb24gX2lzRW1wdHlUZXh0Tm9kZShub2RlOiBodG1sLk5vZGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiBodG1sLlRleHQgJiYgbm9kZS52YWx1ZS50cmltKCkubGVuZ3RoID09IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTdW1tYXJ5RHVwbGljYXRlczxUIGV4dGVuZHMge3R5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGF9PihpdGVtczogVFtdKTogVFtdIHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxhbnksIFQ+KCk7XG5cbiAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgIGlmICghbWFwLmdldChpdGVtLnR5cGUucmVmZXJlbmNlKSkge1xuICAgICAgbWFwLnNldChpdGVtLnR5cGUucmVmZXJlbmNlLCBpdGVtKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5RXhwcmVzc2lvbihhc3Q6IEFTVCk6IGJvb2xlYW4ge1xuICBpZiAoYXN0IGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgIGFzdCA9IGFzdC5hc3Q7XG4gIH1cbiAgcmV0dXJuIGFzdCBpbnN0YW5jZW9mIEVtcHR5RXhwcjtcbn1cbiJdfQ==