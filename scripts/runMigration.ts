/**
 * Script to run database migrations
 * 
 * Usage:
 *   npx convex run migrations/removeLeadFields:removeLeadFields
 * 
 * This is a one-time migration to clean up legacy lead fields from projects.
 */

console.log(`
    To run the migration, execute:
    
      npx convex run migrations/removeLeadFields:removeLeadFields
    
    This will remove 'lead' and 'leadInitials' fields from all projects in the database.
    `);
    