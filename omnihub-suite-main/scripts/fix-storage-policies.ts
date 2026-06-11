import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
    "Set them before running this local maintenance script — never hardcode credentials."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixStoragePolicies() {
  try {
    console.log('🔄 Fixing storage RLS policies...\n');
    
    // Read the migration file
    const sql = fs.readFileSync('supabase/migrations/20260301_fix_storage_rls_policies.sql', 'utf-8');
    
    // Execute the SQL using rpc or direct query
    const { data, error } = await supabase.rpc('sql', { query: sql });
    
    if (error) {
      console.error('❌ Error:', error.message);
      
      // Try alternative approach - split queries and execute separately
      console.log('\n📝 Executing policies one by one...\n');
      
      const queries = [
        // POST-IMAGES
        `DELETE FROM storage.policies WHERE bucket_id = 'post-images' AND operation IN ('INSERT', 'DELETE', 'UPDATE')`,
        `INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES ('Public read post-images', 'post-images', 'SELECT', 'true') ON CONFLICT DO NOTHING`,
        `INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES ('Auth upload post-images', 'post-images', 'INSERT', 'auth.role() = ''authenticated''') ON CONFLICT DO NOTHING`,
        
        // VIDEOS
        `DELETE FROM storage.policies WHERE bucket_id = 'videos' AND operation IN ('INSERT', 'DELETE', 'UPDATE')`,
        `INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES ('Public read videos', 'videos', 'SELECT', 'true') ON CONFLICT DO NOTHING`,
        `INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES ('Auth upload videos', 'videos', 'INSERT', 'auth.role() = ''authenticated''') ON CONFLICT DO NOTHING`,
        
        // POST-FILES  
        `DELETE FROM storage.policies WHERE bucket_id = 'post-files' AND operation IN ('INSERT', 'DELETE', 'UPDATE')`,
        `INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES ('Public read post-files', 'post-files', 'SELECT', 'true') ON CONFLICT DO NOTHING`,
        `INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES ('Auth upload post-files', 'post-files', 'INSERT', 'auth.role() = ''authenticated''') ON CONFLICT DO NOTHING`,
      ];
      
      for (const query of queries) {
        const { error: queryError } = await supabase.rpc('sql', { query });
        if (queryError) {
          console.log(`⚠️  Query skipped: ${query.substring(0, 50)}...`);
        } else {
          console.log(`✅ Applied: ${query.substring(0, 60)}...`);
        }
      }
    } else {
      console.log('✅ All storage policies fixed successfully!');
    }
    
  } catch (err: any) {
    console.error('Error executing migration:', err.message);
    console.log('\n💡 Please apply the SQL manually in Supabase dashboard:');
    console.log('   1. Go to SQL Editor');
    console.log('   2. Copy content from: supabase/migrations/20260301_fix_storage_rls_policies.sql');
    console.log('   3. Run the queries');
  }
}

fixStoragePolicies();
