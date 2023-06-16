const got = require('got');


async function request(options) {
	try {
		if (!options) {
			options = {};
		}
		if (!options.method) {
			options.method = 'GET';
		}
		options.responseType = 'json';
		if (!options['headers']) {
			options['headers'] = {};
		}
		if (!options['headers']['TxnId']) {
			options['headers']['TxnId'] = options['headers']['data-stack-txn-id'];
		}
		if (!options['headers']['Content-Type']) {
			options['headers']['Content-Type'] = 'application/json';
		}
		const resp = await got(options);
		return { statusCode: resp.statusCode, body: resp.body, headers: resp.headers };
	} catch (err) {
		if (err.response) {
			throw { statusCode: err.response.statusCode, body: err.response.body, headers: err.response.headers };
		} else {
			throw { statusCode: 500, body: err };
		}
	}
}


module.exports.request = request;
