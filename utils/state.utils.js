const { v4: uuid } = require('uuid');

const config = require('../config');
const httpClient = require('../http-client');


const logger = global.logger;


function getState(req, data) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];
	const stateId = uuid();
	
	logger.debug(`[${txnId}] [${remoteTxnId}] Creating state for Flow ID :: ${data.flowId} :: Node ID :: ${data.nodeId} :: State ID :: ${stateId}`);
	logger.trace(`[${txnId}] [${remoteTxnId}] Flow ID :: ${data.flowId} :: Node ID :: ${data.nodeId} :: State ID :: ${stateId} :: Headers :: ${JSON.stringify(req.headers)}`);
	logger.trace(`[${txnId}] [${remoteTxnId}] Flow ID :: ${data.flowId} :: Node ID :: ${data.nodeId} :: State ID :: ${stateId} :: Body :: ${JSON.stringify(req.responseBody || req.body)}`);
	logger.trace(`[${txnId}] [${remoteTxnId}] Flow ID :: ${data.flowId} :: Node ID :: ${data.nodeId} :: State ID :: ${stateId} :: Query :: ${JSON.stringify(req.query)}`);


	const state = {};
	state._id = stateId;

	state.flowId = data.flowId;

	state.nodeId = data.nodeId;
	state.nodeType = data.nodeType;

	state.activityId = req.query.activityId || req.params.activityId;
	
	state.query = req.query;
	state.headers = req.headers;
	
	state.status = 'PENDING';
	state.statusCode = req.statusCode;

	state.body = req.body || req.responseBody;

	state.contentType = data.contentType || 'application/json';

	state._metadata = {
		createdAt: new Date(),
		lastUpdated: new Date(),
		deleted: false
	};


	logger.debug(`[${txnId}] [${remoteTxnId}] Created state for Flow ID :: ${data.flowId} :: Node ID :: ${data.nodeId} :: State ID :: ${stateId}`);
	logger.trace(`[${txnId}] [${remoteTxnId}] Flow ID :: ${data.flowId} :: Node ID :: ${data.nodeId} :: State ID :: ${stateId} :: State :: ${JSON.stringify(state)}`);
	return state;
}


async function upsertState(req, state) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];

	logger.debug(`[${txnId}] [${remoteTxnId}] Upserting Stage for Flow ID :: ${state.flowId} :: Node ID :: ${state.nodeId} :: State ID :: ${state._id} :: Activity ID :: ${state.activityId}`);
	logger.trace(`[${txnId}] [${remoteTxnId}] Flow ID :: ${state.flowId} :: Node ID :: ${state.nodeId} :: State ID :: ${state._id} :: Activity ID :: ${state.activityId} :: State :: ${JSON.stringify(state)}`);
	

	state._metadata.lastUpdated = new Date();

	try {
		let status = await global.appcenterDB.collection('process.activities.state').findOneAndUpdate(
			{ flowId: state.flowId, nodeId: state.nodeId, activityId: state.activityId },
			{ $set: state },
			{ upsert: true }
		);
		logger.debug(`[${txnId}] [${remoteTxnId}] Upserted State for Flow ID :: ${state.flowId} :: Node ID :: ${state.nodeId} :: State ID :: ${state._id}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] Upsert State Result for Flow ID :: ${state.flowId} :: Node ID :: ${state.nodeId} :: State ID :: ${state._id} :: ${JSON.stringify(status)}`);

	} catch (err) {
		logger.debug(`[${txnId}] [${remoteTxnId}] Error upserting State for Flow ID :: ${state.flowId} :: Node ID :: ${state.nodeId} :: State ID :: ${state._id} :: ${err}`);
	}
}


async function updateActivity(req, data) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];
	
	const activityId = req.query.activityId || req.params.activityId;
	const activityURL = `${config.baseUrlCM}/${config.app}/processflow/activities/${data.flowId}/${activityId}`;

	logger.debug(`[${txnId}] [${remoteTxnId}] Updating Activity for Flow ID :: ${data.flowId} :: Activity ID :: ${activityId}`);
	logger.debug(`[${txnId}] [${remoteTxnId}] Url for updating Activity :: ${activityURL}`);
	
	try {
		const status = await httpClient.request({
			method: 'PUT',
			url: activityURL,
			json: data,
			headers: {
				'authorization': 'JWT ' + global.CM_TOKEN
			}
		});

		logger.debug(`[${txnId}] [${remoteTxnId}] Updated Activity for Flow ID :: ${data.flowId} :: Activity ID :: ${activityId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] Activity status for Flow ID :: ${data.flowId} :: Activity ID :: ${activityId} :: ${status.statusCode}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] Activity status for Flow Id :: ${data.flowId} :: Activity ID :: ${activityId} :: ${JSON.stringify(status.body)}`);

		return true;
	} catch (err) {
		logger.error(`[${txnId}] [${remoteTxnId}] Error Updating Activity for Flow ID :: ${data.flowId} :: Activity ID :: ${activityId} :: ${err}`);
	}
}


module.exports.getState = getState;
module.exports.upsertState = upsertState;
module.exports.updateActivity = updateActivity;
