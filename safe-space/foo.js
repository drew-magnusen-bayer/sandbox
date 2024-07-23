import fs from 'fs';

const uuids = JSON.parse(fs.readFileSync('./files/event-cleanup-uuids-to-reset.json', 'utf-8'))
console.log(uuids.length);