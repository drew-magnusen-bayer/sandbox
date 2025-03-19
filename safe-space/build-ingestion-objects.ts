import * as fs from 'fs';

interface IngestionObject {
    sets: {
        setId: number;
        trialType: 'field trial' | 'seed production';
        source: 'fts' | 'velocity';
    }[];
}

function buildIngestionObjects(filePath: string, trialType: 'field trial' | 'seed production', source: 'fts' | 'velocity'): IngestionObject {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const numbersArray: number[] = fileContent.split('\n').map(line => parseInt(line, 10)).filter(Number.isInteger);

    const sets = numbersArray.map(setId => ({
        setId,
        trialType,
        source
    }));

    return { sets };
}

const [filePath, trialType, source] = process.argv.slice(2);

// if (!filePath || !trialType || !source) {
//     console.error('Usage: build-ingestion-objects <filePath> <trialType> <source>');
//     process.exit(1);
// }

// if (!['field trial', 'seed production'].includes(trialType)) {
//     console.error('Invalid trialType. Must be "field trial" or "seed production".');
//     process.exit(1);
// }

// if (!['fts', 'velocity'].includes(source)) {
//     console.error('Invalid source. Must be "fts" or "velocity".');
//     process.exit(1);
// }

const result = buildIngestionObjects(filePath, trialType as 'field trial' | 'seed production', source as 'fts' | 'velocity');
fs.writeFileSync('output.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));