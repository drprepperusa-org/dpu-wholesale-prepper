const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Darkseig4188%21@db.vgzuxoonuoakkgsdfsgg.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query(`
    CREATE OR REPLACE FUNCTION exec_sql(query_text text, query_params text[] DEFAULT ARRAY[]::text[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      result jsonb;
      rc int;
      i int;
      safe_query text;
    BEGIN
      safe_query := query_text;

      -- Replace $N placeholders with safely quoted values (reverse order to avoid $1 matching $10)
      IF array_length(query_params, 1) IS NOT NULL THEN
        FOR i IN REVERSE array_length(query_params, 1)..1 LOOP
          IF query_params[i] IS NULL THEN
            safe_query := replace(safe_query, '$' || i::text, 'NULL');
          ELSE
            safe_query := replace(safe_query, '$' || i::text, quote_literal(query_params[i]));
          END IF;
        END LOOP;
      END IF;

      IF query_text ~* '(^\s*(SELECT|WITH)|RETURNING)' THEN
        EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', safe_query)
          INTO result;
        RETURN COALESCE(result, '[]'::jsonb);
      ELSE
        EXECUTE safe_query;
        GET DIAGNOSTICS rc = ROW_COUNT;
        RETURN jsonb_build_object('rowCount', rc);
      END IF;
    END;
    $func$;
  `);
  console.log('exec_sql function created');

  // Test: simple SELECT
  const r1 = await pool.query("SELECT exec_sql('SELECT count(*) as cnt FROM products')");
  console.log('Test SELECT:', r1.rows[0].exec_sql);

  // Test: parameterized SELECT with integer
  const r2 = await pool.query("SELECT exec_sql('SELECT id, name FROM products WHERE category_id = $1 LIMIT 2', ARRAY['1'])");
  console.log('Test int param:', r2.rows[0].exec_sql);

  // Test: parameterized with string
  const r3 = await pool.query("SELECT exec_sql('SELECT id, email, role FROM users WHERE email = $1', ARRAY['admin@drprepper.com'])");
  console.log('Test string param:', r3.rows[0].exec_sql);

  // Test: UPDATE (non-select)
  const r4 = await pool.query("SELECT exec_sql('UPDATE settings SET value = $1 WHERE key = $2', ARRAY['true', 'allow_registration'])");
  console.log('Test UPDATE:', r4.rows[0].exec_sql);

  await pool.end();
  console.log('All tests passed!');
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
