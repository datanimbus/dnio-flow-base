const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const codeGen = require('../generator/code.generator');
const flowJSON = require('./sample.json');

// const stages = codeGen.parseFlow(sampleJSON);
const code = codeGen.parseFlow(flowJSON);


(async () => {
	console.log('Testing');
	// const nodeUtilsContent = await codeGen.parseNodes(flowJSON);
	if (!fs.existsSync(path.join(process.cwd(), 'router'))) {
		mkdirp.sync(path.join(process.cwd(), 'router'));
	}
	fs.writeFileSync(path.join(process.cwd(), 'router', 'route.js'), codeGen.parseFlow(flowJSON));
	// writeFileSync('../node.utils.js', nodeUtilsContent);
	// writeFileSync('../file.utils.js', codeGen.parseDataStructuresForFileUtils(flowJSON));
	// writeFileSync('../validation.utils.js', codeGen.parseDataStructures(flowJSON));
	// writeFileSync('../flow.json', JSON.stringify(flowJSON));
})();