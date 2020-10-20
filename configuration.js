//
// location: (e)nvironment, (c)md-line, (b)oth, (o)mit - when both the cmd-line has precedence.
// type: (s)tring, (i)nteger, (f)loat, (b)oolean, object {valid: value, valid2: value}, function
// vtype: (a)rray - if present, type after validation, else use type.
// name: present without prefix if not environmentalized version of key.
// ignore: true if this should be ignored (used elsewhere, e.g., log settings)
// deprecated: generate a warning if this item is specified.
// required: boolean, true if it must be present.
// env: if present must be a function that returns truthy to allow the option.
// alias: 'alias' or ['alias1', 'alias2', ...]. aliases only apply to command line.
// allow0: allow this argument to be specified as first argument without a - prefix
//
// provide a default if the setting should have a value even if not provided by the user. if
// no default is provided the value will be undefined.
//
// type object/array that don't match are undefined by default.
//

const minimist = require('minimist');
const awsRegions = require('./aws-regions');

//
// get the configuration from any combination of env vars and command line
// arguments. command line options override environment variables.
//
async function get (options = {}) {
  const configOptions = {
    layer: {location: 'b', alias: ['l', 'LayerName'], type: 's', required: true, allow0: true},
    targetRegions: {location: 'b', alias: 'tr', type: 's', required: true, validator: validateRegions},
    profile: {location: 'b', alias: 'p', type: 's', default: 'default', required: true},
    profilePath: {location: 'b', alias: 'pp', type: 's'},
    region: {location: 'b', type: 's'},
    verbose: {location: 'c', type: 'b', default: true},
    veryVerbose: {location: 'c', alias: 'vv', type: 'b', default: false},
    dumpState: {location: 'b', alias: 'ds', type: 'b', default: false},
    dryRun: {location: 'b', type: 'b', default: true},
    forcePublish: {location: 'b', type: 'b', default: false},
    publishRoot: {location: 'b', type: 's', validator: validateS3Root},
    noopRoot: {location: 'b', type: 's', validator: validateS3Root},
    useInvalidNoop: {location: 'b', type: 'b', default: false},
    doIntegrityChecks: {location: 'b', type: 'b', default: false},
    updateLayerIndex: {location: 'b', alias: 'uli', type: 's', validator: validateS3Root},
    commandLineOnly: {location: 'b', alias: 'clo', type: 'b', default: false},
    addPermission: {location: 'b', alias: 'ap', type: 's', vtype: 'a', validator: validatePermission},
    removePermission: {location: 'b', alias: 'rp', type: 's'},
    version: {location: 'b', type: 'i'},
    glv: {location: 'b', type: 's', vtype: 'a', validator: validateList},
    test1: {location: 'c', type: 'i', validator: {yes: 1, no: 0}},
    test2: {location: 'c', type: 's', validator: ['either', 'this', 'or', 'that']},
  };

  // what get returns
  const results = {
    values: {},
    fatals: [],
    errors: [],
    warnings: [],
    unknowns: [],
    debuggings: [],
  };
  const infoKeys = Object.keys(results).filter(k => Array.isArray(results[k]));
  function copyInfo (info) {
    if (typeof info !== 'object') return;
    // if this info has a result key concatenate it.
    infoKeys.forEach(k => {
      if (info[k]) {
        results[k] = results[k].concat(info[k]);
      }
    });
  }

  const prefix = 'AOLP_';

  const envInfo = await setConfigDefaultsFromEnv(configOptions, prefix);
  copyInfo(envInfo);

  const {argv, args, minimistOptions, cmdInfo} = parseCommandLine(configOptions, prefix, options);
  copyInfo(cmdInfo);

  const result = await validateAndTransform(args, configOptions, results, options);

  // this is essentiall a debug value
  if (result.values.commandLineOnly) {
    result.argv = argv;
    result.args = args;
    result.minimistOptions = minimistOptions;
  }

  return result;
}

//===========================================================================
// validators ===============================================================
//===========================================================================

//const ex = 's3://ao.lambda.bruce/node/appoptics-apm-8.1.0-lambda-17-layer';
const s3re = /^s3:\/\/(?<Bucket>[^\/]+)\/(?<Key>.+)$/;

async function validateRegions (option, arg) {
  // if the arg was provided more than once minimist makes it an array.
  if (Array.isArray(arg)) {
    return new Error(`may only be used once "${arg.join('", "')}"`);
  }
  if (!arg || typeof arg !== 'string') {
    return new Error(`${option} requires a string argument`);
  }
  const m = arg.match(s3re);
  if (m) {
    return arg;
  }
  const pieces = arg.split(',').map(s => s.trim());
  for (let i = 0; i < pieces.length; i++) {
    if (awsRegions.indexOf(pieces[i]) < 0) {
      return new Error(`${arg} contains an unknown region ${pieces[i]}`);
    }
  }
  return pieces.join(',');
}

