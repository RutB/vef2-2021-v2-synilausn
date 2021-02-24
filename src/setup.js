import { readFile} from 'fs/promises';
import { query, end } from './db.js';
import faker from 'faker';

const schemaFile = './sql/schema.sql';

async function create() {
  const data = await readFile(schemaFile);

  await query(data.toString('utf-8'));

  await end();

  console.info('Schema created');
}

create().catch((err) => {
  console.error('Error creating schema', err);
});
