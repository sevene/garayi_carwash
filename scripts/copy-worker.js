const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), '.open-next', 'worker.js');
const dest = path.join(process.cwd(), '.open-next', 'assets', '_worker.js');
const assetsDir = path.dirname(dest);

console.log(`Processing worker...`);

if (fs.existsSync(src)) {
    // Ensure assets dir exists
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 1. Copy required directories into assets folder
    const dirsToCopy = ['cloudflare', 'server-functions', 'middleware', '.build'];

    dirsToCopy.forEach(dirName => {
        const sourceDir = path.join(process.cwd(), '.open-next', dirName);
        const targetDir = path.join(assetsDir, dirName);

        if (fs.existsSync(sourceDir)) {
            console.log(`Copying ${dirName} to assets...`);
            fs.cpSync(sourceDir, targetDir, { recursive: true });
        } else {
            console.warn(`Warning: Directory ${dirName} not found at ${sourceDir}`);
        }
    });

    // 2. Read the original worker file
    let content = fs.readFileSync(src, 'utf8');

    // we NO LONGER rewrite imports to step up one directory
    // because we are now copying the dependencies next to the worker.

    // Wrap the worker to handle static assets via env.ASSETS
    // 1. Rename 'export default' to a variable
    content = content.replace('export default', 'const openNextWorker =');

    // 2. Append the wrapper logic
    content += `\n\n
export default {
  async fetch(request, env, ctx) {
    // Attempt to serve static assets from Cloudflare Pages ASSETS binding
    try {
        const url = new URL(request.url);
        if (!url.pathname.startsWith('/api/') && env.ASSETS) {
             const asset = await env.ASSETS.fetch(request);
             if (asset.status >= 200 && asset.status < 400) {
                 return asset;
             }
        }
    } catch (e) {
        // console.error("Error fetching asset:", e);
    }

    // Fallback to Next.js Application
    return openNextWorker.fetch(request, env, ctx);
  }
};`;

    fs.writeFileSync(dest, content);
    console.log('Success: _worker.js created in assets directory and dependencies copied.');
} else {
    console.warn(`Warning: Could not find worker file at ${src}.`);
    if (process.env.CI) {
        console.error('Failing build because worker.js was not found in CI.');
        process.exit(1);
    }
}
