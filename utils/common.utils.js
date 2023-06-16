const fs = require('fs');
var zlib = require('zlib');
const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const mongoose = require('mongoose');
const Client = require('ssh2-sftp-client');
const { writeToPath } = require('fast-csv');

const config = require('./config');
const httpClient = require('./http-client');


const ALGORITHM = 'aes-256-gcm';
const logger = global.logger;


async function getDataService(serviceId) {
	try {
		const options = {};
		options.url = `${config.baseUrlSM}/${config.app}/service/${serviceId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}


async function getFlow(flowId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/flow/${flowId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getFaaS(faasId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/faas/${faasId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

// async function getConnector(connectorId) {
// 	try {
// 		const options = {};
// 		options.url = `${config.baseUrlUSR}/${config.app}/connector/${connectorId}`;
// 		options.method = 'GET';
// 		options.headers = {};
// 		options.headers['Content-Type'] = 'application/json';
// 		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
// 		const response = await httpClient.request(options);
// 		if (response.statusCode !== 200) {
// 			throw response.body;
// 		}
// 		return response.body;
// 	} catch (err) {
// 		logger.error(err);
// 		throw err;
// 	}
// }


// async function getAllFormulas() {
// 	try {
// 		let options = {};
// 		options.url = `${config.baseUrlUSR}/admin/metadata/mapper/formula/count`;
// 		options.method = 'GET';
// 		options.headers = {};
// 		options.headers['Content-Type'] = 'application/json';
// 		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
// 		let response = await httpClient.request(options);
// 		if (response.statusCode !== 200) {
// 			throw response.body;
// 		}
// 		options = {};
// 		options.url = `${config.baseUrlUSR}/admin/metadata/mapper/formula?count=` + response.body;
// 		options.method = 'GET';
// 		options.headers = {};
// 		options.headers['Content-Type'] = 'application/json';
// 		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
// 		response = await httpClient.request(options);
// 		if (response.statusCode !== 200) {
// 			throw response.body;
// 		}
// 		return response.body;
// 	} catch (err) {
// 		logger.error(err);
// 		throw err;
// 	}
// }

// async function sftpFetchFile(configData) {
// 	let sftp = new Client();
// 	try {
// 		const options = {};
// 		options.host = configData.host;
// 		options.port = configData.port;
// 		options.username = configData.username;
// 		if (configData.authType == 'password') {
// 			options.password = configData.password;
// 		} else if (configData.authType == 'publickey') {
// 			options.privateKey = configData.privateKey;
// 			options.passphrase = configData.passphrase;
// 		}
// 		let filePath;
// 		await sftp.connect(options);
// 		if (configData.filePattern) {
// 			const fileName = configData.filePattern;
// 			filePath = path.join(__dirname, 'SFTP-Files', fileName);
// 			await sftp.fastGet(configData.directoryPath + '/' + configData.filePattern, filePath);
// 		} else {
// 			const fileList = await sftp.list(configData.directoryPath);
// 			const fileName = fileList[0].name;
// 			filePath = path.join(__dirname, 'SFTP-Files', fileName);
// 			await sftp.fastGet(configData.directoryPath + '/' + fileName, filePath);
// 		}
// 		return filePath;
// 	} catch (err) {
// 		logger.error(err);
// 		throw err;
// 	} finally {
// 		sftp.end();
// 	}
// }

// async function sftpPutFile(configData, filePath) {
// 	let sftp = new Client();
// 	try {
// 		const options = {};
// 		options.host = configData.host;
// 		options.port = configData.port;
// 		options.username = configData.user;
// 		if (configData.authType == 'password') {
// 			options.password = configData.password;
// 		} else if (configData.authType == 'publickey') {
// 			options.privateKey = configData.privateKey;
// 			options.passphrase = configData.passphrase;
// 		}
// 		await sftp.connect(options);
// 		if (!configData.directoryPath) {
// 			throw new Error('No Directory Path provided');
// 		}
// 		if (!configData.fileName) {
// 			throw new Error('No File Name provided');
// 		}
// 		const temp = await sftp.fastPut(filePath, configData.directoryPath + '/' + configData.fileName);
// 		logger.info(temp);
// 		return filePath;
// 	} catch (err) {
// 		logger.error(err);
// 		throw err;
// 	} finally {
// 		sftp.end();
// 	}
// }


// function convertToBoolean(value) {
// 	if (typeof value === 'string' && ['true', 't', 'TRUE', 'yes'].indexOf(value) > -1) {
// 		return true;
// 	}
// 	if (typeof value === 'boolean') {
// 		return value;
// 	}
// 	if (typeof value === 'number') {
// 		return value != 0;
// 	}
// 	return false;
// }


// function convertToDate(value, format) {
// 	if (typeof value === 'string') {
// 		try {
// 			return moment(value, format, false).toISOString();
// 		} catch (err) {
// 			logger.error('unable to parse Date with format:', format);
// 			logger.error(err);
// 			return value;
// 		}
// 	}
// 	return value;
// }


// function writeDataToCSV(filepath, data, headers) {
// 	return new Promise((resolve, reject) => {
// 		writeToPath(filepath, data, { headers }).on('error', err => {
// 			logger.error(err);
// 			reject(err);
// 		})
// 			.on('finish', resolve);
// 	});
// }

// function writeDataToXLS(filepath, data, headers) {
// 	return new Promise((resolve, reject) => {
// 		writeToPath(filepath, data, { headers }).on('error', err => {
// 			logger.error(err);
// 			reject(err);
// 		})
// 			.on('finish', resolve);
// 	});
// }

// function handleError(err, state, req, node) {
// 	state.error = err;
// 	if (err.statusCode) {
// 		state.statusCode = err.statusCode;
// 	} else {
// 		state.statusCode = 500;
// 	}
// 	if (err.status) {
// 		state.responseStatus = err.status;
// 	} else {
// 		state.responseStatus = 'ERROR';
// 	}
// 	if (err.body) {
// 		state.responseBody = err.body;
// 		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.body);
// 	} else if (err.message) {
// 		state.responseBody = { message: err.message };
// 		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.message);
// 	} else {
// 		state.responseBody = err;
// 		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err);
// 	}
// 	state.status = 'ERROR';
// }

// function handleResponse(response, state, req, node) {
// 	logger.trace('Handle Response - ', JSON.stringify(response, null, 4));
// 	if (!response.statusCode) {
// 		response.statusCode = 200;
// 	}
// 	state.statusCode = response.statusCode;
// 	state.responseBody = response.body;
// 	state.headers = response.headers;
// 	if (response && response.statusCode != 200) {
// 		state.status = 'ERROR';
// 		state.statusCode = response && response.statusCode ? response.statusCode : 400;
// 		state.responseBody = response && response.body ? response.body : { message: 'Unable to reach the URL' };
// 	} else {
// 		state.status = 'SUCCESS';
// 		state.statusCode = 200;
// 	}
// }

// function handleValidation(errors, state, req, node) {
// 	if (errors && !_.isEmpty(errors)) {
// 		state.status = 'ERROR';
// 		state.statusCode = 400;
// 		state.responseBody = { message: errors };
// 	}
// }

// async function uploadFileToDB(req, uploadFilePath, targetAgentId, targetAgentName, flowName, deploymentName, outputFileName) {
// 	try {
// 		const appcenterCon = mongoose.createConnection(config.mongoUrl, config.mongoAppCenterOptions);
// 		appcenterCon.on('connecting', () => { logger.info(' *** Appcenter DB CONNECTING *** '); });
// 		appcenterCon.on('disconnected', () => { logger.error(' *** Appcenter DB LOST CONNECTION *** '); });
// 		appcenterCon.on('reconnect', () => { logger.info(' *** Appcenter DB RECONNECTED *** '); });
// 		appcenterCon.on('connected', () => { logger.info('Connected to Appcenter DB DB'); global.appcenterCon = appcenterCon; });
// 		appcenterCon.on('reconnectFailed', () => { logger.error(' *** Appcenter DB FAILED TO RECONNECT *** '); });

// 		const dbname = config.DATA_STACK_NAMESPACE + '-' + config.app;
// 		const dataDB = appcenterCon.useDb(dbname);
// 		const gfsBucket = new mongoose.mongo.GridFSBucket(dataDB, { bucketName: 'b2b.files' });

// 		logger.info(`Uploading file ${outputFileName} from flow ${config.flowId} to DB`);

// 		const downloadFilePath = path.join(__dirname, 'downloads', outputFileName);
// 		let writeStream = fs.createWriteStream(downloadFilePath);

// 		const fileData = fs.readFileSync(uploadFilePath);
// 		const encryptedData = encryptDataGCM(fileData, config.encryptionKey);
// 		writeStream.write(encryptedData);

// 		const fileDetails = await new Promise((resolve, reject) => {
// 			fs.createReadStream(downloadFilePath).
// 				pipe(gfsBucket.openUploadStream(crypto.createHash('md5').update(uuid()).digest('hex'))).
// 				on('error', function (error) {
// 					logger.error(`Error uploading file - ${error}`);
// 					reject(error);
// 				}).
// 				on('finish', function (file) {
// 					logger.debug('Successfully uploaded file to DB');
// 					logger.trace(`File details - ${JSON.stringify(file)}`);
// 					resolve(file);
// 				});
// 		});

// 		logger.info('Requesting BM to update the agent download action');
// 		const options = {};
// 		options.url = `${config.baseUrlBM}/${config.app}/agent/utils/${targetAgentId}/agentAction`;
// 		options.method = 'POST';
// 		options.headers = {};
// 		options.headers['Content-Type'] = 'application/json';
// 		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
// 		options.headers['Action'] = 'download';

// 		const metaDataInfo = {};
// 		metaDataInfo.originalFileName = outputFileName;
// 		metaDataInfo.remoteTxnID = req.header('data-stack-remote-txn-id');
// 		metaDataInfo.dataStackTxnID = req.header('data-stack-txn-id');
// 		metaDataInfo.fileID = fileDetails.filename;
// 		metaDataInfo.totalChunks = '1';
// 		metaDataInfo.downloadAgentID = targetAgentId;

// 		const eventDetails = {
// 			'agentId': targetAgentId,
// 			'app': config.app,
// 			'agentName': targetAgentName,
// 			'flowName': flowName,
// 			'flowId': config.flowId,
// 			'deploymentName': deploymentName,
// 			'timestamp': new Date(),
// 			'sentOrRead': false
// 		};

// 		const payload = {
// 			'metaDataInfo': metaDataInfo,
// 			'eventDetails': eventDetails
// 		};

// 		options.json = payload;
// 		const response = await httpClient.request(options);
// 		if (response.statusCode !== 200) {
// 			throw response.body;
// 		}
// 		return fileDetails;
// 	} catch (err) {
// 		logger.error(err);
// 		throw err;
// 	}
// }

// function createHash(key) {
// 	const encodedString = crypto.createHash('md5').update(key).digest('hex');
// 	return encodedString;
// }

// function compress(data) {
// 	const deflated = zlib.deflateSync(data);
// 	return deflated;
// }

// function encryptDataGCM(data, key) {
// 	const compressedData = compress(Buffer.from(data));
// 	const hashedkey = createHash(key);
// 	const nonce = crypto.randomBytes(12);
// 	var cipher = crypto.createCipheriv(ALGORITHM, hashedkey, nonce);
// 	const encrypted = Buffer.concat([nonce, cipher.update(Buffer.from(compressedData).toString('base64')), cipher.final(), cipher.getAuthTag()]);
// 	return Buffer.from(encrypted).toString('base64');
// }

module.exports.getDataService = getDataService;
module.exports.getFlow = getFlow;
module.exports.getFaaS = getFaaS;
// module.exports.getConnector = getConnector;
// module.exports.convertToBoolean = convertToBoolean;
// module.exports.convertToDate = convertToDate;
// module.exports.handleError = handleError;
// module.exports.handleResponse = handleResponse;
// module.exports.handleValidation = handleValidation;
// module.exports.sftpFetchFile = sftpFetchFile;
// module.exports.sftpPutFile = sftpPutFile;
// module.exports.writeDataToCSV = writeDataToCSV;
// module.exports.writeDataToXLS = writeDataToXLS;
// module.exports.uploadFileToDB = uploadFileToDB;
// module.exports.getAllFormulas = getAllFormulas;
