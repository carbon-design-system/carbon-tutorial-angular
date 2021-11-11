import type { AST, R3_Node as Node } from '@angular-eslint/bundled-angular-compiler';
declare type ASTOrNodeWithParent = (AST | Node) & {
    parent?: ASTOrNodeWithParent;
};
export declare function getNearestNodeFrom<T extends ASTOrNodeWithParent>({ parent }: ASTOrNodeWithParent, predicate: (parent: ASTOrNodeWithParent) => parent is T): T | null;
export {};
