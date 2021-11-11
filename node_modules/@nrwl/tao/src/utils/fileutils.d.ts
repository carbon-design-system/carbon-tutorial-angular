import type { JsonParseOptions, JsonSerializeOptions } from './json';
export interface JsonReadOptions extends JsonParseOptions {
    /**
     * mutable field recording whether JSON ends with new line
     * @default false
     */
    endsWithNewline?: boolean;
}
export interface JsonWriteOptions extends JsonSerializeOptions {
    /**
     * whether to append new line at the end of JSON file
     * @default false
     */
    appendNewLine?: boolean;
}
/**
 * Reads a JSON file and returns the object the JSON content represents.
 *
 * @param path A path to a file.
 * @param options JSON parse options
 * @returns Object the JSON content of the file represents
 */
export declare function readJsonFile<T extends object = any>(path: string, options?: JsonReadOptions): T;
/**
 * Serializes the given data to JSON and writes it to a file.
 *
 * @param path A path to a file.
 * @param data data which should be serialized to JSON and written to the file
 * @param options JSON serialize options
 */
export declare function writeJsonFile<T extends object = object>(path: string, data: T, options?: JsonWriteOptions): void;
