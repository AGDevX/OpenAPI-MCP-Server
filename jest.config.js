export default {
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^@server/(.*)\\.(js|ts)$': '<rootDir>/src/server/$1',
		'^@services/(.*)\\.(js|ts)$': '<rootDir>/src/services/$1',
		'^@setup/(.*)\\.(js|ts)$': '<rootDir>/src/setup/$1',
		'^@utils/(.*)\\.(js|ts)$': '<rootDir>/src/utils/$1',
		'^(\\.{1,2}/.*)\\.js$': '$1'
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				useESM: true
			}
		]
	},
	testMatch: ['**/tests/**/*.test.ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/**/*.test.ts',
		'!src/index.ts',
		'!src/cli.ts',
		'!src/setup/**/*.ts'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
