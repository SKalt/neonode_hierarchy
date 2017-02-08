
// Searchbar fillout
$('.sectionHeader').click(
    function(){
	$(this)
	    .next()
	    .slideToggle();
	if (/\+/g.exec($(this).text())){
	    $(this).text($(this).text().replace('+', '-'));
	} else {
	    $(this).text($(this).text().replace('-', '+'));
	}
    }
);

// #years
const d = new Date();
let years = [];
if (d.getMonth() > 3){
    // April, month 4/index 3, is when I guess the new catalog comes out.
    // Thus the most recent catalog is the current year
    for (let i=2013; i <= d.getFullYear(); i++){
	years.push(i);
    }
} else {
    // don't include the current year.
    for (let i=2013; i < d.getFullYear(); i++){
	years.push(i);
    }
}
for (var year of years){
    $('#years tbody tr')
	.append(
	    $('<td></td>')
		.html(year)
		.addClass('selected')
		.click(
		    function(){
			$(this).toggleClass('selected');
		    }
		)
	);
}
// #depts
$('.all>table>tbody>tr>td')
    .click(
	function(){
	    $(this).toggleClass('selected');
	}
    );
// var depts = ["AAS", "ACS", "ANTH", "ASIA", "AVC", "BIO", "CHEM", "CMS", "DCS", "ECON", "EDUC", "ENG", "ENVR", "EUS", "EXDS", "FRE", "FYS", "GEO", "GRST", "HIST", "INDC", "INDS", "LAS", "MATH", "MUS", "NRSC", "PE", "PHAS", "PHIL", "PLTC", "PSYC", "REL", "RHET", "SOC", "SPAN", "THDN", "WGST"];
// console.log(depts);
// console.log(depts[0]);
// for (var i=0; i<depts.length; i++){
//     console.log(typeof(depts[i]));
//     $('#deptSearch > div > table > tbody > tr:nth-child(' + i % 7 + ')')
// 	.append(
// 	    $('<td></td>')
// 		.html(depts[i])
// 	);
// }

//TODO: add a clear button
// #profs
$.get('./profs.json', function(profs){
    function compareByLast(a,b){
	var lastA = a.split(' ');
	var lastB = b.split(' ');
	lastA = lastA[lastA.length - 1];
	lastB = lastB[lastB.length - 1];
	if (lastA > lastB){
	    return 1;
	} else if (lastB < lastA){
	    return -1;
	} else {
	    return 0;
	}
    }
    profs.sort(compareByLast);
    for (var prof of profs){
	let opt = $('<option></option>')
		.attr('value', prof);
	$('#profs0')
	    .append(opt);
    }
});
$.get('./concentrations.json',
      function(concs){
	  concs.sort();
	  for (var conc of concs){
	      let opt = $('<option></option>')
		      .attr('value', conc);
	      $('#programs0')
		  .append(opt);
	  }
      }
     );
$.get('./programs.json',
      function(progs){
	  progs.sort();
	  for (var prog of progs){
	      let opt = $('<option></option>')
		      .attr('value', prog);
	      $('#programs0')
		  .append(opt);
	  }
      }
     );

// function makeDAG(){
//     return new dagreD3.graphlib.Graph()
// 	.setGraph({})
// 	.setDefaultEdgeLabel(function() { return {}; });
// }

 graphCache = {
    nodes:{}, // map node, edge ids to data
    links:{},
    searches:{} // node:[ids], edge:[ids]
};

function lookup(query, endpointURL){
    return new Promise(
	function(res, rej){
	    if (query){
		var queryString = $.param(query);
		if (graphCache.searches[queryString]){
		    // the search is cached
		    let graphObj = {nodes:[], links:[]};
		    for (var nodeId of graphCache.search[queryString.nodes]){
			graphObj.nodes.push(graphCache.nodes[nodeId]);
		    }
		    for (var linkId of graphCache.search[queryString.links]){
			graphObj.links.push(graphCache.links[nodeId]);
		    }
		    res(graphObj);
		} else {
		    console.log(queryString);
		    $.get(endpointURL + '?' + queryString,
			  (data, status, jqXHR) => {
			      console.log(status);
			      let toCache = {nodes:[], links:[]};
			      for (var node of data.nodes){
				  graphCache.nodes[node.id] = node;
				  toCache.nodes.push(node.id);
			      }
			      for (var link of data.links){
				  graphCache.links[link.id] = link;
				  toCache.links.push(link.id);
			      }
			      graphCache.searches[queryString] = toCache;
			      res(data);
			  }
			 );
		}		
	    }
	}
    );
}

