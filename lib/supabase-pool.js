// Supabase REST API adapter that mimics pg.Pool.query() interface
// Uses the exec_sql PostgreSQL function via Supabase RPC
const { createClient } = require('@supabase/supabase-js');

function createSupabasePool() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function query(textOrConfig, params) {
    const sql = typeof textOrConfig === 'string' ? textOrConfig : textOrConfig.text;
    const values = params || (typeof textOrConfig === 'object' ? textOrConfig.values : undefined);

    // Convert params to string array for the RPC function
    const queryParams = values
      ? values.map(v => (v === null || v === undefined) ? null : String(v))
      : [];

    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: sql,
      query_params: queryParams
    });

    if (error) {
      const err = new Error(error.message || 'Database query failed');
      err.code = error.code;
      throw err;
    }

    // data is either a JSON array (SELECT) or { rowCount: N } (DML)
    if (Array.isArray(data)) {
      return { rows: data, rowCount: data.length };
    } else if (data && data.rowCount !== undefined) {
      return { rows: [], rowCount: data.rowCount };
    } else {
      return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
    }
  }

  // Return a pool-like object
  return {
    query,
    // connect() returns a client with query + release
    connect: async () => ({
      query,
      release: () => {}
    }),
    on: () => {},
    end: async () => {}
  };
}

module.exports = { createSupabasePool };
