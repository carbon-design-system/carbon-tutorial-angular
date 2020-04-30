/*!
 *
 * carbon-angular v0.0.0 | placeholder.service.d.ts
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


import { ComponentRef, ViewContainerRef, ComponentFactory, Injector } from "@angular/core";
/**
 * Singleton service used to register the container for out-of-flow components to insert into.
 * Also used to insert/remove components from that view.
 */
export declare class PlaceholderService {
    /**
     * Maintain a `ViewContainerRef` to an instance of the component.
     */
    protected viewContainerRef: ViewContainerRef;
    /**
     * Used by `Placeholder` to register view-container reference.
     */
    registerViewContainerRef(vcRef: ViewContainerRef): void;
    /**
     * Creates and returns component in the view.
     */
    createComponent(componentFactory: ComponentFactory<any>, injector: Injector): ComponentRef<any>;
    destroyComponent(component: ComponentRef<any>): void;
    hasComponentRef(component: ComponentRef<any>): boolean;
    hasPlaceholderRef(): boolean;
    appendElement(element: HTMLElement): HTMLElement;
    removeElement(element: HTMLElement): HTMLElement;
    hasElement(element: HTMLElement): boolean;
}
