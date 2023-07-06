const _ = require('lodash');
const config = require('../config');


let logger = global.logger;

function parseDataStructures(dataJson) {
    logger.debug(`Parsing Flow Data Structures :: ${dataJson._id} :: ${dataJson.name}`);
	logger.trace(`Parsing Flow Data Structures :: ${JSON.stringify(dataJson.dataStructure)}`);

	const code = [];
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const Ajv = require(\'ajv\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	code.push('const ajv = new Ajv();');
	code.push('const logger = global.logger;');
	code.push('');
    code.push('');

	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {

		Object.keys(dataJson.dataStructures).forEach(schemaID => {

			code.push(`let schema_${schemaID} = fs.readFileSync(\`./schemas/${schemaID}.schema.json\`).toString();`);
			code.push(`schema_${schemaID} = JSON.parse(schema_${schemaID});`);
			code.push(`const validate_${schemaID} = ajv.compile(schema_${schemaID});`);
            code.push('');
            code.push('');
		});
	}
	return _.concat(code, generateDataStructures(dataJson.inputNode, dataJson.nodes)).join('\n');
}

function generateDataStructures(node, nodes) {
	let code = [];
	const exportsCode = [];
	let schemaID;
	if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
		schemaID = (node.dataStructure.outgoing._id);
	}
	const functionName = 'validate_structure_' + node._id;
	
    exportsCode.push(`module.exports.${functionName} = ${functionName};`);
    exportsCode.push('');

	code.push(`function ${functionName}(req, data) {`);
	if (schemaID) {
		code.push(`${tab(1)}const errors = {};`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Data Structure ${(node._id)} Node\`);`);
		code.push(`${tab(1)}if (Array.isArray(data)) {`);
		code.push(`${tab(2)}for (let i=0;i<data.length;i++) {`);
		code.push(`${tab(3)}const item = data[i];`);
		code.push(`${tab(3)}const valid = validate_${schemaID}(item);`);
		code.push(`${tab(3)}if (!valid) errors[i] = ajv.errorsText(validate_${schemaID}.errors);`);
		code.push(`${tab(2)}}`);
		code.push(`${tab(1)}} else {`);
		code.push(`${tab(2)}const valid = validate_${schemaID}(data);`);
		code.push(`${tab(2)}if (!valid) errors['0'] = ajv.errorsText(validate_${schemaID}.errors);`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}if (!_.isEmpty(errors)) {`);
		code.push(`${tab(2)}throw errors;`);
		code.push(`${tab(1)}}`);
	} else {
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] No Data Structure found for ${(node._id)} Node\`);`);
	}
	code.push(`${tab(1)}return null;`);
	code.push('}');
    code.push('');
    code.push('');
	// let tempNodes = (node.onSuccess || []);
	// for (let index = 0; index < tempNodes.length; index++) {
	// 	const ss = tempNodes[index];
	// 	const nextNode = nodes.find(e => e._id === ss._id);
	// 	if (visitedValidation.indexOf(nextNode._id) > -1) {
	// 		return;
	// 	}
	// 	visitedValidation.push(nextNode._id);
	// 	code = code.concat(generateDataStructures(nextNode, nodes));
	// }
	return _.concat(code, exportsCode).join('\n');
}


function tab(len) {
	let d = '';
	while (len > 0) {
		d += '\t';
		len--;
	}
	return d;
}


module.exports.parseDataStructures = parseDataStructures;
