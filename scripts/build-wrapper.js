const { execSync } = require('child_process');

console.log('Build Wrapper: Checking environment...');

if (process.env.IS_OPEN_NEXT_BUILD === 'true') {
    console.log('Build Wrapper: Inside OpenNext build. Running standard Next.js build...');
    try {
        execSync('npm run build:next', { stdio: 'inherit' });
    } catch (error) {
        console.error('Build Wrapper: Standard Next.js build failed.');
        process.exit(1);
    }
} else {
    console.log('Build Wrapper: Starting Cloudflare Worker build...');
    try {
        // Set the flag to prevent recursion when OpenNext calls 'npm run build'
        execSync('npm run build:worker', {
            stdio: 'inherit',
            env: { ...process.env, IS_OPEN_NEXT_BUILD: 'true' }
        });
    } catch (error) {
        console.error('Build Wrapper: Cloudflare Worker build failed.');
        process.exit(1);
    }
}
