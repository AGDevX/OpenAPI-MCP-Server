import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
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
		ignores: [
			'dist/**',
			'coverage/**',
			'node_modules/**',
			'*.config.js',
			'jest.config.js',
			'eslint.config.js'
		]
	}
);
