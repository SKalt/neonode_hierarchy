/* imports / setup */
const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "alpha123"));

/**
 * Returns a stringified object type
 * @param {?} thing a thing
 * @returns {String} a string object name
 */
function basicTypeCheck(thing){
    return Object.prototype.toString.call(thing);
}

/**
 * Runs the supplied callback if thing is a neo4j.types.Int.
 * @param {?} thing a thing.
 * @param {Function} callback a callback function.
 */
const handleInt = function(thing, callback){
    if (neo4j.isInt(thing)){
	callback();
    };
};

/**
 * transforms any and all neo4j.Int members of an object to numbers.
 * @param {object} thing a node/link with a .properties attribute
 */
function handleProperties(thing){
    const props = Object.keys(thing.properties);
    for (var i=0; i<props.length; i++){
	let prop = props[i];
	handleInt(
	    thing.properties[prop],
	    function(){
		thing.properties[prop] = thing.properties[prop].toNumber();
	    });
	if (basicTypeCheck(thing.properties[prop]) === '[object Array]'){
	    for (var j=0; j<thing.properties[prop].length; j++){
		handleInt(
		    thing.properties[prop][j],
		    function(){
			thing.properties[prop][j] = thing.properties[prop][j].toNumber();
		    }
		);
	    }
	};
    }
};
/**
 * updates graph with a new node or link.
 * @param {neo4j-driver.types.Record} record a node/relathionship/path/segment.
 * @param {Function} nodeHandler a function to add nodes to the nodes array
 * @param {object} handlers an object with functions idGetter, path-, & segmentHandlers
 * @throws {error} iff `record` field other than a node/relathionship/path/segment.
 */
function handleRecordField(
    record,
    graph,
    handlers
){
    if (record.hasOwnProperty('labels')){
	// it's a neo4j-driver.types.Node
	handleNode(record, graph, handlers.idGetter);
    } else if (record.hasOwnProperty('type')){
	//it's a neo4j-driver.types.Relationship
	handleLink(record, graph);
    } else if (record.hasOwnProperty('segments')){
	// it's a neo4j-driver.types.Path
	handlers.pathHandler(record, graph);
    } else if (record.hasOwnProperty('start')){
	// it' a neo4j-driver.types.PathSegment
	handlers.segmentHandler(record, graph);
    } else {
	throw "Not node, relationship, path, or segment.";
    };
};

/**
 * Processes, adds a link to a supplied d3-style graph object.
 * @param {neo4j.types.Link} link
 * @param {object} graph
 */
function handleLink(link, graph){
    handleProperties(link);
    link.start = link.start.toNumber();
    link.end = link.end.toNumber();
    graph.links.push({
	id: "L" + link.identity.toNumber(),
	properties:link.properties,
	source: link.start,
	target:link.end,
	type:link.type
    });
};
/**
 * Pushes a processed node to nodeArray unless the node is already present.
 * @param {Node} n a neo4j.types.Node
 * @param {object} graph a object made up of an array nodes and an array links.
 * @param {Function} idGetter a function to get a unique string id of a node.
 */
function handleNode(n, graph, idGetter){
    const id = idGetter(n);
    if (n.labels.length != 1){
	console.log("multilabelled node:", id, n.labels);
    }
    const label = n.labels[0];
    const notId = function(node){
	if (node.id != id){
	    return true;
	} else {
	    return false;
	}
    };
    
    if (graph.nodes.every(notId)){
	handleProperties(n);
	let node = {
	    _id:n.identity.toNumber(),
	    id:id,
	    label:n.labels[0],
	    properties:n.properties
	};
	graph.nodes.push(node);
    }
    return undefined;
};

/**
 * takes a neo4j.result and unpacks it into a d3-style graph object
 * @param {neo4j.types.Result} result
 * @param {object} handlers an object with methods idGetter, pathHandler, and segmentHandler
 * @returns {object}  a d3-style graph object.
 */
function makeGraph(result, handlers){
    let graph = {nodes:[], links:[]};
    result.records.forEach(
	function(record){
	    record.forEach(
		function(field){
		    handleRecordField(
			field,
			graph,
			handlers
		    );
		}
	    );
	}
    );
    return graph;
}

/**
 * Replaces neo4j node identities in links with determined ids.
 * @param {object} graph  a d3-style graph object
 * @returns {object}  a processed d3-style graph object 
 */
function mapIds(graph){
    // graph has nodes array and links array
    let idMap={};
    for (var i=0; i < graph.nodes.length; i++){
	idMap[graph.nodes[i]._id] = graph.nodes[i].id;
	delete graph.nodes[i]._id;
    }
    for (i=0; i < graph.links.length; i++){
	graph.links[i].source = idMap[graph.links[i].source];
	graph.links[i].target = idMap[graph.links[i].target];
    }
    return graph;
}

/**
 * Promises a d3-style graph object of the results of a cypher query
 * @param {String} query a string cypher query
 * @param {object} queryParameters query parameters in param:value format
 * @param {object} handlers an object with methods idGetter, pathHandler, and segmentHandler
 * @returns {Promise} a d3-style graph object
 */
function neo4j2d3(
    query,
    queryParameters,
    handlers
){
    let session = driver.session();
    return session.run(query, queryParameters)
	.then(function(result){return makeGraph(result, handlers);})
	.then(function(g){return mapIds(g);});
}

/*const exports = {
    driver, neo4j2d3, mapIds, makeGraph, handleNode, handleLink,
    handleRecordField, handleProperties, handleInt, basicTypeCheck
};*/

/**
 * Gets course ids
 * @param {neo4j-driver.types.Node} n a `Course` Node
 * @returns {String} a string course number 
 */
function courseIdGetter(n){
    const id = n.properties.code;
    delete n.properties.code;
    return id;
};

/** @const handler functions */
var handlers = {
    pathHandler:function(){return undefined;},
    segmentHandler:function(){return undefined;},
    idGetter:courseIdGetter
};

var temp = neo4j2d3(
    'MATCH (c:Course)-[r]-(d:Course) RETURN c,r,d LIMIT 2',
    {},
    handlers
).then(console.log);
