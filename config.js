if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const log4js = require('log4js');

const dataStackUtils = require('@appveen/data.stack-utils');


let LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOGGER_NAME = isK8sEnv() ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}] [PROCESS-FLOW ${process.env.DATA_STACK_PROCESS_FLOW_ID}]` : `[PROCESS-FLOW ${process.env.DATA_STACK_PROCESS_FLOW_ID}]`;

if (process.env.NODE_ENV !== 'production') LOG_LEVEL = 'trace';

log4js.configure({
	appenders: { out: { type: 'stdout', layout: { type: 'basic' } } },
	categories: { default: { appenders: ['out'], level: LOG_LEVEL } }
});

const logger = log4js.getLogger(LOGGER_NAME);

const DATA_STACK_NAMESPACE = process.env.DATA_STACK_NAMESPACE || 'appveen';


global.loggerName = LOGGER_NAME;
global.logger = logger;
global.userHeader = 'user';
global.txnIdHeader = 'txnid';
global.trueBooleanValues = ['y', 'yes', 'true', '1'];
global.falseBooleanValues = ['n', 'no', 'false', '0'];


logger.info(`DATA_STACK_APP_DB :: ${process.env.DATA_DB}`);
logger.info(`DATA_STACK_APP_NAME :: ${process.env.DATA_STACK_APP}`);
logger.info(`DATA_STACK_NAMESPACE :: ${DATA_STACK_NAMESPACE}`);
logger.info(`DATA_STACK_FLOW_NAMESPACE :: ${process.env.DATA_STACK_FLOW_NAMESPACE}`);
logger.info(`DATA_STACK_PROCESS_FLOW_ID :: ${process.env.DATA_STACK_PROCESS_FLOW_ID}`);

logger.info(`NODE_ENV :: ${process.env.NODE_ENV}`);

logger.info(`LOG_LEVEL :: ${LOG_LEVEL}`);
logger.info(`LOGGER_NAME :: ${LOGGER_NAME}`);

logger.info(`KUBERNETES_SERVICE_HOST :: ${process.env.KUBERNETES_SERVICE_HOST}`);
logger.info(`KUBERNETES_SERVICE_PORT :: ${process.env.KUBERNETES_SERVICE_PORT}`);


if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
    dataStackUtils.kubeutil.check()
        .then(
            () => logger.info('Connection to Kubernetes APi server successful!'),
            _e => {
                logger.error('ERROR :: Unable to connect to Kubernetes API server');
                logger.log(_e.message);
            });
}


function isK8sEnv() {
	return process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT;
}


if (isK8sEnv()) {
    logger.info('*** K8s environment detected ***');
    logger.info(`Image version :: ${process.env.IMAGE_TAG}`);
} else {
    logger.info('*** Local environment detected ***');
}


function get(_service) {
	if (isK8sEnv()) {
		if (_service == 'bm') return `http://bm.${DATA_STACK_NAMESPACE}`;
		if (_service == 'cm') return `http://cm.${DATA_STACK_NAMESPACE}`;
		if (_service == 'common') return `http://common.${DATA_STACK_NAMESPACE}`;
		if (_service == 'gw') return `http://gw.${DATA_STACK_NAMESPACE}`;
		if (_service == 'mon') return `http://mon.${DATA_STACK_NAMESPACE}`;
		if (_service == 'ne') return `http://ne.${DATA_STACK_NAMESPACE}`;
		if (_service == 'sm') return `http://sm.${DATA_STACK_NAMESPACE}`;
		if (_service == 'user') return `http://user.${DATA_STACK_NAMESPACE}`;
		
	} else {
		if (_service == 'bm') return 'http://localhost:10011';
		if (_service == 'cm') return 'http://localhost:11011';
		if (_service == 'common') return 'http://localhost:3000';
		if (_service == 'gw') return 'http://localhost:9080';
		if (_service == 'mon') return 'http://localhost:10005';
		if (_service == 'ne') return 'http://localhost:10010';
		if (_service == 'sm') return 'http://localhost:10003';
		if (_service == 'user') return 'http://localhost:10004';
	}
}


if (isK8sEnv() && !DATA_STACK_NAMESPACE) throw new Error('DATA_STACK_NAMESPACE not found. Please check your configMap');


module.exports = {
	imageTag: process.env.IMAGE_TAG || 'dev',
    hostname: process.env.HOSTNAME,
    release: process.env.RELEASE,

	port: process.env.PORT || 8080,
	httpsPort: process.env.HTTPS_PORT || 8443,

	baseUrlBM: get('bm') + '/bm',
    baseUrlCM: get('cm') + '/cm',
    baseUrlCommon: get('common') + '/common',
    baseUrlGW: get('gw') + '/gw',
    baseUrlMON: get('mon') + '/mon',
    baseUrlNE: get('ne') + '/ne',
    baseUrlSM: get('sm') + '/sm',
    baseUrlUSR: get('user') + '/rbac',
	
	maxHeapSize: process.env.NODE_MAX_HEAP_SIZE || '4096',
	isK8sEnv: isK8sEnv,

	logQueueName: 'systemService',
	queueName: 'webHooks',
	activityLogQueueName: 'activitiesLogs',
    activityQueueName: 'activities',
	
	app: process.env.DATA_STACK_APP || 'Adam',
	appDB: process.env.DATA_DB || 'datastackB2B',
	appNamespace: process.env.DATA_STACK_FLOW_NAMESPACE,
	flowId: process.env.DATA_STACK_PROCESS_FLOW_ID,
	DATA_STACK_NAMESPACE,
	
	TOKEN_SECRET: process.env.TOKEN_SECRET || 'u?5k167v13w5fhjhuiweuyqi67621gqwdjavnbcvadjhgqyuqagsduyqtw87e187etqiasjdbabnvczmxcnkzn',
	RBAC_JWT_KEY: process.env.RBAC_JWT_KEY || 'u?5k167v13w5fhjhuiweuyqi67621gqwdjavnbcvadjhgqyuqagsduyqtw87e187etqiasjdbabnvczmxcnkzn',

	mongoUrl: process.env.MONGO_APPCENTER_URL || 'mongodb://localhost',
	
	mongoAuthorUrl: process.env.MONGO_AUTHOR_URL || 'mongodb://localhost',
	authorDB: process.env.MONGO_AUTHOR_DBNAME || 'datastackConfig',
	
	mongoLogUrl: process.env.MONGO_LOGS_URL || 'mongodb://localhost',
	logsDB: process.env.MONGO_LOGS_DBNAME || 'datastackLogs',

	googleKey: process.env.GOOGLE_API_KEY || '',

	streamingConfig: {
		url: process.env.STREAMING_HOST || 'nats://127.0.0.1:4222',
		user: process.env.STREAMING_USER || '',
		pass: process.env.STREAMING_PASS || '',
		maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
		connectTimeout: 2000,
		stanMaxPingOut: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
	},
	mongoAuthorOptions: {
		useUnifiedTopology: true,
		useNewUrlParser: true,
		dbName: process.env.MONGO_AUTHOR_DBNAME || 'datastackConfig',
	},
	mongoAppCenterOptions: {
		useUnifiedTopology: true,
		useNewUrlParser: true,
	},
	mongoLogsOptions: {
		useUnifiedTopology: true,
		useNewUrlParser: true,
		dbName: process.env.MONGO_LOGS_DBNAME || 'datastackLogs'
	},
	
	encryptionKey: process.env.ENCRYPTION_KEY || '34857057658800771270426551038148',
	get,
	serverTimeout: process.env.SERVER_TIMEOUT || '60'
};
