const inquirer = require('inquirer');
const express = require('express');
const neo4j = require('neo4j-driver').v1;
const neo4j2d3 = require('./neo-export-d3.js');
let driver = ''; // do I need this?

const app = express();
const api = express();
app.use(express.static('public'));
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

let driverReady = inquirer.prompt(
    [
	{
	    type: 'input',
	    name: 'username',
	    message: 'Username:'
	},
	{
	    type: 'password',
	    message: 'Password:',
	    name: 'password'
	}
    ]
).then(
    function (answers) {
	console.log(driver);
	driver = neo4j.driver(
	    'bolt://localhost:7687',
	    neo4j.auth.basic(
		answers.username,
		answers.password
	    )
	);
	return driver;
    }
);

function courseIdGetter(n){
    const id = n.properties.code;
    delete n.properties.code;
    return id;
};

api.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

api.get('/search',
	// this endpoint always returns course id/title pairs.
	function(req,res){
	    function wordSearch(str){
		return '(?i)(?s).*' + str.replace(/\s+/g, '.*') + '.*';
	    }
	    
	    // create a cypher query based on req.query
	    let query = "MATCH (c:Course) ";
	    let queryParams = {};
	    // there must always be a set of years selected
	    query += `WHERE SIZE(FILTER(y in c.years WHERE y in {years}) > 0`;
	    queryParams.years = req.query.years;
	    //first search course title, desc by case-insensitive keywords
	    if (req.query.hasOwnProperty('searchStr')){
		// req.query.searchStr must be a single string
		if (typeof(req.query.searchStr) != "string"){
		    throw `searchStr is an array:${req.query.searchStr}`;
		} else {
		    let searchStr = wordSearch(req.query.searchStr);
		    query += ` AND (c.tile =~ {searchStr}
	  	              OR c.desc =~ {searchStr}) `;
		    queryParams.searchStr = searchStr;
		}
	    }
	    // limit to a set of depts
	    if (req.query.hasOwnProperty('depts')){
		query += `WITH c MATCH (c)-[r:In_Dept]-(d:Dept)
                          WHERE d.code in {depts}`;
		queryParams.depts = req.query.depts;
	    }
	    if (req.query.hasOwnProperty('programs')){
		// limit to a set of concentrations/programs
		query += ` WITH c MATCH (c)-[r:In_Dept]-(d)
		 WHERE d.code in {depts} `;
		"RETURN c.code LIMIT 100";
	    
	    driverReady.then(
		function(_driver){
		    let session = _driver.session();
		    let query = "";
		    const params = res.query;
		    if (params.hasOwnProperty('levels'){
			
		    }
		    session.run(query, );
		};
	    // switch between queries based on parameters
	    let query = "";
	    if (req.query.hasOwnAttribute('levels'){
		
	    }
		
	});
api.get('/courses',
	function(req, res){
	    driverReady.then(
		function(){
		    let handlers = {
			pathHandler:function(){return undefined;},
			segmentHandler:function(){return undefined;},
			idGetter:courseIdGetter
		    };
		    let query = "MATCH (c:Course)-[r:Prereq_To*]-(d:Course)\n";
		    query +=    "WHERE c.code in {codes}\n";
		    query +=    "RETURN c,r,d LIMIT 100";
		    return neo4j2d3.get(query, {courses:req.courses}, handlers);
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



