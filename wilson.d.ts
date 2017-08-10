// Type definitions for Wilson 3.1.x
// Project https://github.com/hightail/wilson
// Definitions by: Hunter Novak <https://github.com/hunternovak>
// Definitions: https://github.com/hightail/wilson/wilson.d.ts


interface WilsonPathUtils {

  join(...arguments: any[]): string;

}


interface WilsonUtils {

  // Array Utilities
  spliceArray(targetArray: any[], startIdx?: number, endIdx?: number, replacements?: any[]): any[];
  replaceArray(destination: any[], source: any[]): void;
  clearArray(targetArray: any[]): void;
  
  // Object Utilities
  clearObject(targetObj: Object): void;
  replaceObject(destination: Object, source: Object): void;
  getPropFromPath(obj: Object, path: string): any;
  setPropFromPath(obj: Object, path: string, value: any): void;

  // Data Utilities
  bytesToReadable(bytes: number, decimalPoint?: number): string;
  generateUUID(): string;

  // Type Utilities
  parseBoolean(value: any): boolean;
  bool(value: any): boolean;

  // Url Utilities
  path: WilsonPathUtils;

  // Key Codes
  keyCodes: Object;

}


interface WilsonLogger {

  setLevel(logLevel: string): void;

  // Logging Methods
  trace(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  fatal(message: string): void;
}


interface Wilson {

  // Properties
  utils:      WilsonUtils;
  log:        WilsonLogger;
  config:     Object;
  routeInfo:  Object;

  // Public Methods
  setAppConfig(config: Object): void;
  getActivePage(): boolean;
  getActiveComponent(componentId: string): Object;
  getActiveComponentList(): Object[];
  findComponentId(jqElement: Object): string;
  destroyComponent(componentId: string): void;
  router(definition: any[]|Function): void;
  filter(name: string, definition: any[]|Function): void;
  component(name: string, config: Object): void;
  behavior(name: string, definition: any[]|Function): void;
  service(name: string, definition: any[]|Function): void;
  class(name: string, definition: any[]|Function): void;
  utility(name: string, definition: any[]|Function): void;
  factory(name: string, definition: any[]|Function): void;
  resource(name: string, definition: any[]|Function): void;

}

interface IWilsonExtendedScope extends angular.IScope {
  // Wilson Scope Decorations
  $root: IWilsonExtendedRootScope;
  component: IWilsonComponentInfo;
  on: IWilsonEventHelper;
  storage: IWilsonStorageHelper;
  state: {[key: string]: Function|boolean|string};

  translate(text: string, options: object): string;
  defaultValue(propertyName: string, defaultValue: any): any;
  triggerDigest(): angular.IPromise;
  bindToDigest(method: Function, context: any): Function;
  stateMachine(config: Object): void;

  $broadcastRoot(name: string, ...args: any[]): angular.IAngularEvent;

  onDependenciesReady(): void;
  onDependenciesError(): void;
}

interface IWilsonExtendedRootScope extends angular.IRootScopeService {
  triggerDigest(): angular.IPromise;
  bindToDigest(method: Function, context: any): Function;
}

interface IWilsonStorageHelper {
  get(key: string, defaultValue: any): any;
  set(keyValueHash: Object): Object;
  set(key: string, value: any): Object;
}

interface IWilsonEventHelper {
  event(name: string, listener: (event: angular.IAngularEvent, ...args: any[]) => any): () => void;

  watch(watchExpression: string, listener?: string, objectEquality?: boolean): () => void;
  watch<T>(watchExpression: string, listener?: (newValue: T, oldValue: T, scope: angular.IScope) => any, objectEquality?: boolean): () => void;
  watch(watchExpression: (scope: angular.IScope) => any, listener?: string, objectEquality?: boolean): () => void;
  watch<T>(watchExpression: (scope: angular.IScope) => T, listener?: (newValue: T, oldValue: T, scope: angular.IScope) => any, objectEquality?: boolean): () => void;

  signal(signal: Object, handler: Function): void;

  digest(handler: Function): void;

  pageUnload(handler: Function, includeLocalNav: boolean): () => void;
}

interface IWilsonComponentInfo {
  id: string;
  name: string;
}

interface IWilsonComponent {
  scope: IWilsonExtendedScope;
  component: IWilsonComponentInfo;
  on: IWilsonEventHelper;
  storage: IWilsonStorageHelper;
}

declare var wilson: Wilson;

declare var $scope: IWilsonExtendedScope;

declare var $rootScope: IWilsonExtendedRootScope;