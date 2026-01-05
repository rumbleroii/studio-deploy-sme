/**
 * MongoDB Connection Utility
 * Uses globalThis pattern to cache connection (same as studio's Prisma setup)
 */

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'autonomous_poc';

// Global type declaration for caching
const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  mongoDb: Db | undefined;
};

// Cached connection (prevents multiple connections in dev due to hot reload)
export const mongoClient =
  globalForMongo.mongoClient ??
  (MONGODB_URI ? new MongoClient(MONGODB_URI) : undefined);

// Cache in development
if (process.env.NODE_ENV !== 'production' && mongoClient) {
  globalForMongo.mongoClient = mongoClient;
}

/**
 * Get database connection
 * Connects if not already connected
 */
export async function getDb(): Promise<Db> {
  if (!mongoClient) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  // Connect if not connected
  if (!globalForMongo.mongoDb) {
    await mongoClient.connect();
    globalForMongo.mongoDb = mongoClient.db(DB_NAME);
    console.log('Connected to MongoDB');
  }

  return globalForMongo.mongoDb;
}

// Collection names
export const COLLECTIONS = {
  RESPONSES: 'responses',
} as const;
