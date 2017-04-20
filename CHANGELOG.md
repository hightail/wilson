#Wilson CHANGELOG

#v3.0.0
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

#v1.0.0
- Create /app directory to use as a test app using the wilson framework
- Created initial wilson-config.json that has wilson settings only. This is divided by client and server.
- Extracted connectionFilters (now tags) to config
- Created tag-middleware concept to allow app to create its own tagging functions
- Added /version and /config routes