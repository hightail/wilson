/**
 * Component Service
 *
 * Provides all functionality necessary for service components. Includes dependency resolution, caching and i18n
 * pre-rendering of component templates. On startup, all components are scanned and a dependencyLib is created to
 * represent all components and their dependencies (scripts, templates, styles, and sub component dependencies).
 *
 * Building a component will return a JSON object that contains all appropriate data related to bootstrapping the
 * component into a client application. This data will change based on properties that are relevant that specific
 * request (i.e. user-agent string, user-type and or enterprise brand).
 *
 * User: hunter.novak
 * Date: 7/9/13
 */

// Module Includes
var fs            = require("fs"),
    path          = require("path"),
    xpath         = require("xpath"),
    hbs           = require('hbs'),
    glob          = require('glob'),
    Q             = require('q'),
    dom           = require('@xmldom/xmldom').DOMParser,
    ProcessUtil   = require('../utils/ProcessUtil'),
    ArrayUtil     = require('../utils/ArrayUtil'),
    ustring       = require('underscore.string'),
    _             = require('../utils/HtLodash');

module.exports = function(wilsonConfig, wilsonFrameworkConfig, logger, CacheService, BundleService, RevisionedFileUtil) {
  var config = wilsonConfig;
  var projectPaths = wilsonConfig.server.projectPaths;

  // If true request will used cached JSON rather than regenerating it
  var readFromCache = false;

  //The current version of components. This can be set in init()
  var componentVersion = wilsonConfig.client.app.version; // e.g. 'v1.0'

  //Since we could be running in dev/prd, we need to determine the
  //true local path to the files not just a realtive path
  //var localPathPrefix = path.join(__dirname, ('..' + path.sep + '..'));
  var localPathPrefix = projectPaths.root;//path.join(__dirname, ('..' + path.sep + '..'));

  // Styles Path - e.g. "./client/styles/exports/chunks
  var stylesPath = path.join(localPathPrefix, projectPaths.styles);

  // Component Paths - e.g. "./client/src/components"
  var componentsPath  = path.join(localPathPrefix, projectPaths.components);

  var changeListPath = path.join(localPathPrefix, config.server.caching.folder, '/change-list.json');
  var readChangeList = false;

  // Behaviors Path - e.g. "./client/src/behaviors"
  var behaviorsPath = path.join(localPathPrefix, projectPaths.behaviors);

  // Guides Path - e.g. "client/src/guides"
  var guidesPath    = path.join(localPathPrefix, projectPaths.guides);

  var servicesPath  = path.join(localPathPrefix, projectPaths.services);
  var filtersPath   = path.join(localPathPrefix, projectPaths.filters);

  var clientAppPath     = path.join(localPathPrefix, projectPaths.clientApp);
  var indexPath         = path.join(localPathPrefix, projectPaths.index);
  var routeServicePath  = path.join(localPathPrefix, projectPaths.routeService);

  // Build-time cache for services
  var buildTimeCache = {
    coreComponents:       {},
    serviceDeps:          {},
    behaviorScripts:      {},
    behaviorServiceDeps:  {}
  };

  var componentPrefix = wilsonConfig.server.dependencies.selectors.component + '-';
  var behaviorPrefix  = wilsonConfig.server.dependencies.selectors.behavior + '-';
  var guidePrefix     = wilsonConfig.server.dependencies.selectors.guide + '-';

  // Local Memory Library Cache
  var coreLibraries   = { };
  var _componentCache = null;

  var getChangesFromChangeList = function () {
    var changes = false;

    if (fs.existsSync(changeListPath)) {
      changes = JSON.parse(fs.readFileSync(changeListPath));
      fs.unlink(changeListPath);
    }

    return changes;
  };

  var clearBuildTimeCache = function() {
    buildTimeCache = {
      coreComponents:       {},
      serviceDeps:          {},
      behaviorScripts:      {},
      behaviorServiceDeps:  {}
    };
  };

  /**
   * Returns serviceName given a @serviceFilePath
   *
   * @private
   * @method getServiceNameFromFilePath
   * @param serviceFilePath
   * @returns String
   */
  var getServiceNameFromFilePath = function (serviceFilePath) {
    var serviceName = serviceFilePath.split('/').pop().replace('.js', '').replace('.ts', '');

    //In prod service files are prefixed with 'rev' so we need to remove the rev
    if (_.includes(serviceName, '.')) {
      serviceName = _.strRight(serviceName, '.');
    }

    return serviceName;
  };


  /**
   * Return a component name from a given component directory path
   * @param componentPath
   * @returns {object}
   */
  function getComponentFromFilePath(componentPath) {
    var paths   = componentPath.split('/');
    var script  = paths.pop();
    var name    = paths.pop();

    return { name: name, path: paths.join('/') };
  }

  /**
   * Recursive method to find all components under a given directory path
   *
   * @param directoryPath
   * @returns {*}
   */
  function findAllComponents() {
    var components        = [];
    var componentScripts  = glob.sync(path.join(componentsPath, '**', '*.{js,ts}'));

    _.each(componentScripts, function(compScript) {
      components.push(getComponentFromFilePath(compScript));
    });

    return components;
  }

  /**
   * Returns an array of all components
   *
   * @private
   * @method getAllComponentNames
   * @returns Array
   */
  function getAllComponentNames() {
    return _.map(getComponentList(), 'name');
  }

  function getComponentList() {
    _componentCache = _componentCache || findAllComponents();
    return _componentCache;
  }

  /**
   * Return a list of all explicitly ignored services (includes configuration ignores and framework specific services)
   *
   * @private
   * @method getIgnoredServices
   *
   * @returns {Array}
   */
  var getIgnoredServices = function () {
    var ignoredServices = [];
    var dependencyConfig = config.server.dependencies;

    if (dependencyConfig) {
      ignoredServices = ArrayUtil.concatNonNull(dependencyConfig.ignored, dependencyConfig.core);
    }

    return ignoredServices;
  };

  /**
   * Return a list of all explicitly ignored components
   *
   * @private
   * @method getIgnoredComponents
   *
   * @returns {Array}
   */
  var getIgnoredComponents = function () {
    var ignoredComponents = [];

    var dependencyConfig = config.server.dependencies;
    if (dependencyConfig) {
      ignoredComponents = ArrayUtil.concatNonNull(dependencyConfig.ignored, dependencyConfig.core);
    }

    return ignoredComponents;
  };

  /**
   * Return a list of all explicitly ignored behaviors
   *
   * @private
   * @method getIgnoredBehaviors
   *
   * @returns {Array}
   */
  var getIgnoredBehaviors = function () {
    var ignoredBehaviors = [];

    var dependencyConfig = config.server.dependencies;
    if (dependencyConfig) {
      ignoredBehaviors = ArrayUtil.concatNonNull(dependencyConfig.ignored, dependencyConfig.core);
    }

    return ignoredBehaviors;
  };

  /**
   * getResourceDependencies
   *
   * Aggregates all resources for a given @componentName using a set of @filters.  Result is a set of all resources
   * required for the given @componentName. Templates are chosen based on the @filters that are given.
   *
   * @private
   * @method getResourceDependencies
   * @param componentName
   * @param filters
   *
   * @returns {{styles: Array, scripts: Array, templates: Array, components: Array}}
   */
  var getResourceDependencies = function (componentName, filters) {
    var dependencies = { scripts: [], templates: [], styles: [], components: [] };
    var componentLibrary = getCoreLibrary('components');
    var component = componentLibrary[componentName];

    // If this is a valid and existing component, then start aggregating
    if (componentName && component) {
      // Clone the cached component details (to avoid common references)
      var mainComp = _.cloneDeep(component);

      // Go through each dependency and add its resources
      _.each(mainComp.dependencies, function (subComponentName) {
        // Clone again to avoid reference issues
        var subComp = _.cloneDeep(componentLibrary[subComponentName]);

        // Add Sub Component Resource Dependencies (get templates based on filters)
        dependencies.scripts    = _.union(dependencies.scripts, subComp.scripts);
        dependencies.templates  = _.union(dependencies.templates, getFilteredTemplates(subComp, subComp.templates, filters));
        dependencies.styles     = _.union(dependencies.styles, subComp.styles);
      });

      // Add Main Component Resource Dependencies (get templates based on filters)
      dependencies.styles     = _.union(dependencies.styles, mainComp.styles).reverse();
      dependencies.scripts    = _.union(dependencies.scripts, mainComp.scripts);
      dependencies.templates  = _.union(dependencies.templates, getFilteredTemplates(componentName, mainComp.templates, filters));
      dependencies.components = _.union(dependencies.components, mainComp.dependencies);
      dependencies.components.push(componentName);

    }

    // We need to remove the localFilePath from the script paths; must use regex for it to work properly in all different environments
    _.each(dependencies.scripts, function (scriptPath, index, scripts) {
      scripts[index] = scriptPath.replace(/^.*([\/\\]dist)/, '$1').replace(/[\/\\]/g, '/');
    });

    return dependencies;
  };


  /**
   * getFilteredTemplates
   *
   * Determines the best matching template for a based on a given @filters array.
   *
   * @private
   * @method getFilteredTemplates
   * @param name
   * @param templates
   * @param filters
   *
   * @returns {Array}
   */
  var getFilteredTemplates = function (name, templates, filters) {
    var defaultTemplate = null;
    var templateQualities = [];
    _.each(templates, function (template) {
      // Go through each template and create a qualities list
      var qualities = _.without(template.type.split('.'), "");

      if (qualities.length) {
        // Push the qualities to our primary list
        templateQualities.push({ template: template, qualities: qualities });
      } else {
        // This is the default template
        defaultTemplate = template;
      }
    });

    // Go through the primary qualities list and find the intersections
    var maxIntersection = 0;
    var matchScore = 0;
    var matchingTemplate = defaultTemplate;
    _.each(templateQualities, function (templateQuality) {
      // Find the number of quality intersections between our filters and this particular template
      var qualityIntersection = _.intersection(_.map(filters, 'value'), templateQuality.qualities);
      var qualityDeviation = _.difference(templateQuality.qualities, qualityIntersection);

      // If we have a higher number of matching qualities and all qualities are met, we have a potential match
      if (qualityIntersection.length >= maxIntersection && qualityDeviation.length == 0) {

        // Establish a quality score based on the priorities of the matching qualities
        var qualityScore = 0;
        _.each(qualityIntersection, function (quality) {
          qualityScore += _.find(filters, { value: quality }).priority;
        });

        // Ok, now if we have a tie on number of matching qualities, lets use the quality score as the tie breaker
        if (qualityIntersection.length !== maxIntersection ||
          (qualityIntersection.length === maxIntersection && qualityScore > matchScore)) {
          matchingTemplate = templateQuality.template;
          maxIntersection = qualityIntersection.length;
          matchScore = qualityScore;
        }
      }
    });

    // Return as an array for convenience (and also for any future enhancement to support multi-template)
    return [matchingTemplate];
  };

  /**
   * getRecursiveDependencies
   *
   * Recursively Build an Array of Dependencies based on a given dependencyLib.
   *
   * @private
   * @method getRecursiveDependencies
   * @param moduleName
   * @param dependencyLibrary
   * @returns {Array}
   */
  var getRecursiveDependencies = function (moduleName, dependencyLibrary) {
    var dependencies = [];

    var module = dependencyLibrary[moduleName];

    if (_.isObject(module)) {
      _.each(module.directDependencies, function (dependency) {
        //Prevent loading dependencies recursively
        if (dependency !== moduleName) {
          // Create our sub dependency list recursively
          var subDependencyArray = getRecursiveDependencies(dependency, dependencyLibrary);

          // Only push this dependency if it doesn't already exist
          if (!_.includes(subDependencyArray, dependency)) {
            subDependencyArray.push(dependency);
          }

          // Add all sub dependencies to our master list
          _.each(subDependencyArray, function (subDependency) {
            if (!_.includes(dependencies, subDependency)) {
              dependencies.push(subDependency);
            }
          });
        }
      });
    } else {
      logger.error('Dependency Error: [' + moduleName + '] not found in dependency library. You are referencing a service or component that does not exist!');
    }

    return dependencies;
  };


  /**
   * Returns a list of direct dependencies for the service definition at the given path. Angular built-in
   * services and other explicitly configured services will be ignored.
   *
   * @private
   * @method getDependencies
   * @param relativePath
   *
   * @returns {Array}
   */
  var getServiceDependencies = function (scriptPath, mode) {
    var content     = fs.readFileSync(scriptPath, 'UTF-8').replace(/\s/g, '');
    var strategies  = {
      'component': {
        regexPatterns:  [/.*controller:\[((['"][^'"]+['"],){0,}){1}function\(.*/g],
        captureGroup:   '$1'
      },
      'behavior': {
        regexPatterns:  [
          /.*controller:\[((['"][^'"]+['"],){0,}){1}function\(.*/g,
          /.*wilson\.behavior\(['"][^'"]+['"],\[((['"][^'"]+['"],){0,}){1}function\(.*/g
        ],
        captureGroup:   '$1'
      },
      'app': {
        regexPatterns:  [/.*run\(\[((['"][^'"]+['"],){0,}){1}function\(.*/g],
        captureGroup:   '$1'
      },
      'router': {
        regexPatterns:  [/.*wilson\.router\(\[((['"][^'"]+['"],){0,}){1}function\(.*/g],
        captureGroup:   '$1'
      },
      'service': {
        regexPatterns:  [/.*wilson\.(service|class|factory|resource|utility)\(['"][^'"]+['"],\[((['"][^'"]+['"],){0,}){1}function\(.*/g],
        captureGroup:   '$2'
      }
    };

    var dependencyStrat = strategies[mode] || strategies.service;

    // If dependencies exists, peel them out and return, else we assume that there are no dependencies as there is no injection syntax.
    var dependencies = [];
    _.each(dependencyStrat.regexPatterns, function (regex) {
      if (regex.test(content)) {
        var deps = content.replace(regex, dependencyStrat.captureGroup).replace(/['"]/g, '').split(',');
        dependencies = dependencies.concat(deps);
      }
    });

    if (dependencies && dependencies.length > 0) {
      dependencies = _.uniq(dependencies);
      // Filter the dependencies to not include Angular services or any
      // ignoredServices from the config
      dependencies = _.filter(dependencies, function (dep) {
        var isAngularService = dep[0] === '$';
        var isIgnoredService = _.includes(getIgnoredServices(), dep);
        return (!isAngularService && !isIgnoredService && !_.isEmpty(dep));
      });
    }

    return dependencies;
  };

  /**
   * Initializes or more appropriate, 'Primes' the core dependency library objects.
   *
   * @public
   * @method init
   * @param readCache
   */
  var init = function (options) {
    if (options) {
      //Set flag to use caching or not
      readFromCache = _.isUndefined(options.useCache) ? readFromCache : options.useCache;
      componentVersion = _.isUndefined(options.version) ? componentVersion : options.version;
      readChangeList = _.isUndefined(options.readChangeList) ? readChangeList : options.readChangeList;
    }

    if (!readChangeList) {
      // If we don't care about reading the change list, then just load the libraries
      // This causes the core library to get generated (primed and cached)
      getCoreLibrary('services');
      getCoreLibrary('components');
      // TODO: Perhaps we should prime component bundles and core bundle still???
    } else {
      updateAndLoadLibraries();
    }
  };

  /**
   * Returns the appropriate core library object based on a libraryName.
   * The object is generated appropriately if it doesn't already exist
   * in the cache or caching is disabled.
   *
   * @private
   * @method getCoreLibrary
   * @param libraryName
   *
   * @returns {object}
   */
  var getCoreLibrary = function (libraryName, forceCacheRead) {
    // Prime Core Lib from local memory cache and return if this library already exists
    if (coreLibraries[libraryName]) {
      return coreLibraries[libraryName];
    }

    // Check if the Component Library Already exists
    var libraryCache = libraryName + '.json';
    var cachedComponentsJson = CacheService.getJsonFromCache(libraryCache);

    if (cachedComponentsJson && (forceCacheRead || readFromCache)) {
      coreLibraries[libraryName] = cachedComponentsJson;
    } else {
      // Generate appropriate library based on name
      switch (libraryName) {
        case 'services':
          coreLibraries[libraryName] = generateServiceLibrary();
          break;
        case 'components':
          coreLibraries[libraryName] = generateComponentLibrary();
          break;
        default:
          var msg = _.sprintf('Cannot get core library [%s]!!!', libraryName);
          logger.error(msg);
          throw new Error(msg);
      }

      //cache the library object
      CacheService.writeJsonToCache(libraryCache, coreLibraries[libraryName]);
    }

    return coreLibraries[libraryName];
  };

  var updateAndLoadLibraries = function () {
    // We need to read for change types
    var changes = getChangesFromChangeList();
    if (changes) {
      var componentLib = getCoreLibrary('components', true);
      var serviceLib = getCoreLibrary('services', true);

      // A service has changed, we need to rebuild the service dependencies for these changes if applicable
      if (!_.isEmpty(changes.services)) {
        changes.components = _.isEmpty(changes.components) ? {} : changes.components;
        var servicesRequireUpdate = false;
        var servicesToUpdate = {};
        _.each(changes.services, function (service, serviceName) {
          var servicePath = path.join(localPathPrefix, service.path);
          var serviceDependencies = getServiceDependencies(servicePath, 'service');

          // Check if this is an ignored service
          var isIgnoredService = _.includes(getIgnoredServices(), serviceName);

          if (!serviceLib[serviceName]) {
            servicesRequireUpdate = !isIgnoredService;
          } else if (!_.isEqual(serviceDependencies, serviceLib[serviceName].directDependencies)) {
            // Changes have been made to this services' dependencies, lets mark appropriate components for update
            servicesRequireUpdate = true;
            servicesToUpdate[serviceName] = { path: service.path, action: 'changed' };
            _.each(componentLib, function (comp, compName) {
              if (_.includes(comp.scripts, servicePath)) {
                changes.components[compName] = {
                  path: comp.path.replace(localPathPrefix, ''),
                  action: 'changed'
                };
              }
            });
          }
        });

        if (servicesRequireUpdate) {
          updateCoreLibrary('services', servicesToUpdate);
        }
      }

      // A behavior has changed, we need to find which components use it and mark them for update
      if (!_.isEmpty(changes.behaviors)) {
        changes.components = _.isEmpty(changes.components) ? {} : changes.components;

        // Find all components dependent on this behavior
        _.each(changes.behaviors, function (behavior) {
          behavior.path = path.join(localPathPrefix, behavior.path);
          _.each(componentLib, function (comp, compName) {
            if (_.includes(comp.scripts, behavior.path)) {
              changes.components[compName] = {
                path: comp.path.replace(localPathPrefix, ''),
                action: 'changed'
              };
            }
          });
        });
      }

      // A component needs to be updated, lets update the core library with the list
      if (!_.isEmpty(changes.components)) {
        updateCoreLibrary('components', changes.components);
      }
    } else {
      // Force read from cache if it exists
      getCoreLibrary('services', true);
      getCoreLibrary('components', true);
    }
  };

  var updateCoreLibrary = function (libraryName, changeList) {
    var libraryCache = libraryName + '.json';

    // Generate appropriate library based on name
    switch (libraryName) {
      case 'services':
        coreLibraries[libraryName] = updateServiceLibrary(changeList);
        break;
      case 'components':
        coreLibraries[libraryName] = updateComponentLibrary(changeList);
        break;
      default:
        var msg = _.sprintf('Cannot get core library [%s]!!!', libraryName);
        logger.error(msg);
        throw new Error(msg);
    }

    //cache the library object
    CacheService.writeJsonToCache(libraryCache, coreLibraries[libraryName]);

    return coreLibraries[libraryName];
  };

  /**
   * Method to generate a service library object.  This object represents a list of available services and their
   * respective dependencies.
   *
   * @private
   * @method generateServiceLibrary
   *
   * @returns {object}
   */
  var generateServiceLibrary = function () {
    var serviceLibrary = { };

    var services  = glob.sync(path.join(servicesPath, '**', '*.{js,ts}'));

    // Determine Direct Dependencies
    _.each(services, function (serviceFilePath) {
      var serviceName = getServiceNameFromFilePath(serviceFilePath);

      serviceLibrary[serviceName] = {
        path: serviceFilePath,
        directDependencies: getServiceDependencies(serviceFilePath, 'service')
      };
    });

    finalizeServiceLibrary(serviceLibrary);

    return serviceLibrary;
  };

  var updateServiceLibrary = function (serviceList) {
    var serviceLibrary = getCoreLibrary('services', true);
    var updatesApplied = false;

    // Determine Direct Dependencies
    _.each(serviceList, function (service, serviceName) {
      var serviceFilePath = path.join(localPathPrefix, service.path);
      var serviceExistsInLibrary = !_.isUndefined(serviceLibrary[serviceName]);
      var serviceData = {
        path: serviceFilePath,
        directDependencies: getServiceDependencies(serviceFilePath, 'service')
      };

      if (!serviceExistsInLibrary ||
        (serviceExistsInLibrary && !_.isEqual(serviceLibrary[serviceName].directDependencies, serviceData.directDependencies))) {
        updatesApplied = true;
        serviceLibrary[serviceName] = serviceData
      }
    });

    if (updatesApplied) {
      finalizeServiceLibrary(serviceLibrary);
    }

    return serviceLibrary;
  };

  var finalizeServiceLibrary = function (serviceLibrary) {
    // Now, determine and add nested dependencies
    _.each(serviceLibrary, function (service, serviceName) {
      service.dependencies = getRecursiveDependencies(serviceName, serviceLibrary);
    });
  };


  /**
   * Method to generate a component library object. This object represents a list of available components and their
   * respective script/template/subcomponent dependencies.
   *
   * @private
   * @method generateComponentLibrary
   *
   * @returns {object}
   */
  var generateComponentLibrary = function () {
    var componentLibrary  = { };
    var serviceLibrary    = getCoreLibrary('services');
    var componentList     = getComponentList();

    // For each component path build the library data
    _.each(componentList, function (component) {
      componentLibrary[component.name] = buildComponentLibraryData(component.name, component.path, serviceLibrary);
    });

    // Clear Build-time only cache
    clearBuildTimeCache();

    finalizeComponentLibrary(componentLibrary);

    return componentLibrary;
  };

  /**
   * Method to update the existing component library with a set of changed components.
   *
   * Needed for development mode
   *
   * @private
   * @method generateComponentLibrary
   *
   * @returns {object}
   */
  var updateComponentLibrary = function (componentList) {
    var componentLibrary = getCoreLibrary('components', true);
    var serviceLibrary = getCoreLibrary('services', true);
    var updatesApplied = false;

    function hasChanges(componentA, componentB) {
      var changes = false;

      if (!_.isEqual(componentA.directDependencies, componentB.directDendencies)) { changes = true; }
      else if (!_.isEqual(componentA.scripts, componentB.scripts))                { changes = true; }

      return changes;
    }

    // Go through each component to find its direct dependencies
    _.each(componentList, function (component, componentName) {
      // Initialize this component
      var componentPath = path.join(localPathPrefix, component.path);
      var componentData = buildComponentLibraryData(componentName, componentPath, serviceLibrary);
      var componentExistsInLibrary = !_.isUndefined(componentLibrary[componentName]);

      if (!componentExistsInLibrary || (componentExistsInLibrary && hasChanges(componentLibrary[componentName], componentData))) {
        updatesApplied = true;
        componentLibrary[componentName] = componentData
      } else {
        componentLibrary[componentName].scripts   = componentData.scripts;
        componentLibrary[componentName].templates = componentData.templates;
      }
    });

    clearBuildTimeCache();

    if (updatesApplied) {
      finalizeComponentLibrary(componentLibrary);
    }

    return componentLibrary;
  };

  var finalizeComponentLibrary = function (componentLibrary) {
    // Now go through the component library and infer the complete dependencies
    _.each(componentLibrary, function (component, componentName) {
      component.dependencies = getRecursiveDependencies(componentName, componentLibrary);
    });
  };

  var buildComponentLibraryData = function (componentName, componentPath, serviceLibrary) {
    var serviceDependencies;

    // Initialize this component
    var componentJson = { directDependencies: [], scripts: [], styles: [], templates: [], dependencies: [], path: componentPath };

    // Add scripts -- Read Component Scripts Directory and add to component lib details
    componentJson.scripts = getComponentScripts(componentName, componentPath);

    // Add Service Dependency Scripts
    var serviceScripts  = [];

    function getServiceDepPaths(service) {
      if (buildTimeCache.serviceDeps[service]) { return buildTimeCache.serviceDeps[service]; }

      // If we don't have this set of service paths cached find them
      if (serviceLibrary[service]) {
        // Get nested dependencies from the service library, and construct the service paths
        var nestedDependencies = serviceLibrary[service].dependencies;
        var servicePaths = _.map(_.pick(serviceLibrary, nestedDependencies), 'path');
        servicePaths.push(serviceLibrary[service].path);
        buildTimeCache.serviceDeps[service] = _.uniq(servicePaths);
      }

      return buildTimeCache.serviceDeps[service];
    }

    _.each(componentJson.scripts, function (scriptPath) {      // This loop should be only over 1 js file
      // Get the service dependencies for the component
      serviceDependencies = getServiceDependencies(scriptPath, 'component');

      _.each(serviceDependencies, function (dependency) {
        serviceScripts = _.union(serviceScripts, getServiceDepPaths(dependency));
      });
    });
    componentJson.scripts = _.union(componentJson.scripts, serviceScripts);

    // Get the template data for this component
    var componentTemplates = getComponentTemplates(componentName, componentPath);

    var directDependencies = [];
    var behaviorScripts = [];
    var guideScripts = [];

    // Add dependencies from ALL templates as dependencies for this component
    componentJson.templates = componentTemplates;
    _.each(componentTemplates, function (template) {
      //Add component dependencies
      directDependencies = directDependencies.concat(template.dependencies.components);

      //Add behavior dependencies
      _.each(template.dependencies.behaviors, function (behaviorName) {
        try {
          var currBehaviorScripts                       = getBehaviorScripts(behaviorName);
          behaviorScripts                               = _.union(behaviorScripts, currBehaviorScripts);
          buildTimeCache.behaviorScripts[behaviorName]  = currBehaviorScripts;

          if (buildTimeCache.behaviorServiceDeps[behaviorName]) {
            serviceScripts = _.union(serviceScripts, buildTimeCache.behaviorServiceDeps[behaviorName]);
          } else {
            var behaviorDeps = [];
            _.each(currBehaviorScripts, function (scriptPath) {
              serviceDependencies = getServiceDependencies(scriptPath, 'behavior');

              // Add the scripts of each service dependency
              _.each(serviceDependencies, function (dependency) {
                var bScripts      = getServiceDepPaths(dependency);
                behaviorDeps      = _.union(behaviorDeps, bScripts)
                serviceScripts    = _.union(serviceScripts, bScripts);
              });

              // Cache this behaviors dependencies into the build-time cache
              buildTimeCache.behaviorServiceDeps[behaviorName] = behaviorDeps;
            });
          }

        } catch (err) {
          logger.warn(_.sprintf('Failed to find behavior scripts in component "%s"', componentName));
          logger.warn(err.message);
        }
      });

      //console.log('behaviorScripts', behaviorScripts);
      componentJson.scripts = _.union(componentJson.scripts, behaviorScripts);

      //Add behavior dependencies
      _.each(template.dependencies.guides, function (guideName) {
        guideScripts = guideScripts.concat(getGuideScripts(guideName));
      });
      componentJson.scripts = _.union(componentJson.scripts, guideScripts);

      //Remove the template dependencies to reduce the outputted JSON size
      delete template.dependencies;
    });

    // Get the styles for this component
    componentJson.styles              = getComponentStyles(componentName);
    componentJson.scripts             = _.union(componentJson.scripts, serviceScripts);
    componentJson.directDependencies  = _.uniq(directDependencies);

    // Return the Component JSON Library data
    return componentJson;
  };


  /**
   * Returns an array of all scripts associated with @behaviorName
   *
   * @private
   * @method getBehaviorScripts
   * @param behaviorName
   * @returns {Array}
   */
  var getBehaviorScripts = function (behaviorName) {
    // Return from build-time cache if we have already determined the scripts
    if (buildTimeCache.behaviorScripts[behaviorName]) { return buildTimeCache.behaviorScripts[behaviorName]; }

    // Otherwise, find the related behavior script
    var allScripts      = glob.sync(path.join(behaviorsPath, '**', '*.{js,ts}'));
    var behaviorScript  = _.find(allScripts, function(script) {
      return behaviorName === script.replace(/^.*\/(.+)\.(js|ts)$/,'$1').split('.').pop();
    });

    if (!behaviorScript) { throw new Error(_.sprintf('Behavior "%s" was not found in path: %s', behaviorName, behaviorsPath)); }

    // Cache scripts into the build-time cache
    buildTimeCache.behaviorScripts[behaviorName] = [behaviorScript];

    return buildTimeCache.behaviorScripts[behaviorName];
  };

  /**
   * Returns an array of all scripts associated with @guideName
   *
   * @private
   * @method getGuideScripts
   * @param guideName
   * @returns {Array}
   */
  var getGuideScripts = function (guideName) {
    var scripts = [];

    try {
      var scriptList = fs.readdirSync(guidesPath);
      _.each(scriptList, function (script) {
        if (_.endsWith(script, guideName + '.js') || _.endsWith(script, guideName + '.ts')) {
          scripts.push(path.join(guidesPath, script));
        }
      });
    } catch (err) {
    }

    if (scripts.length < 1) {
      throw new Error(_.sprintf('Guide "%s" was not found in path: %s', guideName, guidesPath));
    }

    return scripts;
  };

  /**
   * Returns an array of all scripts associated with @componentName
   *
   * @private
   * @method getComponentScripts
   * @param componentName
   * @returns {Array}
   */
  var getComponentScripts = function (componentName, componentPath) {
    var scripts = [];
    var componentScriptsDir = path.join(componentPath, componentName);

    try {
      var scriptList = fs.readdirSync(componentScriptsDir);

      _.each(scriptList, function (script) {
        if (_.endsWith(script, '.js') || _.endsWith(script, '.ts')) {
          scripts.push(path.join(componentScriptsDir, script));
        }
      });
    } catch (err) {
      logger.warn(_.sprintf('Component "%s" was not found in path: %s', componentName, componentPath));
    }

    return scripts;
  };

  /**
   * Returns an array of all scripts associated with @componentName
   *
   * @private
   * @method getComponentTemplates
   * @param componentName
   * @returns {Array}
   */
  var getComponentTemplates = function (componentName, componentPath) {
    var componentTemplatesDir = path.join(componentPath, componentName, 'templates');
    var templates = [];
    var templateList = [];
    var templateDependencies;

    if (fs.existsSync(componentTemplatesDir)) {
      templateList = fs.readdirSync(componentTemplatesDir);
    }

    _.each(templateList, function (template) {
      // skip non-html files
      if (_.endsWith(template, '.html')) {
        // getting template data
        var templateFile = path.join(componentTemplatesDir, template);
        var templateData = fs.readFileSync(templateFile, 'utf8');

        // Get the Template Type here, remove the chaff (unneeded first and last elements)
        var templateType = template.split('.');
        templateType.shift();
        templateType.pop();

        try {
          templateDependencies = getTemplateDependencies(templateData);
        } catch (error) {
          logger.warn('Error loading template dependencies for ' + componentName);
          console.log(error);
          throw error;
        }

        templates.push({
          id: componentName,
          type: templateType.join('.'),
          data: templateData,
          dependencies: templateDependencies
        });
      }
    });

    return templates;
  };

  /**
   * Read and return styles data for a given component. Determines all relevant css files relating to this component
   * and returns a data entry for each with the id, type and data (stylesheet data content).
   *
   * @param componentName
   * @returns {Array}
   */
  var getComponentStyles = function(componentName) {
    var styles      = [];

    // Get all stylesheets related to this component
    var stylesheets = glob.sync(path.join(stylesPath, '+(' + componentName + '.css|' + componentName + '.*.css)'));

    _.each(stylesheets, function(cssFile) {
      var styleData = fs.readFileSync(cssFile, 'utf8');
      var fileName  = cssFile.replace(/^.*\/([^\/].*\.css)$/, '$1');

      // Get the Style Type here, remove the chaff (unneeded first and last elements)
      var styleType = fileName.split('.');
      styleType.shift();
      styleType.pop();

      styles.push({
        id:   componentName,
        type: styleType.join('.'),
        data: styleData
      });
    });

    return styles;
  };

  /**
   * Returns a object that contains component and behavior dependancies
   * for the given @templateHtml
   *
   * @private
   * @method getTemplateDependencies
   * @param templateHtml  HTML String of the template
   * @returns { components:[], behaviors[] }
   */
  var getTemplateDependencies = function (templateHtml) {
    var templateDependencies = {
      components: [],
      behaviors: [],
      guides: []
    };

    var dependencyName;
    var componentNameList = getAllComponentNames();

    //Disbale stderr temporarily, xmldom throws a lot of warnings that we dont care about
    //these warnings clog up the console so we dont want them to be outputted
    var enableStdErr = ProcessUtil.disableStdErr();
    var doc = new dom().parseFromString(templateHtml);
    enableStdErr();

    //Add COMPONENTS
    var nodes = xpath.select("//*[contains(name(), '" + componentPrefix + "')]", doc);
    _.each(nodes, function (node) {
      dependencyName = node.localName.replace(componentPrefix, '');
      templateDependencies.components.push(dependencyName);
    });

    //Add BEHAVIORS
    var attrs = xpath.select("//@*[contains(name(), '" + behaviorPrefix + "')]", doc);
    _.each(attrs, function (attr) {
      dependencyName = attr.localName.replace(behaviorPrefix, '');

      if (_.includes(componentNameList, dependencyName)) {
        // if this dependency exists as a component then use the component
        // also, check if this dependency is part of core or ignored components
        var ignoredComponents = getIgnoredComponents();
        if (!_.includes(ignoredComponents, dependencyName)) {
          templateDependencies.components.push(dependencyName);
        }
      } else {
        // this dependency does not have a matching component, add it to the behavior dependencies
        // also check if this dependency is part of core or ignored behaviors
        var ignoredBehaviors = getIgnoredBehaviors();
        if (!_.includes(ignoredBehaviors, dependencyName)) {
          templateDependencies.behaviors.push(dependencyName);
        }
      }
    });

    //Add GUIDES
    attrs = xpath.select("//@*[contains(name(), '" + guidePrefix + "')]", doc);
    _.each(attrs, function (attr) {
      templateDependencies.guides.push(attr.localName);
    });


    //make the lists unique
    templateDependencies.components = _.uniq(templateDependencies.components);
    templateDependencies.behaviors  = _.uniq(templateDependencies.behaviors);
    templateDependencies.guides     = _.uniq(templateDependencies.guides);

    return templateDependencies;
  };

  /**
   * Returns a JSON object containing the data for the specified component based on the
   * given filter set.
   *
   * @public
   * @method getComponentData
   * @param componentName
   * @param req
   *
   * @returns {name: {String}, component: {HTML}, resources: {Object}}
   */
  var getComponentData = function (componentName, filters) {
    var componentJson = null;
    var componentLibrary = getCoreLibrary('components');

    if (componentLibrary[componentName]) {
      componentJson = _.extend({
          name: componentName,
          version: componentVersion
        },
        getResourceDependencies(componentName, filters)
      );
    }

    return componentJson;
  };

  /**
   * Generates a Component Bundle File for a given componentName
   *
   * @public
   * @method generateComponentBundle
   * @param componentName
   * @returns {*}
   */
  var generateComponentBundle = function (componentName) {
    var bundleInfo = getComponentData(componentName);

    var scripts = [];
    if (bundleInfo && bundleInfo.scripts) {
      scripts = _.map(bundleInfo.scripts, function (res) {
        return path.join(localPathPrefix, res);
      });
    }

    return BundleService.createBundle(scripts, ('script.bundle.' + componentName + '.js'));
  };


  var getCoreIncludeDictionary = function() {
    var paths = wilsonConfig.server.projectPaths;

    var coreIncludes = {};

    // Get a list of all deps to ignore
    var ignoredDeps = _.union(
      wilsonFrameworkConfig.server.dependencies.core,
      wilsonFrameworkConfig.server.dependencies.ignored,
      wilsonConfig.server.dependencies.ignored
    );

    var coreServiceLib = getCoreLibrary('services');

    // Parse core service dependencies from client app.js
    var coreDeps = getServiceDependencies(clientAppPath, 'app') || [];

    // If a routeService has been defined, find it's dependencies and add them to coreDeps
    if (fs.existsSync(routeServicePath)) {
      coreDeps = _.union(coreDeps, getServiceDependencies(routeServicePath, 'router') || []);
    }

    // Get core component dependencies (aka from index page and get all required scripts)
    var componentDeps = [];
    _.each(getCoreComponents(), function(component) {
      componentDeps = _.union(componentDeps, getResourceDependencies(component.name).scripts);
    });

    // Strip paths from scripts to get basic component dependencies
    componentDeps = _.map(componentDeps, function(dep) { return dep.replace(/^.*\/([^\/]+).(js|ts)$/, '$1'); });

    // Merge in core dependencies from app config and the component dependencies from the index page
    coreDeps = _.union(coreDeps, componentDeps);
    coreDeps = _.union(coreDeps, wilsonConfig.server.dependencies.core);
    coreDeps = _.uniq(coreDeps);

    // Remove any ignored dependencies
    coreDeps = _.difference(coreDeps, ignoredDeps);

    var allCoreDeps = _.clone(coreDeps);
    // Get recursive dependencies
    _.each(coreDeps, function(coreDependencyName) {
      if (coreServiceLib[coreDependencyName]) {
        allCoreDeps = allCoreDeps.concat(coreServiceLib[coreDependencyName].dependencies);
      }
    });

    // Filter only unique dependencies
    coreDeps = _.uniq(allCoreDeps);

    var possibleDeps = _.union(
      glob.sync(path.join(servicesPath,   '**', '*.{js,ts}')),
      glob.sync(path.join(componentsPath, '**', '*.{js,ts}')),
      glob.sync(path.join(behaviorsPath,  '**', '*.{js,ts}')),
      glob.sync(path.join(guidesPath,     '**', '*.{js,ts}'))
    );

    var depLib = {};

    // Get Relative Paths
    _.each(possibleDeps, function(dep) {
      // First get the filename
      var fileName      = dep.split('/');
      fileName          = fileName[fileName.length - 1];

      // Now get the formal name
      var formalName    = fileName.split('.');
      formalName        = formalName.length > 2 ? formalName[1] : formalName[0];

      //Format path prefix for Windows
      var pathPrefix = localPathPrefix;
      //Todo: use builtin parameter name
      if (process.platform === 'win32') {
        pathPrefix = pathPrefix.split('\\').join('/');
      }
      
      depLib[formalName] = { file: fileName, name: formalName, path: dep.replace(pathPrefix, '').replace(('/' + fileName), '') };
    });

    _.each(coreDeps, function(resourceName) {
      var fname   = resourceName;

      if (_.startsWith(resourceName, componentPrefix)) { fname = resourceName.replace(componentPrefix, ''); }

      if (depLib[resourceName]) {
        var includePath = depLib[resourceName].path;
        coreIncludes[includePath] = coreIncludes[includePath] || [];
        coreIncludes[includePath].push(resourceName);
      } else {
        logger.error('Unable find core dependency: ' + resourceName);
      }

      //add filters
      var hasFiltersDir = fs.existsSync(filtersPath);
      if (hasFiltersDir) {
        var filterFiles = fs.readdirSync(filtersPath);

        // Updating this list to include non-reved fileNames
        filterFiles = _.map(filterFiles, function(fileName) {
          var parts = fileName.split('.');
          return (parts.length > 2) ? parts[1] : parts[0];
        });

        coreIncludes[paths.filters] = filterFiles;
      }

    });

    return coreIncludes;
  };


  /**
   * Get core components from the index page. Utilizes the buildTimeCache to
   *
   * @param filters
   * @returns {*}
   */
  var getCoreComponents = function(filters) {
    var cacheKey      = _.map(filters, 'value').join('.') || 'default';

    if (!buildTimeCache.coreComponents[cacheKey]) {
      var indexMarkup = fs.readFileSync(indexPath, 'utf8');
      var indexDeps   = getTemplateDependencies(indexMarkup);

      // Get and cache core component data
      buildTimeCache.coreComponents[cacheKey] = _.map(indexDeps.components, function(comp) { return getComponentData(comp, filters); });
    }

    return buildTimeCache.coreComponents[cacheKey];
  };


  /**
   * Generate all templates data for core components.
   *
   * @param filters
   * @returns {null}
   */
  var generateCoreTemplates = function(filters) {
    // Get Details of the Request Connection  -- Should take out hard-coding and base off whether properties exist
    var templatesJsonPath = _.sprintf('core-templates.%s.json', _.map(filters, 'value').join('.'));
    var templatesJson     = CacheService.getJsonFromCache(templatesJsonPath);  // Get the template JSON from the cache

    // If this is production and we have already cached the component, then just serve it
    if (!(readFromCache && templatesJson)) {
      var coreComponents = getCoreComponents(filters);
      var templates      = {};

      _.each(coreComponents, function(component) {
        _.each(component.templates, function(tpl) { templates[tpl.id] = _.cloneDeep(tpl); });
      });

      // get language from connection filters
      var langFilter = _.find(filters, {name: 'language'});

      // Render Template Strings
      _.forIn(templates, function (template) {
        var compiledTemplate = hbs.compile(template.data);
        var templateLocals = { ns: template.id };

        //If a lng is set in the connection filters use it
        if (langFilter) { templateLocals.lng = langFilter.value; }

        //compile the template passing in the component name as the 'ns' for i18n
        template.data = compiledTemplate(templateLocals).replace(/\n/g, '').replace(/(")/g, '\\$1');
      });

      templatesJson = { templates: _.values(templates) };

      // Cache it
      CacheService.writeJsonToCache(templatesJsonPath, templatesJson);
    }

    return templatesJson;
  };


  /**
   * Generate the Core Include Bundle (based on config)
   *
   * @public
   * @method generateCoreBundle
   * @param ignoreCache
   * @returns {Promise.promise|*}
   */
  var generateCoreBundle = function (ignoreCache) {
    var deferred = Q.defer();
    var coreBundle = 'core.bundle.js';
    ignoreCache = ignoreCache || false;

    BundleService.bundleExists(coreBundle, function (exists) {
      if (exists && !ignoreCache) {
        deferred.resolve(BundleService.getBundlePath(coreBundle));
      } else {
        var coreIncludeDictionary = getCoreIncludeDictionary();
        RevisionedFileUtil.findRevisionedFilesFromDictionary(coreIncludeDictionary)
          .then(function (revedDictionary) {
            var coreIncludes = RevisionedFileUtil.flattenDictionaryToPaths(revedDictionary);
            coreIncludes = _.map(coreIncludes, function (include) {
              return path.join(localPathPrefix, include);
            });
            if (BundleService.createBundle(coreIncludes, 'core.bundle.js')) {
              deferred.resolve(BundleService.getBundlePath(coreBundle));
            } else {
              deferred.reject('Unable to create core bundle');
            }
          })
          .fail(function (error) {
            // Failed to find revisioned files
            console.log(error);
            deferred.reject('Unable to load core includes');
          });
      }
    });

    return deferred.promise;
  };


  /**
   * Method to build and return the complete component data for a given componentName and a set of connection filters.
   *
   * @public
   * @method getServableComponent
   * @param componentName
   * @param filters
   *
   * @returns {object}
   */
  var getServableComponent = function (componentName, filters) {
    var componentJson = null;
    var componentLibrary = getCoreLibrary('components');

    // Confirm that this component exists
    if (componentLibrary[componentName]) {
      // Get Details of the Request Connection  -- Should take out hard-coding and base off whether properties exist
      var componentJsonPath = _.sprintf('%s.%s.json', componentName, _.map(filters, 'value').join('.'));

      //Get the component JSON from the cache
      componentJson = CacheService.getJsonFromCache(componentJsonPath);

      // If this is production and we have already cached the component, then just serve it
      if (!(readFromCache && componentJson)) {
        // Build Component Data including Dependencies
        componentJson = getComponentData(componentName, filters);

        //remove component array from response.resources
        //this is not used by the client so its just extra bytes we dont need to server
        delete componentJson.components;

        // Add script bundle path to new scripts
        var bundlePath = [wilsonConfig.client.app.mountpath, wilsonConfig.client.app.version, 'bundle', componentName].join('/');
        componentJson.scripts = [bundlePath];

        // get language from connection filters
        var langFilter = _.find(filters, {name: 'language'});

        // Render Template Strings
        _.each(componentJson.templates, function (template) {
          var compiledTemplate = hbs.compile(template.data);
          var templateLocals = { ns: template.id };

          //If a lng is set in the connection filters use it
          if (langFilter) {
            templateLocals.lng = langFilter.value;
          }

          //compile the template passing in the component name as the 'ns' for i18n
          template.data = compiledTemplate(templateLocals);

        });

        // Cache it
        CacheService.writeJsonToCache(componentJsonPath, componentJson);
      }
    }

    return componentJson;
  };

  /**
   * Expose exports
   */
  return {
    init:                     init,
    getComponentNames:        getAllComponentNames,
    getServableComponent:     getServableComponent,
    getComponentData:         getComponentData,
    generateCoreTemplates:    generateCoreTemplates,
    generateComponentBundle:  generateComponentBundle,
    generateCoreBundle:       generateCoreBundle
  };
}
