const _ = require('lodash');
const config = require('../config');


let logger = global.logger;
let flowData, api;


function parseFlow(dataJson) {

	logger.debug(`Parsing Flow :: ${dataJson._id} :: ${dataJson.name}`);
	logger.trace(`Parsing Flow :: ${JSON.stringify(dataJson)}`);

	flowData = JSON.parse(JSON.stringify(dataJson));
	const inputNode = dataJson.inputNode;
	const nodes = dataJson.nodes;
	api = '/' + dataJson.app + inputNode.options.path;
	let code = [];


	code.push('const fs = require("fs");');
	code.push('const _ = require("lodash");');
	code.push('const path = require("path");');
	code.push('const XLSX = require("xlsx");');
	code.push('const log4js = require("log4js");');
	code.push('const cron = require("node-cron");');
	code.push('const express = require("express");');
	code.push('const fastcsv = require("fast-csv");');
	code.push('const { v4: uuid } = require("uuid");');
	code.push('const fileUpload = require("express-fileupload");');
	code.push('const { XMLBuilder, J2XParser, parse, XMLParser } = require("fast-xml-parser");');
	code.push('');
	code.push('const httpClient = require("../http-client");');
	// code.push('const nodeUtils = require("../utils/node.utils");');
	// code.push('const fileUtils = require("../utils/file.utils");');
	code.push('const stateUtils = require("../utils/state.utils");');
	code.push('');
	code.push('');
	code.push('const router = express.Router({ mergeParams: true });');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('const xmlBuilder = new XMLBuilder();');
	code.push('const xmlParser = new XMLParser();');
	code.push('');
	code.push('');


	logger.debug(`Input Node Content Type :: ${inputNode?.options?.contentType}`);

	if (inputNode?.options?.contentType === 'multipart/form-data') {
		code.push(`${tab(0)}router.use(fileUpload({`);
		code.push(`${tab(1)}useTempFiles: true,`);
		code.push(`${tab(1)}tempFileDir: './uploads'`);
		code.push(`${tab(0)}}));`);
	} else if (inputNode.options && inputNode.options.contentType === 'application/xml') {
		code.push(`${tab(0)}router.use(express.raw({ type: ['application/xml'] }));`);
		code.push(`${tab(0)}router.use((req, res, next) => {`);
		code.push(`${tab(1)}if (req.get('content-type') === 'application/xml') {`);
		code.push(`${tab(2)}req.body = xmlParser.parse(req.body);`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}next();`);
		code.push(`${tab(0)}});`);
	} else {
		code.push(`${tab(0)}router.use(express.json({ inflate: true, limit: '100mb' }));`);
	}
	code.push('');
	code.push('');


	logger.debug(`Input Node Method :: ${inputNode?.options?.method}`);
	if (inputNode?.options?.method) {
		let method = inputNode?.options?.method?.toLowerCase();
		code.push(`router.${method}('${api}', handle${dataJson.name});`);

	} else {
		code.push(`router.post('${api}', handle${dataJson.name});`);
	}
	code.push('');
	code.push('');


	code.push(`async function handle${dataJson.name}(req, res) {`);
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push('');
	code.push(`${tab(1)}logger.info(\`Processing request for TxnId :: \${txnId} :: RemoteTxnId :: \${remoteTxnId}\`);`);
	code.push(`${tab(1)}logger.trace(\`[\${txnId}] [\${remoteTxnId}] Request Payload :: \${JSON.stringify(req.body)}\`);`);
	code.push('');
	code.push(`${tab(1)}let state = stateUtils.getState(req, { flowId: '${dataJson._id}', nodeId: '${inputNode._id}', nodeType: 'INPUT', contentType: '${(inputNode.options.contentType || '')}'});`);
	code.push('');
	code.push('');

	if (inputNode?.options?.contentType === 'multipart/form-data') {
		const dataFormat = dataJson.dataStructures[inputNode.dataStructure.outgoing._id] || { _id: inputNode.dataStructure.outgoing._id };

		if (dataFormat.formatType == 'XML') {
			code.push(`${tab(1)}const xmlBuilder = new XMLBuilder();`);
			code.push(`${tab(1)}const xmlParser = new XMLParser();`);
			code.push('');
			code.push('');
		}
		code.push(`${tab(1)}if (!req.files || _.isEmpty(req.files)) {`);
		code.push(`${tab(2)}logger.error(\`[\${txnId}] [\${remoteTxnId}] No files were uploaded.\`);`);
		code.push(`${tab(2)}state.status = "ERROR";`);
		code.push(`${tab(2)}state.statusCode = 400;`);
		code.push(`${tab(2)}state.body = { message: 'No files were uploaded.' };`);
		code.push('');
		code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(2)}stateUtils.updateActivity(req, { status: 'ERROR', flowId: '${dataJson._id}' });`);
		code.push('');
		code.push(`${tab(2)}return res.status(400).json({ message: 'No Files uploaded.' });`);
		code.push(`${tab(1)}}`);
		code.push('');
		code.push('');
		code.push(`${tab(1)}const reqFile = req.files.file;`);
		code.push(`${tab(1)}logger.trace(\`[\${txnId}] [\${remoteTxnId}] Request file info :: \${reqFile}\`);`);
		code.push('');
		code.push(`${tab(1)}stateUtils.updateActivity(req, { payloadMetaData: reqFile, flowId: '${dataJson._id}' });`);

		code.push('');
		code.push('');

		code.push(`${tab(1)}res.status(202).json({ message: 'File is being processed' });`);

		code.push('');


		if (!dataFormat.formatType) {
			dataFormat.formatType = 'JSON';
		}
		inputNode.dataStructure.outgoing = dataFormat;

		if (dataFormat.formatType == 'EXCEL') {
			code.push(`${tab(1)}const workBook = XLSX.readFile(reqFile.tempFilePath);`);
			code.push(`${tab(1)}XLSX.writeFile(workBook, reqFile.tempFilePath, { bookType: "csv" });`);
		}

		code.push('');
		code.push(`${tab(1)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Parsing request file to ${inputNode.options.contentType}\`);`);
		code.push('');

		if (dataFormat.formatType === 'CSV' || dataFormat.formatType == 'EXCEL') {

			let rowDelimiter = '';
			if (dataFormat.lineSeparator === '\\\\n') {
				rowDelimiter = '\\n';
			} else if (dataFormat.lineSeparator === '\\\\r\\\\n') {
				rowDelimiter = '\\r\\n';
			} else if (dataFormat.lineSeparator === '\\\\r') {
				rowDelimiter = '\\r';
			} else {
				rowDelimiter = '\\n';
			}

			code.push(`${tab(1)}const pr = await new Promise((resolve, reject) => {`);
			code.push(`${tab(2)}let records = [];`);
			code.push(`${tab(2)}const fileStream = fs.createReadStream(reqFile.tempFilePath);`);
			code.push(`${tab(2)}fastcsv.parseStream(fileStream, {`);
			code.push(`${tab(3)}headers: true,`);
			code.push(`${tab(3)}skipLines: 0,`);
			code.push(`${tab(3)}rowDelimiter: '${rowDelimiter}',`);
			code.push(`${tab(3)}delimiter: '${dataFormat.character}',`);
			if (dataFormat.strictValidation) {
				code.push(`${tab(3)}strictColumnHandling: true,`);
			} else {
				code.push(`${tab(3)}discardUnmappedColumns: true,`);
			}
			code.push(`${tab(2)}}).transform(row => {`);
			code.push(`${tab(3)}let temp = fileUtils.convertData${dataFormat._id}(row);`);
			code.push(`${tab(3)}return temp;`);
			code.push(`${tab(2)}}).on('error', err => {`);
			code.push(`${tab(3)}state.status = "ERROR";`);
			code.push(`${tab(3)}state.statusCode = 400;`);
			code.push(`${tab(3)}state.body = err;`);
			code.push(`${tab(3)}stateUtils.upsertState(req, state);`);
			code.push(`${tab(3)}reject(err);`);
			code.push(`${tab(2)}}).on('data', row => records.push(row))`);
			code.push(`${tab(2)}.on('end', rowCount => {`);
			code.push(`${tab(3)}state.totalRecords = rowCount;`);
			code.push(`${tab(3)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Parsed Data count  :: \${state.totalRecords}\`);`);
			code.push(`${tab(3)}logger.trace(\`[\${txnId}] [\${remoteTxnId}] Parsed Data :: \${JSON.stringify(state.body)}\`);`);
			code.push(`${tab(3)}resolve(records);`);
			code.push(`${tab(2)}});`);
			code.push(`${tab(1)}});`);
			code.push(`${tab(1)}`);
		} else if (dataFormat.formatType === 'JSON') {
			code.push(`${tab(1)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(1)}state.body = JSON.parse(contents);`);
		} else if (dataFormat.formatType === 'XML') {
			code.push(`${tab(1)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(1)}state.body = xmlParser.parse(contents);`);
		} else if (dataFormat.formatType === 'BINARY') {
			// code.push(`${tab(2)}fs.copyFileSync(reqFile.tempFilePath, path.join(process.cwd(), 'downloads', req['local']['output-file-name']));`);
			// code.push(`${tab(2)}}`);
			// code.push(`${tab(2)}}`);
		}

	} else if (inputNode?.options?.contentType === 'application/xml') {
		code.push(`${tab(1)}res.status(202).json({ message: 'Your requested is being processed, Please check activities for final status.' });`);
		code.push('');

		code.push(`${tab(1)}const metaData = {};`);
		code.push(`${tab(1)}if (Array.isArray(state.body)) {`);
		code.push(`${tab(2)}metaData.type = 'Array';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body && state.body[0] ? Object.keys(state.body[0]).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = state.body ? state.body.length : 0;`);
		code.push(`${tab(1)}} else {`);
		code.push(`${tab(2)}metaData.type = 'Object';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body ? Object.keys(state.body).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = 1;`);
		code.push(`${tab(1)}}`);
	} else {
		code.push(`${tab(1)}res.status(202).json({ message: 'Your requested is being processed, Please check activities for final status.' });`);
		code.push('');

		code.push(`${tab(1)}const metaData = {};`);
		code.push(`${tab(1)}if (Array.isArray(state.body)) {`);
		code.push(`${tab(2)}metaData.type = 'Array';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body && state.body[0] ? Object.keys(state.body[0]).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = state.body ? state.body.length : 0;`);
		code.push(`${tab(1)}} else {`);
		code.push(`${tab(2)}metaData.type = 'Object';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body ? Object.keys(state.body).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = 1;`);
		code.push(`${tab(1)}}`);
	}

	code.push('');
	code.push(`${tab(1)}state.statusCode = 200;`);
	code.push(`${tab(1)}state.status = 'SUCCESS';`);
	code.push('');
	code.push(`${tab(1)}stateUtils.upsertState(req, state);`);
	code.push(`${tab(1)}stateUtils.updateActivity(req, { payloadMetaData: metaData, flowId: '${dataJson._id}' });`);
	code.push('');

	logger.debug(`Nodes Length :: ${nodes.length}`);
	if (nodes.length > 0) {
		nodes.forEach(node => {
			if (node.type === 'SYSTEM') {
				code.push(`${tab(1)}return await ${dataJson.name}${node._id}(req, null);`);
				code.push('}');

				code.push('');
				code.push('');

				generateSystemNode(code, node);

			} else if (node.type === 'TRIGGER') {
				code.push(`${tab(1)}return;`);
				code.push('}');

				code.push('');
				code.push('');

				generateTriggerNode(code, node);

			} else if (node.type === 'USER') {
				code.push(`${tab(1)}return await ${dataJson.name}${node._id}(req, null);`);
				code.push('}');

				code.push('');
				code.push('');
			}
		});
	}
	code.push(`${tab(1)}stateUtils.updateActivity(req, { status: 'SUCCESS', flowId: '${dataJson._id}' });`);
	code.push('');
	code.push(`${tab(1)}return;`);
	code.push('}');


	code.push('');
	code.push('');
	code.push('module.exports = router;');
	code.push('');

	return code.join('\n');
}


