DO $$
DECLARE
  fn record;
  keep_public text[] := ARRAY[
    'get_shared_ai_conversation',
    'handle_new_user',
    'check_rate_limit',
    'set_limit', 'show_limit', 'show_trgm', 'similarity_op', 'similarity_dist',
    'word_similarity', 'word_similarity_op', 'word_similarity_commutator_op',
    'word_similarity_dist_op', 'word_similarity_dist_commutator_op',
    'strict_word_similarity', 'strict_word_similarity_op',
    'strict_word_similarity_commutator_op',
    'strict_word_similarity_dist_op', 'strict_word_similarity_dist_commutator_op',
    'gtrgm_in', 'gtrgm_out', 'gtrgm_consistent', 'gtrgm_distance',
    'gtrgm_compress', 'gtrgm_decompress', 'gtrgm_penalty', 'gtrgm_picksplit',
    'gtrgm_union', 'gtrgm_same', 'gtrgm_options',
    'gin_extract_value_trgm', 'gin_extract_query_trgm',
    'gin_trgm_consistent', 'gin_trgm_triconsistent',
    'unaccent', 'unaccent_init', 'unaccent_lexize'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> ALL(keep_public)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
      fn.schema_name, fn.func_name, fn.args
    );
  END LOOP;
END $$;
