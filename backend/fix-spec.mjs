import 'dotenv/config';
import db from './config/db.js';
import Doctor from './models/Doctor.js';
await db();
const docs = await Doctor.find({}, 'name specialization');
docs.forEach(d => console.log(JSON.stringify({ name: d.name, spec: d.specialization })));
process.exit(0);
