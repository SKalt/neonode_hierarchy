const inquirer = require('inquirer');
const express = require('express');
const neo4j = require('neo4j-driver').v1;
const neo4j2d3 = require('./neo-export-d3.js');
const pug = require('pug');
let driver = '';
const app = express();
const api = express();

/*app.use('/js', express.static('public/js'));
app.use('/css', express.static('public/css'));
app.use('/img', express.static('public/img'));
 */
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

api.get('/course',
	function(req, res){
	    for (var course of req.query.courses){
		// course is a str course code
		console.log(course);
	    }
	});
	

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



