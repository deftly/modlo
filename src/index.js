var _ = require( 'lodash' );
var path = require( 'path' );
var when = require( 'when' );
var utility = require( "./utility" );
var glob = require( "globulesce" );
var getArguments = utility.getArguments;

// returns a list of files from a given parent directory
function getModuleList( patterns ) {
	return when.all( glob( "./", patterns, [ ".git", "node_modules" ] ) )
		.then( function( collections ) {
			var list = _.filter( _.flatten( collections ) );
			return _.map( list, function( modulePath ) {
				return { path: modulePath, name: undefined };
			} );
		} );
}

// get single list of all modules to load and add metadata about each
function getDependencyList( fount, patterns, modules ) {
	_.each( modules, function( name ) {
		fount.registerModule( name )
	} );
	return getModuleList( patterns, modules )
		.then( function( moduleList ) {
			return _.map( moduleList, function( info ) {
				return getModuleInfo( info );
			} );
		} );
}

// loads internal resources, resources from config path and node module resources
function getFullList( patterns, modules ) {
	return getModuleList( patterns )
		.then( function( list ) {
			_.each( modules, function( moduleName ) {
				list.unshift( {
					path: require.resolve( moduleName ),
					name: moduleName 
				} );
			} );
			return list;
		} );
}

// load module and add metadata about it for use in registering with fount
function getModuleInfo( module ) {
	try {
		var key = path.resolve( module.path );
		delete require.cache[ key ];
		var moduleResult = require( module.path );
		var fileName = path.basename( module.path );
		var moduleName = module.name || moduleResult.name || fileName.replace( path.extname( fileName ), "" );
		var isFunction = _.isFunction( moduleResult );
		var args = isFunction ? getArguments( moduleResult ) : [];
		return {
			name: moduleName,
			value: moduleResult,
			isFunction: isFunction,
			dependencies: args,
			path: module.path
		}
	} catch ( err ) {
		console.error( 'Error loading module at %s with: %s', module.path, err.stack );
		return null;
	}
}

// create name to register the module by
function getRegistrationName( namespace, module ) {
	if( namespace ) {
		return [ namespace ].concat( module.name.split( "_" ) ).join( "." );
	} else {
		return module.name.split( "_" ).join( "." );
	}
}

// create qualified name for argument
function getQualifiedName( namespace, module, arg ) {
	var registrationName = getRegistrationName( namespace, module );
	return [ registrationName, arg ].join( "." );
}

// create qualified name for argument
function getNamespaceName( namespace, arg ) {
	return [ namespace, arg ].join( "." );
}


function load( config ) {
	var fount = config.fount || require( "fount" );
	var patterns = normalizeToArray( config.patterns );
	var modules = normalizeToArray( config.modules );
	return getDependencyList( fount, patterns, modules )
		.then( function( list ) {
			list = _.filter( list );
			return registerAll( fount, config.namespace, list, 0 )
				.then( function() {
					var keys = _.map( list, function( module ) {
						return getRegistrationName( config.namespace, module );
					} );
					return {
						loaded: keys.concat( modules ),
						fount: fount
					};
				} );
		} );
}

function normalizeToArray( value ) {
	return _.isString( value ) ? [ value ] : ( value || [] );
}

// attempt to register all modules with fount using multiple passes
// to ensure all dependencies are available before attempting to
// determine whether a module's resulting function should be registered
// as a factory or a static result
function registerAll( fount, namespace, modules, failures ) {
	if( failures < 2 || modules.length === 0 ) {
		return registerModules( fount, namespace, modules )
			.then( function( remaining ) {
				if( remaining.length ) {
					if( remaining.length === modules.length ) {
						failures ++;
					}
					return registerAll( fount, namespace, remaining, failures );
				}
				return when([]);
			} );
	} else {
		_.each( modules, function( m ) {
			var name = getRegistrationName( namespace, m );
			fount.register( name, m.value );
		} );
		return when([]);
	}
}

// attempt to register modules based on whether their dependencies
// can be resolved by fount.
// resolves to a list of modules that have unresolved dependencies
function registerModules( fount, namespace, modules ) {
	var remaining = [];
	return when.all( _.map( modules, function( m ) {
		return tryRegistration( fount, namespace, m )
			.then( null, function() {
				remaining.push( m );
			} );
	} ) ).then( function() {
		return remaining;
	} );
}

// attempt to register a module by looking at its dependnecy list
// rejects if the module has dependencies that can't be resolved by fount yet
function tryRegistration( fount, namespace, moduleInfo ) {
	function onResult( result ) {
		result._path = moduleInfo.path;
		var name = getRegistrationName( namespace, moduleInfo );
		fount.register( name, result );
		return moduleInfo.name;
	}

	if( moduleInfo.isFunction ) {
		if( moduleInfo.dependencies.length ) {
			var argList = moduleInfo.dependencies;
			var dependencies = argList;
			argList = [];
			_.each( dependencies, function( arg ) {
				var qualifiedName = getQualifiedName( namespace, moduleInfo, arg );
				var namespaceName = getNamespaceName( namespace, arg );
				if( _.isFunction( fount ) && fount( moduleInfo.name ).canResolve( arg ) ) {
					argList.push( qualifiedName );
				} else if( fount.canResolve( qualifiedName ) ) {
					argList.push( qualifiedName );
				} else if( fount.canResolve( namespaceName ) ) {
					argList.push( namespaceName );
				} else if( fount.canResolve( arg ) ) {
					argList.push( arg );
				}
			} );
			var canResolve = argList.length === dependencies.length;
			if( canResolve ) {
				return fount.inject( argList, moduleInfo.value )
					.then( onResult );
			} else {
				return when.reject( moduleInfo );
			}
		} else {
			return when( onResult( moduleInfo.value() ) );
		}
	} else {
		return when( onResult( moduleInfo.value ) );
	}
}

function initialize( defaults ) {
	function loadWithDefaults( config ) {
		var effective = Object.assign( defaults || {}, config );
		return load( effective );
	};
	return {
		load: loadWithDefaults
	};
};

module.exports = initialize;
