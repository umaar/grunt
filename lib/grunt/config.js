/*
 * grunt
 * https://github.com/cowboy/grunt
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

// The actual config data.
var data;

// Recursively expand config directives.
function expandConfig(value) {
  var expandable = ['config', 'json'];
  var parts, obj;
  if (utils.kindOf(value) === 'array') {
    // If value is an array, recurse.
    return value.map(expandConfig);
  } else if (utils.kindOf(value) === 'object') {
    // If value is an object, recurse.
    obj = {};
    Object.keys(value).forEach(function(key) {
      obj[key] = expandConfig(value[key]);
    });
    return obj;
  } else if (typeof value === 'string') {
    // If value is an expandable directive, expand it if possible.
    parts = task.getDirectiveParts(value) || [];
    return expandable.indexOf(parts[0]) !== -1 ? task.directive(value) : value;
  } else {
    // Neither array, object nor string. Just return the value.
    return value;
  }
}

// If prop is an array, convert it to a props string.
function getPropString(prop) {
  if (utils.kindOf(prop) === 'array') {
    return prop.map(exports.escape).join('.');
  }
  return prop;
}

// Get/set config data. If data hasn't been set, return null. If value was
// passed, set value. If props string wasn't passed, return all data. Otherwise,
// return the prop's value (execute as a directive, when necessary).
exports = module.exports = function(prop, value) {
  // Abort if no config data exists.
  if (!data) { return null; }
  // If prop is an array, convert it to a prop string.
  prop = getPropString(prop);

  if (arguments.length === 2) {
    // Two arguments were passed, set the property's value.
    return utils.namespace.set(data, prop, value);
  } else if (prop) {
    // A property string/array was passed, get that property's value.
    return expandConfig(utils.namespace.get(data, prop));
  } else {
    // Nothing was passed. Return the actual config data, with any expandable
    // directives expanded (shallow, for now).
    value = {};
    Object.keys(data).forEach(function(key) {
      value[key] = expandConfig(data[key]);
    });
    return value;
  }
};

// Has config been initialized?
exports.initialized = function() {
  return !!data;
};

// Initialize config data.
exports.init = function(obj) {
  verbose.write('Initializing config...').ok();
  return (data = obj || {});
};

// Escape any . in name with \. so dot-based namespacing works properly.
exports.escape = function(str) {
  return str.replace(/\./g, '\\.');
};

// Test to see if required config params have been defined. If not, throw an
// exception (use this inside of a task).
exports.requires = function() {
  var props = utils.toArray(arguments).map(getPropString);
  var msg = 'Verifying option' + (props.length === 1 ? '' : 's') +
    ' ' + log.wordlist(props) + ' exist' + (props.length === 1 ? 's' : '') +
    ' in config...';
  verbose.write(msg);
  var initialized = exports.initialized();
  var failProps = initialized && props.filter(function(prop) {
    return exports(prop) === undefined;
  }).map(function(prop) {
    return '"' + prop + '"';
  });
  if (initialized && failProps.length === 0) {
    verbose.ok();
    return true;
  } else {
    verbose.or.write(msg);
    log.error().error('Unable to process task.');
    if (!initialized) {
      throw task.taskError('Unable to load config.');
    } else {
      throw task.taskError('Required config propert' +
        (failProps.length === 1 ? 'y' : 'ies') + ' ' + failProps.join(', ') +
        ' missing.');
    }
  }
};
