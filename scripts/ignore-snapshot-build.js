// Vercel: exit 0 skips the build; exit 1 continues the build.
// This snapshot is intended for continuing development through node server.js.
const { localOnly } = require('../project-mode.json');
process.exit(localOnly ? 0 : 1);