function generateSystemNode(code, node) {

	code.push(`async function ${flowData.name}${node._id}(req, res) {`);
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push('');
	code.push(`${tab(1)}logger.info(\`[\${txnId}] [\${remoteTxnId}] Processing Flow ID :: ${flowData._id} :: NodeID :: ${node._id}\`);`);
	code.push('');
	code.push('');
	code.push(`${tab(1)}let state = stateUtils.getState(req, { flowId: '${flowData._id}', nodeId: '${node._id}', nodeType: 'SYSTEM', contentType: '${(node?.api?.contentType || '')}'});`);
	code.push('');
	code.push(`${tab(1)}stateUtils.upsertState(req, state);`);
	code.push('');
	code.push('');
	code.push(`${tab(1)}try {`)

	code.push(`${tab(2)}const options = {};`);
	code.push(`${tab(2)}options.url = \`${node?.api?.endpoint}\`;`);
	code.push(`${tab(2)}options.headers = ${JSON.stringify(node?.api?.headers || {})};`);
	code.push(`${tab(2)}options.method = '${node?.api?.method}';`);
	if (node.api.method == 'POST' || node.api.method == 'PUT') {
		code.push(`${tab(2)}options.body = ${JSON.stringify(node?.api?.body || {})};`);
	}
	code.push(`${tab(2)}options.timeout = ${node?.api?.timeout || 60000};`);

	if (node?.api?.type === 'External') {
		code.push(``);
		code.push(`${tab(2)}let resp = await httpClient.request(options);`);
		code.push(``);
		code.push(`${tab(2)}req.body = resp.body;`);
		code.push(`${tab(2)}req.statusCode = resp.statusCode;`);
		code.push(``);
		code.push(`${tab(2)}return await handle${flowData.name}${node._id}(req, null);`);

	} else if (node?.api?.type === 'DataPipe') {
		code.push(`${tab(2)}options.insert = ${node?.api?.insert || false};`);
		code.push(``);
		code.push(`${tab(2)}httpClient.request(options);`);
		code.push(``);
		code.push(`${tab(2)}return;`);
	}

	code.push(`${tab(1)}} catch(err) {`);
	code.push(`${tab(2)}logger.error(\`Error invoking System Node :: \${err}\`);`)
	code.push(`${tab(2)}state.status = "ERROR";`);
	code.push(`${tab(2)}state.statusCode = err.statusCode;`);
	code.push(`${tab(2)}state.body = { message: err.body?.message || err };`);
	code.push('');
	code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
	code.push(`${tab(2)}stateUtils.updateActivity(req, { status: 'ERROR', flowId: '${flowData._id}' });`);
	code.push(`${tab(1)}}`);
	code.push(`}`);
	code.push('');
	code.push('');

	code.push(`router.post('${api}/${node._id}/:activityId', handle${flowData.name}${node._id});`);
	code.push(``);
	code.push(``);
	code.push(`async function handle${flowData.name}${node._id}(req, res) {`);
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push('');
	code.push(`${tab(1)}if (!res.headersSent) {`);
	code.push(`${tab(2)}res.status(202).json({ message: 'Your requested is being processed, Please check activities for final status.' });`);
	code.push(`${tab(1)}}`);
	code.push('');
	code.push(`${tab(1)}logger.info(\`[\${txnId}] [\${remoteTxnId}] Processing Flow ID :: ${flowData._id} :: NodeID :: ${node._id}\`);`);
	code.push('');
	code.push('');
	code.push(`${tab(1)}let state = stateUtils.getState(req, { flowId: '${flowData._id}', nodeId: '${node._id}', nodeType: 'SYSTEM', contentType: '${(node?.api?.contentType || '')}'});`);
	code.push(`${tab(1)}delete state._id;`);
	code.push(`${tab(1)}state.status = 'SUCCESS';`);
	code.push('');
	code.push(`${tab(1)}stateUtils.upsertState(req, state);`);
	code.push('');
}


function generateTriggerNode(code, node) {

	code.push(`router.post('${api}/${node._id}/:activityId', handle${flowData.name}${node._id});`);
	code.push(``);
	code.push(``);

	code.push(`async function handle${flowData.name}${node._id}(req, res) {`);
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push('');
	code.push(`${tab(1)}res.status(202).json({ message: 'Your requested is being processed, Please check activities for final status.' });`);
	code.push('');
	code.push(`${tab(1)}logger.info(\`[\${txnId}] [\${remoteTxnId}] Processing Flow ID :: ${flowData._id} :: NodeID :: ${node._id}\`);`);
	code.push('');
	code.push('');
	code.push(`${tab(1)}let state = stateUtils.getState(req, { flowId: '${flowData._id}', nodeId: '${node._id}', nodeType: 'TRIGGER', contentType: '${(node?.api?.contentType || '')}'});`);
	code.push(`${tab(1)}state.status = 'SUCCESS';`);
	code.push('');
	code.push('');
	code.push(`${tab(1)}stateUtils.upsertState(req, state);`);
}


function tab(len) {
	let d = '';
	while (len > 0) {
		d += '\t';
		len--;
	}
	return d;
}


module.exports.parseFlow = parseFlow;