async function validateS3Root (option, arg) {
  if (Array.isArray(arg)) {
    return new Error(`may only be used once "${arg.join('", "')}"`);
  }
  if (!arg || typeof arg !== 'string') {
    return new Error(`${option} requires a string argument`);
  }
  const m = arg.match(s3re);
  if (!m) {
    return new Error(`${arg} is not valid for option ${option}`);
  }
  return arg;
}

async function validateList (option, arg) {
  if (typeof arg !== 'string') {
    return new Error(`${option} requires a string argument`);
  }
  return arg.split(',').map(s => s.trim());
}

//
// validates action=principal and constructs StatementId.
// TODO BAM move statement ID construction out of here.
//
async function validatePermission (option, args) {
  if (!Array.isArray(args)) {
    args = [args];
  }
  const results = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== 'string') {
      return new Error(`${option} requires a string argument`);
    }
    let StatementId;
    const [Action, Principal] = arg.split('=').map(s => s.trim());

    if (Action !== 'lambda:GetLayerVersion') {
      return new Error(`${option} only supports Action lambda:GetLayerVersion`);
    }
    const action = Action.slice('lambda:'.length);
    if (Principal === '*') {
      StatementId = `global-${action}`;
    } else {
      StatementId = `${Principal}-${action}`;
    }
    results.push({StatementId, Action, Principal});
  }

  return results;
}

//
// read the environment variables and use them to set default values in settings.
//
async function setConfigDefaultsFromEnv (settings, prefix) {
  const warnings = [];
  const debuggings = [];

  // get our environment variables. known keys will be removed after processing so
  // those that remain are unknown.
  const aolpKeys = {};
  for (const k in process.env) {
    if (k.startsWith(prefix)) {
      aolpKeys[k] = process.env[k];
    }
  }

  // check environment vars and use them to set default values for the command
  // line.
  const settingsKeys = Object.keys(settings);
  for (let i = 0; i < settingsKeys.length; i++) {
    const k = settingsKeys[i];
    const setting = settings[k];
    if (setting.location !== 'e' && setting.location !== 'b') {
      continue;
    }
    const envVar = `${prefix}${setting.name || objectToEnvForm(k)}`;
    if (envVar in aolpKeys) {
      if (setting.ignore) {
        debuggings.push(`configuration ignoring ${envVar}`);
        delete aolpKeys[envVar];
        continue;
      }

      const value = await convert(envVar, aolpKeys[envVar], setting.validator || setting.type);
      if (value !== undefined) {
        settings[k].default = value;
      } else {
        warnings.push(`invalid environment variable value ${envVar}=${aolpKeys[envVar]}`);
      }
      if (setting.deprecated) {
        warnings.push(`${envVar} is deprecated; it will be invalid in the future`);
      }
      // remove this key because the env var is valid even if the value wasn't.
      delete aolpKeys[envVar];
    }
  }

  return {warnings, debuggings, unknowns: Object.keys(aolpKeys)};
}

//
// use minimist to parse the command line
//
function parseCommandLine (settings, prefix, options = {}) {
  // get rid of node and the main file name
  const argv = process.argv.slice(2);

  // keep track of unknowns seen to better handle single dash layer, -layer.
  // minimist interprets single dash as a set of single letter options, so
  // '-l' is valid but 'a', 'y', 'e', and 'r' are not, so checkUnknowns gets
  // called 4 times with '-layer'. it's kind of a pain that minimist doesn't
  // allow a validation/transformation function.
  const minimistOptions = makeMinimistOptions(settings, {unknown: checkUnknown2});

  const unknowns = [];
  const unknownsSeen = [];
  function checkUnknown2 (unknownArg) {
    // accept all non-option arguments
    if (unknownArg[0] !== '-') return true;
    // ignore a single dash
    if (unknownArg.length === 1) return false;

    const unknown = unknownArg.slice(unknownArg[1] === '-' ? 2 : 1);
    if (unknown in settings) {
      return true;
    }

    // issue an unknown error only once per unknownArg. this handles a single
    // dash when it should have been two, e.g., '-layer' instead of '--layer'.
    if (unknownsSeen.indexOf(unknownArg) < 0) {
      unknownsSeen.push(unknownArg);
      unknowns.push(unknownArg);
    }
    return false;
  }

  const args = minimist(argv, minimistOptions);

  const result = {argv, args, minimistOptions};
  if (unknowns.length) {
    result.unknowns = unknowns;
  }
  return result;
}

