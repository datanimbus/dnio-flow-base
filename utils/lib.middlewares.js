const { v4: uuid } = require('uuid');


const logger = global.logger;
let e = {};


e.addHeaders = (req, res, next) => {
	logger.info(`Getting Request :: ${req.path}`);

	if (!req.headers['data-stack-txn-id']) {
		let txnId = uuid().split('-');
		req.headers['data-stack-txn-id'] = `${txnId[1]}${txnId[2]}`;
		logger.info(`No txn id found. Setting txn id to : ${req.headers['data-stack-txn-id']}`);
	}
	if (!req.headers['data-stack-remote-txn-id']) {
		req.headers['data-stack-remote-txn-id'] = `${uuid()}`;
		logger.info(`No remote txn id found. Setting remote txn id to : ${req.headers['data-stack-remote-txn-id']}`);
	}

	next();
};


module.exports = e;
