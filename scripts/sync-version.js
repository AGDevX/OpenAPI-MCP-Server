#!/usr/bin/env node

/**
 * Sync version from package.json to Dockerfile
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const dockerfilePath = path.join(rootDir, 'Dockerfile');

try {
	// Read package.json
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
	const version = packageJson.version;

	if (!version) {
		console.error('❌ Error: No version found in package.json');
		process.exit(1);
	}

	// Read Dockerfile
	let dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');

	// Update version label
	const versionLabelRegex = /LABEL org\.opencontainers\.image\.version="[^"]*"/;
	const newVersionLabel = `LABEL org.opencontainers.image.version="${version}"`;

	if (!versionLabelRegex.test(dockerfile)) {
		console.error('❌ Error: Could not find version label in Dockerfile');
		process.exit(1);
	}

	dockerfile = dockerfile.replace(versionLabelRegex, newVersionLabel);

	// Write updated Dockerfile
	fs.writeFileSync(dockerfilePath, dockerfile, 'utf-8');

	console.log(`✓ Synced version ${version} to Dockerfile`);
} catch (error) {
	console.error('❌ Error syncing version:', error.message);
	process.exit(1);
}