// layout only nodes with links
function stripSingletons(_graph){
    let nodesWithLinks = new Set();
    let singletons = [];
    for (var link of _graph.links){
	nodesWithLinks.add(link.source); // <- node.id s
	nodesWithLinks.add(link.target);
    }
    for (var _node of _graph.nodes){
	if (!nodesWithLinks.has(_node.id)){
	    singletons.push(_graph.nodes.pop(_node));
	}
    }
    return singletons;
}

function dagreLayout(graph){
    let g = new dagre
	    .graphlib
	    .Graph();
    g.setGraph({});
    g.setDefaultEdgeLabel(function(){return {};});
    for (let n of graph.nodes){
	g.setNode(n.id, {});
    }
    for (let e of graph.links){
	g.setEdge(e.source, e.target, {});
    }
    dagre.layout(g);
    for (let i=0; i<graph.nodes.length; i++){
	let node = g.node(graph.nodes[i].id);
	graph.nodes[i].x = node.x;
	graph.nodes[i].y = node.y;
    }
    return graph;
}

function getDimensions(el){
    var dims = [];
    for (var dim of ["height", "width"]){
	dims.push(Number(el.style(dim).replace('px', '')));
    }
    return dims;
}

function d3Render(graph){
    console.log(graph.nodes);
    var svg = d3.select('svg');
    let dims = getDimensions(svg);
    let height  = dims[0];
    let width = dims[1];
    var simulation = d3.forceSimulation()
	    .force(
		"link", d3.forceLink().id(
		    function(d) {
			console.log(d.id);
			return d.id; }
		)
	    )
	    .force("charge", d3.forceManyBody().strength(-4000))
	    .force("center", d3.forceCenter(width / 2, height / 2));
    var link = svg.append("g")
	    .attr("class", "links")
	    .selectAll("line")
	    .data(graph.links)
	    .enter().append("line");
    var nodeGroup = svg.append("g")
	    .attr("class", "nodes")
	    .selectAll("g")
	    .data(graph.nodes)
	    .enter().append("g")
	    .attr("class", "nodeGroup");
   var node = nodeGroup.append("circle")
	    .attr("r", 40)
	    .call(d3.drag()
		  .on("start", dragstarted)
		  .on("drag", dragged)
		  .on("end", dragended)
		 );
    node.append("title")
	.text(function(d) { return d.id; });
    
    nodeGroup.append("text")
	.text(function(d) { return d.id; })
	.attr('dx', -30)
	.attr('dy', ".5em");
    var why = d3.select('.nodes')
	    .selectAll('text')
	    .data(graph.nodes)
	    .enter().insert('text', 'circle')
	    .attr('dx', '1em')
	    .text(function(d){return d.id;});
    
	    
    simulation
	.nodes(graph.nodes)
	.on("tick", ticked);
    simulation.force("link")
	.links(graph.links);
    
    function ticked() {
	//console.log('ticked');
	link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    nodeGroup.attr("transform",
	function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    }
    
    function dragstarted(d) {
	console.log(d);
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
    }

    function dragged(d) {
	console.log('dragged');
	d.fx = d3.event.x;
	d.fy = d3.event.y;
    }

    function dragended(d) {
	console.log('drageneded');
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
    }
};


//deprecating
function importDAG(coursesQuery){
    var g = makeDAG();
    var svg = d3.select("svg");
    var inner = svg.select("g");
    $.get(coursesQuery, (data, status, jqXHR) => {
	for (var n of data.nodes){
	    g.setNode(n.id, {
		label:n.id,
		properties:n.proverties
	//	shape:"circle"
	    });
	}
	for (var e of data.links){
	    g.setEdge(e.source, e.target, {properties:e.properties});
	}
	var render = new dagreD3.render();
	render(inner, g);
	var zoom = d3.behavior.zoom().on("zoom", function() {
	    inner.attr("transform", "translate(" + d3.event.translate + ")" +
                       "scale(" + d3.event.scale + ")");
	});
	svg.call(zoom);
	var svgWidth = Number(svg.style("width").replace('px',''));
	console.log(g.graph().width, svgWidth);
	var initialScale = 0.75;
	zoom
	    .translate([(svgWidth - g.graph().width * initialScale) / 3, 20])
	    .scale(initialScale)
	    .event(svg);
	svg.attr('height', g.graph().height * initialScale + 40);
    }
	 );
}
var g = {};
lookup({codes:["PSYC 218"]}, "http://localhost:3001/courses")
    .then(dagreLayout).then(d3Render);

// importDAG('http://localhost:3001/dept?codes%5B%5D=ENVR');
