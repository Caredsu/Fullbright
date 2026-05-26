import { connectDB, getCollection } from './src/config/database.js';

await connectDB();

const adminsCollection = getCollection('admins');
const evaluationsCollection = getCollection('evaluations');

const admins = await adminsCollection.find({}).toArray();
console.log('\n=== ADMINS ===');
admins.forEach(a => console.log(`${a._id} : ${a.username}`));

const evaluations = await evaluationsCollection.find({}).limit(3).toArray();
console.log('\n=== SAMPLE EVALUATIONS ===');
evaluations.forEach(e => console.log(`${e._id} -> evaluated_by: ${e.evaluated_by}`));

process.exit(0);
