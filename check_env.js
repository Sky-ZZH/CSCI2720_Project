console.log("Node Version: " + process.version);
const { exec } = require('child_process');

exec('npm -v', (err, stdout) => {
    console.log("NPM Version: " + stdout.trim());
});

exec('mongod --version', (err, stdout) => {
    if (err) {
        console.log("MongoDB not found or not in PATH");
        return;
    }
    console.log("MongoDB Version Info:\n" + stdout.split('\n')[0]);
});
