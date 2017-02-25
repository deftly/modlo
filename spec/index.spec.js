require( "./setup" );

var path = require( "path" );
var fount = require( "fount" );
var modlo = require( "../src/index" );

describe( "Loader", function() {
	describe( "With external fount instance and valid modules", function() {
		var result, loader;
		before( function() {
			loader = modlo( {
				fount: fount
			} );
			return loader.load( {
				patterns: [ "./spec/plugins/**/*.js", "./spec/things/*.js" ],
				modules: "when"
			} ).then( function( x ) {
				result = x;
			} );
		} );

		it( "should result in list of loaded items", function() {
			result.loaded.should.eql( [ 
				"pluginOne.config", 
				"pluginTwo.config", 
				"helloWorld",
				"pluginOne",
				"three", 
				"two", 
				"pluginTwo", 
				"thingOne",
				"when" 
			] );
		} );

		it( "should resolve requests for plugin with expected promise", function() {
			return fount.resolve( "pluginOne" )
				.should.eventually.eql( {
						_path: path.resolve( "./spec/plugins/one.js" ),
						title: "plugin one",
						list: [ "two", "three" ],
						value: {
							_path: path.resolve( "./spec/things/one.js" ),
							name: "thingOne", 
							description: "too cool for school"
						}
				} );
		} );

		after( function() {
			fount.purgeAll();
		} );
	} );

	describe( "With fount container and valid modules", function() {
		var result, loader;
		before( function() {
			loader = modlo( {
				fount: fount( "test" )
			} );
			return loader.load( {
				patterns: [ "./spec/plugins/**/*.js", "./spec/things/*.js" ],
				modules: "when"
			} ).then( function( x ) {
				result = x;
			} );
		} );

		it( "should result in list of loaded items", function() {
			result.loaded.should.eql( [ 
				"pluginOne.config", 
				"pluginTwo.config", 
				"helloWorld",
				"pluginOne",
				"three", 
				"two", 
				"pluginTwo", 
				"thingOne",
				"when" 
			] );
		} );

		it( "should resolve requests for plugin with expected promise", function() {
			return fount.resolve( "test_pluginOne" )
				.should.eventually.eql( {
						_path: path.resolve( "./spec/plugins/one.js" ),
						title: "plugin one",
						list: [ "two", "three" ],
						value: {
							_path: path.resolve( "./spec/things/one.js" ),
							name: "thingOne", 
							description: "too cool for school"
						}
				} );
		} );

		after( function() {
			fount.purgeAll();
		} );
	} );

	describe( "With internal fount instance", function() {
		var result, loader;
		before( function() {
			loader = modlo( {
				modules: [ "when" ]
			} );
			return loader.load( {
				patterns: [ "./spec/plugins/**/*.js", "./spec/things/*.js" ]
			} ).then( function( x ) {
				result = x;
			} );
		} );

		it( "should result in list of loaded items", function() {
			result.loaded.should.eql( [
					"pluginOne.config", 
					"pluginTwo.config", 
					"helloWorld",
					"pluginOne",
					"three", 
					"two", 
					"pluginTwo", 
					"thingOne",
					"when"
				] );
		} );

		it( "should resolve requests for plugin with expected promise", function() {
			return result.fount.resolve( "pluginOne" )
				.should.eventually.eql( {
						_path: path.resolve( "./spec/plugins/one.js" ),
						title: "plugin one",
						list: [ "two", "three" ],
						value: {
							_path: path.resolve( "./spec/things/one.js" ),
							name: "thingOne", 
							description: "too cool for school"
						}
				} );
		} );

		after( function() {
			result.fount.purgeAll();
		} );
	} );

	describe( "With custom namespace", function() {
		var result, loader;
		before( function() {
			loader = modlo( {
				fount: fount
			} );
			return loader.load( {
				patterns: [ "./spec/plugins/**/*.js", "./spec/things/*.js" ],
				namespace: "myTest",
				modules: "when"
			} ).then( function( x ) {
				result = x;
			} );
		} );

		it( "should result in list of loaded items", function() {
			result.loaded.should.eql( [
					"myTest.pluginOne.config", 
					"myTest.pluginTwo.config", 
					"myTest.helloWorld",
					"myTest.pluginOne",
					"myTest.three", 
					"myTest.two", 
					"myTest.pluginTwo", 
					"myTest.thingOne",
					"when"
				] );
		} );

		it( "should resolve requests for plugin with expected promise", function() {
			return result.fount.resolve( "myTest.pluginOne" )
				.should.eventually.eql( {
						_path: path.resolve( "./spec/plugins/one.js" ),
						title: "plugin one",
						list: [ "two", "three" ],
						value: {
							_path: path.resolve( "./spec/things/one.js" ),
							name: "thingOne",
							description: "too cool for school"
						}
				} );
		} );

		after( function() {
			fount.purgeAll();
		} );
	} );

	// here to ensure code functions as intended if no modules are registered as
	// factories
	describe( "when all module dependencies resolve", function() {
		var result, loader;
		before( function() {
			loader = modlo();
			return loader.load( {
				fount: fount, 
				patterns: [ "./spec/simple/*.js" ]
			} ).then( function( x ) {
				result = x;
			} );
		} );

		it( "should result in list of loaded items", function() {
			result.loaded.should.eql( [
				"simple"
			] );
		} );

		after( function() {
			fount.purgeAll();
		} );
	} );
} );