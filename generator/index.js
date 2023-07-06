const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const codeGen = require('./code.generator');
const dsGen = require('./ds.generator');
// const schemaUtils = require('./schema.utils');


const logger = global.logger;


async function createProject(flowJSON) {
	try {
		flowJSON.port = flowJSON.port || 31000;

		logger.info(`Generating Process Flow code for Flow ID   :: ${flowJSON._id}`);
		logger.info(`Generating Process Flow code for Flow Name :: ${flowJSON.name}`);
		logger.info(`Generating Process Flow code for Flow App  :: ${flowJSON.app}`);
		logger.info(`Generating Process Flow code for Flow Port :: ${flowJSON.port}`);

		
		const folderPath = process.cwd();

		if (!fs.existsSync(path.join(folderPath, 'router'))) {
			mkdirp.sync(path.join(folderPath, 'router'));
		}
		if (!fs.existsSync(path.join(folderPath, 'schemas'))) {
			mkdirp.sync(path.join(folderPath, 'schemas'));
		}

		if (flowJSON.dataStructures && Object.keys(flowJSON.dataStructures).length > 0) {
			Object.keys(flowJSON.dataStructures).forEach(schemaID => {
				let schema = flowJSON.dataStructures[schemaID];
				schema._id = schemaID;
				if (schema.definition) {
					fs.writeFileSync(path.join(folderPath, 'schemas', `${schemaID}.schema.json`), JSON.stringify(schemaUtils.convertToJSONSchema(schema)));
				}
			});
		}

		fs.writeFileSync(path.join(folderPath, 'router', 'route.js'), codeGen.parseFlow(flowJSON));
		// fs.writeFileSync(path.join(folderPath, 'node.utils.js'), nodeUtilsContent);
		// fs.writeFileSync(path.join(folderPath, 'file.utils.js'), codeGen.parseDataStructuresForFileUtils(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'utils', 'validation.utils.js'), dsGen.parseDataStructures(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'flow.json'), JSON.stringify(flowJSON));

		// fs.rmdirSync(path.join(folderPath, 'generator'), { recursive: true });

		logger.info('Project Created!');
		return;
	} catch (e) {
		logger.error('Project Error!', e);
	}
}

// let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
// if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

// let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
// if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';


module.exports.createProject = createProject;
