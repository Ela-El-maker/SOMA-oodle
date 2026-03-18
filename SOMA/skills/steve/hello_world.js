/**
 * Hello World Skill
 * 
 * A simple demonstration of SOMA's "Skills as Files" architecture.
 * This file is hot-loaded by the SkillWatcherArbiter.
 */

module.exports = {
    name: 'hello_world',
    description: 'A test skill that proves the plugin system is active. Echoes a greeting.',
    parameters: {
        type: 'object',
        properties: {
            greeting: {
                type: 'string',
                description: 'The message you want Steve to say back to you.'
            }
        },
        required: ['greeting']
    },
    execute: async ({ greeting }) => {
        // This code runs inside SOMA's backend
        const timestamp = new Date().toLocaleTimeString();
        return {
            success: true,
            message: `[${timestamp}] S.T.E.V.E. acknowledges: "${greeting}". The Dynamic Skill System is fully operational.`,
            meta: {
                source: 'plugin_file',
                path: 'SOMA/skills/steve/hello_world.js'
            }
        };
    }
};
