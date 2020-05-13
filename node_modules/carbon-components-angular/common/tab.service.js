/*!
 *
 * carbon-angular v0.0.0 | tab.service.js
 *
 * Copyright 2014, 2019 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


export var tabbableSelector = "a[href], area[href], input:not([disabled]):not([tabindex=\'-1\']), " +
    "button:not([disabled]):not([tabindex=\'-1\']),select:not([disabled]):not([tabindex=\'-1\']), " +
    "textarea:not([disabled]):not([tabindex=\'-1\']), " +
    "iframe, object, embed, *[tabindex]:not([tabindex=\'-1\']), *[contenteditable=true]";
export var tabbableSelectorIgnoreTabIndex = "a[href], area[href], input:not([disabled]), " +
    "button:not([disabled]),select:not([disabled]), " +
    "textarea:not([disabled]), " +
    "iframe, object, embed, *[tabindex], *[contenteditable=true]";
export function getFocusElementList(element, selector) {
    if (selector === void 0) { selector = tabbableSelector; }
    var elements = element.querySelectorAll(selector);
    return elements ? Array.prototype.filter.call(elements, function (el) { return isVisible(el); }) : elements;
}
export function isFocusInFirstItem(event, list) {
    if (list.length > 0) {
        return (event.target || event.srcElement) === list[0];
    }
    return false;
}
export function isFocusInLastItem(event, list) {
    if (list.length > 0) {
        return (event.target || event.srcElement) === list[list.length - 1];
    }
    return false;
}
export function isElementFocused(event, element) {
    return (event.target || event.srcElement) === element;
}
export function focusFirstFocusableElement(list) {
    if (list.length > 0) {
        list[0].focus();
        return true;
    }
    return false;
}
export function focusLastFocusableElement(list) {
    if (list.length > 0) {
        list[list.length - 1].focus();
        return true;
    }
    return false;
}
export function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}
export function cycleTabs(event, element) {
    if (event.key === "Tab") {
        var list = getFocusElementList(element);
        var focusChanged = false;
        if (event.shiftKey) {
            if (isFocusInFirstItem(event, list) || isElementFocused(event, element)) {
                focusChanged = focusLastFocusableElement(list);
            }
        }
        else {
            if (isFocusInLastItem(event, list)) {
                focusChanged = focusFirstFocusableElement(list);
            }
        }
        if (focusChanged) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
}
//# sourceMappingURL=tab.service.js.map