if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const express = require('express');
const JWT = require('jsonwebtoken');

const config = require('./config');
const httpClient = require('./http-client');
const codeGen = require('./generator/index');


const logger = global.logger;
const token = JWT.sign({ name: 'DS_CM', _id: 'admin', isSuperAdmin: true }, config.RBAC_JWT_KEY);
global.CM_TOKEN = token;


if (!config.flowId) {
	logger.error(`No Process Flow ID available. Shutting Down.`)
	process.exit(1);
}


let url = config.baseUrlCM + '/' + config.app + '/processflow/' + config.flowId;
logger.info(`Requesting CM for Process Flow data :: ${url}`);


(async () => {
	try {
		let res = await httpClient.request({
			url: url,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'JWT ' + token
			}
		});

		logger.info(`Reponse code :: ${res.statusCode}`);
		if (res.statusCode !== 200) {
			throw res.body;
		}

		const flowData = JSON.parse(JSON.stringify(res.body));

		let nodeIds = _.map(flowData.nodes, e => e.nodeId);

		let nodeUrl = `${config.baseUrlCM}/${config.app}/processnode?filter={ "_id": { "$in": ["${nodeIds.join('","')}"] } }`;

		let nodeRes = await httpClient.request({
			url: nodeUrl,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'JWT ' + token
			}
		});

		nodeIds.forEach(e => {
			let node = _.find(nodeRes.body, n => n._id == e);

			let index = _.findIndex(flowData.nodes, n => n.nodeId == e);

			flowData.nodes[index].type = node.type;
			flowData.nodes[index].name = node.name;
			flowData.nodes[index].app = node.app;
			flowData.nodes[index].api = node.api;
			flowData.nodes[index].dataStructure = node.dataStructure;
		});

		config.appNamespace = flowData.namespace;
		config.imageTag = flowData._id + ':' + flowData.version;
		config.appDB = config.DATA_STACK_NAMESPACE + '-' + flowData.app;
		config.port = flowData.port || config.port;

		try {
			await codeGen.createProject(flowData);
			initialize();
		} catch (err) {
			logger.error(`Error Creating Files for Flow :: ${config.flowId} :: ${JSON.stringify(err)}`);
		}

	} catch (err) {
		logger.error(`Error connecting to CM :: ${JSON.stringify(err)}`);
	}
})();


async function initialize() {
	try {
		require('./db-factory.js');

		global.promises = [];

		const app = express();

		const middlewares = require('./utils/lib.middlewares');

		app.use(express.urlencoded({ extended: true }));
		app.use(middlewares.addHeaders);

		// app.get('/api/b2b/internal/export/route', async function (req, res) {
		// 	let content = fs.readFileSync(path.join(__dirname, 'route.js'), 'utf-8');
		// 	res.json({ content });
		// });

		app.use('/api/b2b/internal/health/ready', async function (req, res) {
			try {
				if (global.appcenterDB) {
					return res.status(200).json({ message: 'Alive' });
				}
				return res.status(400).json({ message: 'DB Not Connected' });
			} catch (err) {
				logger.error(err);
				return res.status(500).json({ message: err.message });
			}
		});

		app.use('/api/flows', require('./router/route.js'));

		const server = app.listen(config.port, function () {
			logger.info(`Server Listening on port :: ${config.port}`);
		});


		let timeout = config.serverTimeout || 60;
		if (typeof timeout == 'string') {
			timeout = parseInt(timeout, 10);
		}
		server.setTimeout(timeout * 1000);


		process.on('SIGTERM', () => {
			try {
				logger.info('+++++ Server Kill Request Recieved +++++');

				// Handle Request for 15 sec then stop recieving
				setTimeout(() => {
					global.stopServer = true;
				}, 15000);

				const intVal = setInterval(() => {

					// Waiting For all pending requests to finish;
					if (global.activeRequest === 0) {

						// Closing Express Server;
						server.close(() => {

							// Waiting For all DB Operations to finish;
							Promise.all(global.dbPromises).then(() => {
								logger.info('Server Stopped.');
								process.exit(0);
							}).catch(err => {
								logger.error(err);
								process.exit(0);
							});
						});
						clearInterval(intVal);
					} else {
						logger.info(`Waiting for request to complete, Active Requests :: ${global.activeRequest}`);
					}
				}, 2000);
			} catch (e) {
				logger.error(`Error stopping server :: ${e}`);
				throw e;
			}
		});
	} catch (err) {
		logger.error(`Error starting server :: ${err}`);
		process.exit(0);
	}
}
