/**
	@author Dylan McCurry
	
	utilizes the graph library built ontop of Three.js with wikipedia api functionality
*/

var drawing;
var nodes = [];
var edges = [];
var known_ids = [];

function createDrawing() {
	drawing = new Drawing.SimpleGraph({
										layout: '3d', 
										selection: true, 
										numNodes: 0, 
										graphLayout:{
											attraction: 5, 
											repulsion: .5}, 
										showStats: true,
										iterations: 1000,
										showInfo: true,
										showLabels: true});
}

function WIKI_AddNode(title, optionalRootNode, optionalColor) {
	var node = new Node(title);
	node.data.title = title;
	
	color = optionalColor || 0x333333;
	
	if (optionalRootNode) {
		drawing.drawNode(node, 0x333333, optionalRootNode);
	}
	else {
		drawing.drawNode(node, 0x333333);
		drawing.highlightNode(node);
	}
	
	nodes.push(node);
	return node;
}

function WIKI_AddEdge(source, target) {
	var edge = new Edge(source, target);
	
	drawing.drawEdge(source, target);
	edges.push(edge);

	source.addConnectedTo(target);
	target.addConnectedTo(source);

	if (source.nodesTo.length > 1) {
		drawing.highlightNode(source);
		
		if (source.nodesTo.length == 2) {
			WIKI_parse(source.data.title);
		}
	}
	if (target.nodesTo.length > 1) {
		drawing.highlightNode(target);
		
		if (target.nodesTo.length == 2) {
			WIKI_parse(target.data.title);
		}
	}
}


$(document).ready(function() {
	$("#go-button").attr("onclick", "WIKI_parse()");
	createDrawing();
});

function WIKI_parse(subject) {
	var text = subject || $("#input-text").val().toLowerCase();

	$.getJSON(	"http://en.wikipedia.org/w/api.php?callback=?",
				{	titles: text,	
					action: "query", 
					prop: "revisions", 
					rvprop: "content", 
					format: "json" 
				},
				function(data) { 
					extractField(data) 
				});
	$("#input-text").blur();
}

function extractField(data) {
	var page = data.query.pages;
	
	if (page != null) {
		for (i in page) {
			var title = page[i].title;
			var pageid = page[i].pageid;
			var text = page[i].revisions[0]["*"];
			var links = entry(text);
		}
		
		var foundRoot = false;
		var root;

		for (var i = 0; i < nodes.length; i++) {
			if (title.toLowerCase() === nodes[i].data.title.toLowerCase()) {
				foundRoot = true;
				root = nodes[i];
				break;
			}
		}
		if (!foundRoot) {
			root = WIKI_AddNode(title, undefined, 0x00FF00);
		}
		
		// loop over all links, and add them to the scene or make the connection if they're already in the scene
		for (var i = 0; i < links.length && i < 7; i++) {
			var foundLink = false;
			var other;  // represents link object
			// check all nodes in scene first
			for (var k = 0; k < nodes.length; k++) {
				if (links[i].toLowerCase() === nodes[k].data.title.toLowerCase()) {
					foundLink = true;
					other = nodes[k];
					break;
				}
			}
			// if we didn't find it, make a new one
			if (!foundLink) {
				other = WIKI_AddNode(links[i], root);
			}
			WIKI_AddEdge(root, other);
		}
	}
}


function entry(text) {
	var cleared = false;

	// adapted from http://www.xefer.com/wikipedia
	while(! cleared) {
		if(isNoteStart(text)) {
			text = clearLine(text);
		}
		else if(isDataBlock(text, "{")) {
			text = clearDataBlock(text, "{", "}");
		}   
		// can be a problem if this is the first bit of text; need to see a counter example
		else if(isDataBlock(text, "[")) {
			text = clearDataBlock(text, "[", "]");
		} 
		else if(isInfoBox(text)) {
			text = clearInfoBox(text);
		}
		else if(isNoInclude(text)) {
			text = clearNoInclude(text);
		}
		else if(isXmlComment(text)) {
			text = clearXmlComment(text);
		}
		else {
			cleared = true;
		}
	}
	
	var links = findLinks(text).getUnique();
	
	return links;
}

// find and extract all the links.  return only the clean ones by calling cleanseLink on the results
function findLinks(text) {
	var regex = /\[\[(.*?)\]\]/g;
	
	var dirtyLinks = text.match(regex);
	
	var links = new Array();
	for (var i = 0; i < dirtyLinks.length; i++) {
		if (!isJunk(dirtyLinks[i])) { // check for junk like links
			links.push(cleanseLink(dirtyLinks[i]));
		}
	}
	
	return links;
}








/* --- utility? --- */

function isRedirect(data) {
	return data.indexOf("#REDIRECT") != -1;
}

function isNoteStart(data) {
	return data.charAt(0) == ":"; 
}

function isDataBlock(data, startChar) {
	return data.charAt(0) == startChar && data.charAt(1) == startChar;
}

function isInfoBox(data) {
	return data.indexOf("{|") == 0;
}

function clearInfoBox(data) {
	var index = data.indexOf("|}");
	var size = "|}".length;
	return $.trim(data.slice(index + size));
}

function isNoInclude(data) {
	return data.indexOf("<noinclude>") == 0;
}

function clearNoInclude(data) {
	var index = data.indexOf("</noinclude>");
	var size = "</noinclude>".length;
	return $.trim(data.slice(index + size));
}

function isXmlComment(data) {
	return data.indexOf("<!--") == 0;
}

function clearXmlComment(data) {
	var index = data.indexOf("-->");
	var size = "-->".length;
	return $.trim(data.slice(index + size));
}

function clearLine(data) { 
	var index = data.indexOf('\n');
	return $.trim(data.slice(index));
}
function clearDataBlock(data, startChar, endChar) {
	var j, count = 2;
	for(j = 2; j < data.length; j++) {
		if(data.charAt(j) == startChar) {
			count++
		}
		if(data.charAt(j) == endChar) {
			count--;
		}

		if(count == 0) {
			data = $.trim(data.slice(j + 1));
			return data;
		}
	}
}

function isJunk(data) {
	return 		data.indexOf("[[File:") == 0
			|| 	data.indexOf("[[Image:") == 0
			||	data.indexOf("#") != -1
			||	data.indexOf(":") != -1;
}

function MaxEdges() {
	var n = nodes.length;
	return (n*(n - 1)/2);
}

function Adjust() {
	drawing.reset_calculation();
}

function Pause() {
	drawing.stop_calculating();
}


// remove brackets and display text (only return the actual link text)
// links will come in like  [[Domestication|domesticated]]
// we need to remove the brackets and return Domestication
function cleanseLink(dirtyLink) {
	var link = dirtyLink.slice(2, -2);
	
	link = link.split("|")[0];
	link = link.rtrim();
	link = link.ltrim();
	return link;
}

// extend arrays to get unique values
Array.prototype.getUnique = function() {
	var u = {}, a = [];
	for (var i = 0, l = this.length; i < l; ++i) {
		if(this[i] in u) continue;
		a.push(this[i]);
		u[this[i]] = 1;
	}
	return a;
}

String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}