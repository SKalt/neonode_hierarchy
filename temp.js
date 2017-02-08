const inquirer = require('inquirer');
const express = require('express');
const neo4j = require('neo4j-driver').v1;
const neo4j2d3 = require('./neo-export-d3.js');
let driver = ''; // do I need this?
const fs = require('fs');
const app = express();
const api = express();
app.use(express.static('public'));
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

// let driverReady = inquirer.prompt(
//     [
// 	{
// 	    type: 'input',
// 	    name: 'username',
// 	    message: 'Username:'
// 	},
// 	{
// 	    type: 'password',
// 	    message: 'Password:',
// 	    name: 'password'
// 	}
//     ]
// ).then(
//     function (answers) {
// 	console.log(driver);
// 	driver = neo4j.driver(
// 	    'bolt://localhost:7687',
// 	    neo4j.auth.basic(
// 		answers.username,
// 		answers.password
// 	    )
// 	);
// 	return driver;
//     }
// );
function _driver(){
    return new Promise(
	function(res, rej){
	    res(
		neo4j.driver(
		    'bolt://localhost:7687',
		    neo4j.auth.basic(
			'neo4j',
			'alpha123'
		    )
		)
	    );
	});
}
    
let driverReady = _driver();

function courseIdGetter(n){
    const id = n.properties.code;
    delete n.properties.code;
    return id;
};

// cache professors, concentrations/programs, depts
function cacheArray(query, dest){
    driverReady.then(
	function(_driver){
	    let session = _driver.session();
	    session.run(query)
		.then(function(result){
		    let records = [];
		    result.records.forEach(
			function(record){
			    records.push(record._fields[0]);
			});
		    return records;
		}).catch(console.log)
		.then(
		    function(records){
			fs.writeFile(
			    dest,
			    JSON.stringify(records),
			    'utf8',
			    (err)=>{if (err) throw err;}
			);
		    }
		);
	});
}
cacheArray(`MATCH (p:Prof) RETURN p.name`, './public/profs.json');
cacheArray(`MATCH (p:Program) RETURN p.name`, './public/programs.json');
cacheArray(`MATCH (c:Concentration) RETURN c.name`, './public/concentrations.json');
cacheArray(`MATCH (d:Dept) RETURN d.name`, './public/depts.json');

api.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

api.get('/search_courses',
	// this endpoint always returns course id/title pairs.
	function(req,res){

	    console.log(req.query);
	    
	    function wordSearch(str){
		return '(?i)(?s).*' + str.replace(/\s+/g, '.*') + '.*';
	    }
	    
	    // create a cypher query based on req.query
	    let query = "MATCH (c:Course) ";
	    // there must always be a set of years selected
	    query += ` WHERE SIZE(FILTER(y IN c.years WHERE y IN {years})) > 0`;
	    req.query.years.forEach(function(year, index, yearsArray){
		yearsArray[index] = Number(year);
	    });
	    
	    //first search course title, desc by case-insensitive keywords
	    if (req.query.hasOwnProperty('searchStr')){
		// req.query.searchStr must be a single string
		if (typeof(req.query.searchStr) != "string"){
		    throw `searchStr is an array:${req.query.searchStr}`;
		} else {
		    req.query.searchStr = wordSearch(req.query.searchStr);
		    query += ` AND (c.tile =~ {searchStr}
	  	               OR c.desc =~ {searchStr}) `;
		}
	    }
	    
	    // limit to a set of depts
	    if (req.query.hasOwnProperty('depts')){
		query += ` WITH c MATCH (c)-[r:In_Dept]-(d:Dept)
                           WHERE d.code IN {depts}`;
	    }
	    
	    // limit to a set of concentrations/programs    
	    if (req.query.hasOwnProperty('programs')){
		query += ` WITH c MATCH (c)-[r:In_Program]-(d)
		           WHERE d.name IN {programs}`;
	    }
	    // limit to a set of professors teaching in selected years
	    if (req.query.hasOwnProperty('profs')){
		query += ` WITH c MATCH (c)-[t]-(p:Prof)
		WHERE SIZE(FILTER(x IN t.years WHERE x IN {years})) > 0
		AND p.name IN {profs}`; // p.names must be correctly spelled
	    }
	    query += ` RETURN c.code, c.title LIMIT 100`;
	    
	    driverReady.then(
		function(_driver){
		    let session = _driver.session();
		    console.log(query);
		    console.log(req.query);
		    return session.run(query, req.query)
			.then(
			    function(response){
				let results = [];
				response.records.forEach(
				    function(record){
					results.push({
					    code:record.get('c.code'),
					    title:record.get('c.title')
					});
				    }
				);
				console.log(results);
				return results;
			    }
			).catch(console.log)
			.then(
			    function(results){
				res.send(results);
			    }
			).catch(console.log);
		}
	    ).catch(console.log);
	}
       );

api.get('/courses',
	function(req, res){
	    driverReady.then(
		function(){
		    console.log('req @ 3001/courses', req.query);
		    let handlers = {
			pathHandler:function(){return undefined;},
			segmentHandler:function(){return undefined;},
			idGetter:courseIdGetter
		    };
		    let query = `MATCH (c:Course)<-[r:Prereq_To*]-(d:Course)
		                 WHERE c.code in {codes}
		                 UNWIND r as p
		                 RETURN distinct c, 
		                 startNode(p), endNode(p), p,
		                 d LIMIT 100`;
		    console.log({codes:req.query.codes});
		    neo4j2d3.get(query,
				 {codes:req.query.codes},
				 handlers)
			.then(function(graph){
			    res.send(graph);
			    console.log('sent');
			})
			.catch(console.log);
		}
	    );
	}
       );

api.get('/dept',
	function(req, res){
	    driverReady.then(
		function(){
		    console.log('req @ 3001/dept', req.query);
		    let handlers = {
			pathHandler:function(){return undefined;},
			segmentHandler:function(){return undefined;},
			idGetter:courseIdGetter
		    };
		    let query = `MATCH (p:Course)-[r]->(c:Course)-->(d:Dept)
		                 WHERE d.code in {codes} AND 2016 in c.years
		                 RETURN distinct c, r, p
		                 LIMIT 100`;
		    console.log('1');
		    neo4j2d3.get(query,
				 {codes:req.query.codes},
				 handlers)
			.then(function(graph){
			    res.send(graph);
			    console.log('sent');
			})
			.catch(console.log);
		}
	    );
	}
       );

api.get('/test',
	function(req, res){
	    driverReady.then(
		function(){
		    var handlers = {
			pathHandler:function(){return undefined;},
			segmentHandler:function(){return undefined;},
			idGetter:courseIdGetter
		    };
		    return neo4j2d3.get(
			"MATCH (a:Course)-[r]-(b:Course) RETURN a, r, b LIMIT 2",
			{},
			handlers
		    ).then(
			function(graph){
			    res.send(graph);
			}
		    );
		}
	    );
	}
       );
api.listen(3001, function(){
    console.log('api listening on port 3001');
});

//const compilePage = pug.compileFile('temp.pug');
//console.log(compilePage());

