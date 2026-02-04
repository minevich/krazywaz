const { execSync } = require('child_process');

console.log('Build Wrapper: Checking environment...');

// If IS_OPEN_NEXT_BUILD is set, we are being called by opennextjs-cloudflare.
// Just run the standard Next.js build.
if (process.env.IS_OPEN_NEXT_BUILD === 'true') {
    console.log('Build Wrapper: Inside OpenNext build. Running standard Next.js build...');
    try {
        execSync('npm run build:next', { stdio: 'inherit' });
    } catch (error) {
        console.error('Build Wrapper: Standard Next.js build failed.');
        process.exit(1);
    }
} else {
    // We are being called directly (e.g. by opennextjs-cloudflare which calls 'npm run build').
    // Set the flag and run the standard Next.js build directly.
    // DO NOT call build:worker here, as that would cause a loop.
    console.log('Build Wrapper: Running standard Next.js build...');
    try {
        execSync('npm run build:next', {
            stdio: 'inherit',
            env: { ...process.env, IS_OPEN_NEXT_BUILD: 'true' }
        });
    } catch (error) {
        console.error('Build Wrapper: Next.js build failed.');
        process.exit(1);
    }
}
