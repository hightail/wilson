# Wilson CHANGELOG

# 4.0.0
- Remove AppStateService - move functionality directly to components
- Added new **getActiveRouteInfo** method to wilson (allows removal of AppStateService)
- Added new **router** construct on wilson for declaring a router (aka routing service) to replace IRouteService
- Implemented a default router to be used if none is specified in the wilson-config
- Updated **getActiveComponentList** method to return all component info (now scopes)
- Removed need to resolve $template for components
- Added special **wilsonScripts** handlebars block helper to expand all necessary wilson scripts into an app index page.
- Added support for components and behaviors to be organized into any sub-folder structure.
- Added "exports" option to component definitions to support exposing only specific methods onto parent components when using the "expose" attribute
- Added "inherit" option to component definitions to support inheriting specific methods from a parent component (if they exist).
- Discontinued and removed all "controller" decorations from components - All decorations now moved to $scope.
- Discontinued and removed support for **$scope.auto** methods
- Discontinued and removed support for **$scope.setPersistentValue**, **$scope.setPersistentValues** and **$scope.getPersistentValue**
- Updated namespace for component event handlers to **$scope.on.<handlerMethod>()**
- Updated namespace for component storage methods to **$scope.storage.get()** and **$scope.storage.set()**

# v3.1.0
- Removed printStackTrace method
- Added **bool** utility as a shorthand alias to **parseBoolean**   
- Renamed IRouteService **translateTitle** to **getTitleText**

# v3.0.0
- WilsonUtils service added to contain utilities
- WilsonLogger service created to abstract logging for apps
- Component implementation consolidated to directives for both page and building block style components
- Methods added for getActiveComponent and getActiveComponentList to client Wilson module which provide scope and
controller instances to outer application.
- Prerender client-side services removed as they are no longer necessary
- Deprecation service removed
- Debug Mode removed
- Performance-based disabling of angular $compileProvider features
- Bower.json and bower referenced dependencies for testing removed (now using npm only)

# v1.0.0
- Create /app directory to use as a test app using the wilson framework
- Created initial wilson-config.json that has wilson settings only. This is divided by client and server.
- Extracted connectionFilters (now tags) to config
- Created tag-middleware concept to allow app to create its own tagging functions
- Added /version and /config routes