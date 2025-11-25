/**
 * Script to seed focus areas into the database
 * 
 * Usage:
 *   npx convex run focusAreas:seed
 * 
 * This will insert all focus areas grouped by domain.
 * The seed function is idempotent - it will skip focus areas that already exist.
 */

console.log(`
    To seed focus areas, execute:
    
      npx convex run focusAreas:seed
    
    This will insert all focus areas from the following groups:
    - Vehicle Engineering & Systems
    - Manufacturing & Factory Operations
    - AI, Data & Engineering Enablement
    - People, Testing & Program Operations
    
    The seed function is idempotent and will skip existing focus areas.
    `);

