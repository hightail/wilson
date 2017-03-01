// Type definitions for Wilson 2.0.x
// Project https://github.com/hightail/wilson
// Definitions by: Hunter Novak <https://github.com/hunternovak>
// Definitions: https://github.com/hightail/wilson/wilson.d.ts


interface WilsonPathUtils {

  join(...arguments: any[]): string;

}


interface WilsonUtils {

  // Array Utilities
  spliceArray(targetArray: any[], start?: number, replace?: number, arrayOfReplacements?: any[]): any[];
  replaceArray(destinationArray: any[], sourceArray: any[]): void;
  clearArray(targetArray: any[]): void;
  
  // Object Utilities
  clearObject(object: Object): void;
  replaceObject(destinationObject: Object, sourceObject: Object): void;
  getPropFromPath(object: Object, path: string): any;
  setPropFromPath(object: Object, path: string, value: any): void;

  // Data Utilities
  bytesToReadable(bytes: number, decimalPoint?: number): string;
  generateUUID(): string;

  // Error Utilities
  printStackTrace(): void;

  // Type Utilities
  parseBoolean(value: any): boolean;

  // Url Utilities
  path: WilsonPathUtils;

  // Key Codes
  keyCodes: Object;

}


interface Wilson {

  // Properties
  utils:  WilsonUtils;
  config: Object;

  // Public Methods
  setAppConfig(config: Object): void;
  getActivePage(): boolean;
  filter(name: string, definition: any[]|Function): void;
  component(name: string, config: Object): void;
  behavior(name: string, definition: any[]|Function): void;
  service(name: string, definition: any[]|Function): void;
  class(name: string, definition: any[]|Function): void;
  utility(name: string, definition: any[]|Function): void;
  factory(name: string, definition: any[]|Function): void;
  resource(name: string, definition: any[]|Function): void;

}


declare var wilson: Wilson;