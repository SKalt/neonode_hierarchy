const inquirer = require('inquirer');
const express = require('express');
const neo4j = require('neo4j-driver').v1;
const neo4j2d3 = require('./neo-export-d3.js');
const pug = require('pug');

const app = express();
const api = express();

app.use('/js', express.static('public/js'));
app.use('/css', express.static('public/css'));
app.use('/img', express.static('public/img'));

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

const compilePage = pug.compileFile('temp.pug');
console.log(compilePage());

/*let driverReady = inquirer.prompt(
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
	return neo4j.driver(
	    'bolt://localhost:7687',
	    neo4j.auth.basic(
		answers.username,
		answers.password
	    )
	);
    }
);*/

