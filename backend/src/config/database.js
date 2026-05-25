import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client;
let db;

export const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000,  // MongoDB Atlas needs more time
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 10
    };
    client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/teacher_eval', options);
    await client.connect();
    db = client.db('teacher_eval');
    console.log('✅ Connected to MongoDB');
    
    // Create indexes for collections
    await createIndexes();
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const teachersCollection = db.collection('teachers');
    
    // Create compound index for duplicate prevention
    await teachersCollection.createIndex(
      { first_name: 1, last_name: 1, department: 1 },
      { background: true }
    );
    console.log('📇 Teachers collection indexes created');
  } catch (error) {
    console.warn('⚠️ Index creation warning:', error.message);
    // Don't fail if indexes already exist
  }
};

export const getDB = () => db;

export const getCollection = (collectionName) => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db.collection(collectionName);
};

export const closeDB = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};
