const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const prisma = new PrismaClient();

/**
 * Initialize the database schema and optionally seed with test data
 * @param seedData Whether to seed the database with test data
 */
async function initializeDatabase(seedData = false) {
  try {
    console.log('Initializing database...');
    
    // Push the schema to the database (creates tables if they don't exist)
    await execAsync('npx prisma db push');
    console.log('Database schema pushed successfully');
    
    // Seed the database if requested
    if (seedData) {
      console.log('Seeding database with test data...');
      
      try {
        // We can add custom seed logic here or call the seed script
        await execAsync('npx prisma db seed');
        console.log('Database seeded successfully');
      } catch (seedError) {
        console.error('Error seeding database:', seedError);
        // Continue execution even if seeding fails
      }
    }
    
    // Test database connection
    await prisma.$connect();
    console.log('Database connection successful');
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Allow this script to be run directly
if (require.main === module) {
  // Get command line args
  const seedData = process.argv.includes('--seed');
  
  initializeDatabase(seedData)
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase }; 