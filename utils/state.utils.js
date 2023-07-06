const { v4: uuid } = require('uuid');

const config = require('../config');
const httpClient = require('../http-client');


const logger = global.logger;


function getState(req, data) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];
	const stateId = uuid();

	try {
		logger.debug(`[${txnId}] [${remoteTxnId}] Creating state for FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId} :: Headers :: ${JSON.stringify(req.headers)}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId} :: Body :: ${JSON.stringify(req.responseBody || req.body)}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId} :: Query :: ${JSON.stringify(req.query)}`);


		const state = {};
		state._id = stateId;

		state.flowId = data.flowId;

		state.nodeId = data.nodeId;
		state.flowNodeId = data.flowNodeId;
		state.nodeType = data.nodeType;

		state.activityId = req.query.activityId || req.params.activityId;

		state.query = req.query;
		state.params = req.params;
		state.headers = req.headers;
		state.contentType = data.contentType || 'application/json';

		state.status = 'PENDING';
		state.statusCode = req.statusCode || null;

		state.body = req.body || {};
		state.responseBody = req.responseBody || null;


		state._metadata = {
			createdAt: new Date(),
			lastUpdated: new Date(),
			deleted: false
		};


		logger.debug(`[${txnId}] [${remoteTxnId}] Created state for FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId} :: State :: ${JSON.stringify(state)}`);

		return state;
	} catch (err) {
		logger.error(`[${txnId}] [${remoteTxnId}] Error creating state data for FlowID :: ${data.flowId} :: NodeID :: ${data.nodeId} :: ${err}`);
		throw err;
	}
}


async function upsertState(req, state) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];

	logger.debug(`[${txnId}] [${remoteTxnId}] Upserting Stage for FlowID :: ${state.flowId} :: NodeID :: ${state.nodeId} :: ActivityID :: ${state.activityId}`);
	logger.trace(`[${txnId}] [${remoteTxnId}] FlowID :: ${state.flowId} :: NodeID :: ${state.nodeId} :: ActivityID :: ${state.activityId} :: State :: ${JSON.stringify(state)}`);


	state._metadata.lastUpdated = new Date();

	try {
		let status = await global.appcenterDB.collection('process.activities.state').findOneAndUpdate(
			{ flowId: state.flowId, nodeId: state.nodeId, activityId: state.activityId },
			{ $set: state },
			{ upsert: true }
		);
		logger.debug(`[${txnId}] [${remoteTxnId}] Upserted State for FlowID :: ${state.flowId} :: NodeID :: ${state.nodeId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] Upsert State Result for FlowID :: ${state.flowId} :: NodeID :: ${state.nodeId} :: ${JSON.stringify(status)}`);

	} catch (err) {
		logger.debug(`[${txnId}] [${remoteTxnId}] Error upserting State for FlowID :: ${state.flowId} :: NodeID :: ${state.nodeId} :: ${err}`);
		throw err;
	}
}


async function updateActivity(req, data) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];

	const activityId = req.query.activityId || req.params.activityId;
	const activityURL = `${config.baseUrlCM}/${config.app}/processflow/activities/${data.flowId}/${activityId}`;

	logger.debug(`[${txnId}] [${remoteTxnId}] Updating Activity for FlowID :: ${data.flowId} :: ActivityID :: ${activityId}`);
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

		logger.debug(`[${txnId}] [${remoteTxnId}] Updated Activity for FlowID :: ${data.flowId} :: ActivityID :: ${activityId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] Activity status for FlowID :: ${data.flowId} :: ActivityID :: ${activityId} :: ${status.statusCode}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] Activity status for FlowID :: ${data.flowId} :: ActivityID :: ${activityId} :: ${JSON.stringify(status.body)}`);

		return true;
	} catch (err) {
		logger.error(`[${txnId}] [${remoteTxnId}] Error Updating Activity for FlowID :: ${data.flowId} :: ActivityID :: ${activityId} :: ${err}`);
		throw err;
	}
}


module.exports.getState = getState;
module.exports.upsertState = upsertState;
module.exports.updateActivity = updateActivity;
