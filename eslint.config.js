import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig,
	{
		plugins: {
			'simple-import-sort': simpleImportSort
		},
		rules: {
			// Import sorting with custom groups
			'simple-import-sort/imports': [
				'error',
				{
					groups: [
						// 1. Node.js built-ins prefixed with `node:`
						['^node:'],

						// 2. External packages - things that start with a letter (or digit or underscore), or `@` followed by a letter
						['^@?\\w'],

						// 3. Project path aliases (@server, @services, @setup, @utils)
						['^@(server|services|setup|utils)(/.*|$)'],

						// 4. Parent relative imports (..)
						['^\\.\\.(?!/?$)', '^\\.\\./?$'],

						// 5. Same-folder relative imports (.)
						['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],

						// 6. Side effect imports (e.g., import './polyfills')
						['^\\u0000']
					]
				}
			],
			'simple-import-sort/exports': 'error',

			// Disable rules that are too strict for this project
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],
			'no-console': 'off', // Allow console for CLI/server output
			'@typescript-eslint/no-non-null-assertion': 'warn'
		}
	},
	{
		ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.js', 'jest.config.js', 'eslint.config.js']
	}
);