//
// examine each value in args
//
async function validateAndTransform (args, settings, results, options) {
  const {errors, fatals} = results;
  // copy the values from minimist to settings. these incorporate any env vars
  // that were already set because they were set as defaults for minimist.
  for (const k in settings) {
    const kebab = objectToKebabForm(k);

    if (kebab in args) {
      let value;
      const validatorType = Array.isArray(settings[k].validator) ? 'array' : typeof settings[k].validator;
      switch (validatorType) {
        case 'function':
          value = await settings[k].validator(k, args[kebab]);
          if (value instanceof Error) {
            errors.push(`${kebab}: ${value.message}`);
            continue;
          }
          break;
        case 'object': {
          // valid options are keys: value pairs. if the command line value
          // matches a key then the key's value is used.
          const options = settings[k].validator;
          if (args[kebab] in options || args[kebab].toLowerCase() in options) {
            value = options[args[kebab]];
          } else {
            errors.push(`invalid value ${args[kebab]} for ${kebab}`);
            continue;
          }
          break;
        }
        case 'array': {
          // valid options are enumerated in an array
          const options = settings[k].validator;
          if (options.indexOf(args[kebab]) >= 0) {
            value = args[kebab];
          } else {
            errors.push(`invalid value ${args[kebab]} for ${kebab}`);
            continue;
          }
          break;
        }
        case 'undefined':
          // there is no validator
          value = args[kebab];
          break;

        default:
          throw new Error(`unknown validation type ${validatorType}`);
      }

      // validate that the type is correct after any transformations
      const typeMap = {s: 'string', b: 'boolean', i: 'number', f: 'number'};
      // does the setting have an after-validation type?
      const vtypeMap = {a: 'array', o: 'object'};
      if (settings[k].vtype) {
        const vtype = vtypeMap[settings[k].vtype];
        switch (vtype) {
          case 'array':
            if (!Array.isArray(value)) {
              fatals.push(`invalid value for ${k}`, value);
              continue;
            }
            break;
          case 'object':
            if (typeof value !== 'object') {
              fatals.push(`invalid value for ${k}`, value);
              continue;
            }
            break;
          default:
            throw new Error(`invalid vtype specified ${settings[k].vtype}`);
        }
      } else if (typeof value !== typeMap[settings[k].type]) {
        fatals.push(`invalid type ${typeof value} for ${k}`);
        continue;
      }
      results.values[k] = value;
    }
  }

  for (const k in settings) {
    if (settings[k].required && !(k in results.values)) {
      // is this parameter allowed to be a non-option argument on the command line?
      if (settings[k].allow0 && '0' in args._) {
        results.values[k] = args._[0];
      } else {
        fatals.push(`required parameter ${k} does not have a value`);
      }
    }
  }

  return results;
}


//================================================================
// utility functions
//================================================================
async function convert (key, value, type) {
  if (type === 's') {
    return `${value}`;
  }
  if (type === 'i' || type === 'f') {
    if (typeof value === 'string') {
      value = +value;
    }
    if (type === 'i') value = Math.round(value);
    return Number.isNaN(value) ? undefined : value;
  }
  if (type === 'b') {
    if (typeof value === 'string') {
      return ['1', 'true', 't', 'yes', 'y', 'on'].indexOf(value.toLowerCase()) >= 0;
    }
    return !!value;
  }
  if (Array.isArray(type)) {
    return type.indexOf(value) >= 0 ? value : undefined;
  }
  if (typeof type === 'object') {
    if (value in type) {
      return type[value];
    } else if (typeof value === 'string' && value.toLowerCase() in type) {
      return type[value.toLowerCase()];
    }
  }
  if (typeof type === 'function') {
    return await type(key, value);
  }
  return undefined;
}

// take a string of the form oneTwoThree and convert it ONE_TWO_THREE
function objectToEnvForm (s) {
  return s.replace(/([A-Z])/g, $1 => {
    return '_' + $1;
  }).toUpperCase()
}

// take a string of the form one-two-three and convert it to oneTwoThree
//function kebabToObjectForm (s) {
//  return s.replace(/([a-z])-([a-z])/g, ($m, $1, $2) => $1 + $2.toUpperCase());
//}

// take a string of the form oneTwoThree and convert it to one-two-three
function objectToKebabForm (s) {
  return s.replace(/([A-Z])/g, $1 => '-' + $1.toLowerCase());
}

function makeMinimistOptions (settings, options = {}) {
  const string = [];
  const boolean = [];
  const alias = {};
  const defaults = {};

  let allow0seen;

  for (const k in settings) {
    const opt = objectToKebabForm(k);
    const setting = settings[k];
    if ('allow0' in setting) {
      if (allow0seen) throw new Error(`${allow0seen} and ${k} both specify "allow0"`);
      allow0seen = k;
    }

    switch (setting.type) {
      case 's':
        string.push(opt);
        break;
      case 'b':
        boolean.push(opt);
        break;
    }

    if ('default' in setting) {
      defaults[opt] = setting.default;
    }
    if (setting.alias) {
      alias[opt] = setting.alias;
    }
    // allow the object form as an alias for the kebab form
    if (opt !== k) {
      if (!alias[opt]) {
        alias[opt] = k;
      } else if (Array.isArray(alias[opt])) {
        alias[opt].push(k);
      } else {
        alias[opt] = [alias[opt], k];
      }
    }
  }
  return {
    string, boolean, alias, default: defaults, unknown: options.unknown
  };
}

module.exports = {
  get,
}
