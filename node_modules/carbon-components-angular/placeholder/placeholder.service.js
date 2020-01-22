/*!
 *
 * carbon-angular v0.0.0 | placeholder.service.js
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


import { Injectable } from "@angular/core";
/**
 * Singleton service used to register the container for out-of-flow components to insert into.
 * Also used to insert/remove components from that view.
 */
var PlaceholderService = /** @class */ (function () {
    function PlaceholderService() {
        /**
         * Maintain a `ViewContainerRef` to an instance of the component.
         */
        this.viewContainerRef = null;
    }
    /**
     * Used by `Placeholder` to register view-container reference.
     */
    PlaceholderService.prototype.registerViewContainerRef = function (vcRef) {
        this.viewContainerRef = vcRef;
    };
    /**
     * Creates and returns component in the view.
     */
    PlaceholderService.prototype.createComponent = function (componentFactory, injector) {
        if (!this.viewContainerRef) {
            console.error("No view container defined! Likely due to a missing `ibm-placeholder`");
        }
        return this.viewContainerRef.createComponent(componentFactory, null, injector);
    };
    PlaceholderService.prototype.destroyComponent = function (component) {
        var index = this.viewContainerRef.indexOf(component.hostView);
        if (index < 0) {
            return;
        }
        // destroy the view
        this.viewContainerRef.remove(index);
    };
    PlaceholderService.prototype.hasComponentRef = function (component) {
        if (this.viewContainerRef.indexOf(component.hostView) < 0) {
            return false;
        }
        return true;
    };
    PlaceholderService.prototype.hasPlaceholderRef = function () {
        return !!this.viewContainerRef;
    };
    PlaceholderService.prototype.appendElement = function (element) {
        return this.viewContainerRef.element.nativeElement.appendChild(element);
    };
    PlaceholderService.prototype.removeElement = function (element) {
        return this.viewContainerRef.element.nativeElement.removeChild(element);
    };
    PlaceholderService.prototype.hasElement = function (element) {
        return this.viewContainerRef.element.nativeElement.contains(element);
    };
    PlaceholderService.decorators = [
        { type: Injectable },
    ];
    return PlaceholderService;
}());
export { PlaceholderService };
//# sourceMappingURL=placeholder.service.js.map