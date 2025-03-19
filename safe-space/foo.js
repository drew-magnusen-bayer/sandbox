import fs from 'fs';
import _ from 'lodash';

const sets = JSON.parse(fs.readFileSync('./files/adam-soy.json', 'utf-8'))
const parsedSets = _.uniqBy(sets.map(s => ({ ...s, setId: +s.setId })), 'setId');
console.log(parsedSets.length);
const chunks = _.chunk(parsedSets, 300);

console.log(chunks.length);
chunks.forEach((chunk, i)=>{
    fs.writeFile(`adam-soy-${i}.json`, JSON.stringify({sets: chunk, requestId: 'adam-soy'}), 'utf8', (err,data)=>{if(err) console.log(err)})
})
// fs.writeFile('velocity-ft-2024-parsed.json', JSON.stringify(parsedSets,), 'utf8', (err,data)=>{if(err) console.log(err)})