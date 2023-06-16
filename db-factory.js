const { MongoClient } = require('mongodb');

const config = require('./config');
const httpClient = require('./http-client');


const logger = global.logger;


(async () => {
	try {
		logger.info(`Connecting to Appcenter DB :: ${config.appDB}`);
		logger.trace(`Appcenter connection details :: ${JSON.stringify({ 'url': config.mongoUrl, 'options': config.mongoAppCenterOptions, 'db': config.appDB})}`);

		const client = await MongoClient.connect(config.mongoUrl, config.mongoAppCenterOptions);
		const appcenterDB = client.db(config.appDB);
		global.appcenterDB = appcenterDB;

		logger.info(`Connected to ${config.appDB} DB`);

	} catch (err) {
		logger.error(`Error connecting to Appcenter DB :: ${config.appDB} :: ${err}`);
		process.exit(0);
	}
	
	try {
		logger.info(`Sending request to CM to initialize the Process Flow :: ${config.flowId}`);

		let processFlowURL = config.baseUrlCM + '/' + config.app + '/flow/utils/' + config.flowId + '/init';

		logger.debug(`CM API call :: ${processFlowURL}`);

		const resp = await httpClient.request({
			method: 'PUT',
			url: processFlowURL,
			headers: {
				'Content-Type': 'application/json'
			}
		});

		logger.info(`CM API call status :: ${resp.statusCode}`);
		logger.trace(`CM API call response body :: ${JSON.stringify(resp.body)}`);

	} catch (err) {
		logger.error(`Unable to inform Configuration Manager :: ${JSON.stringify(err)}`);
	}
})();
