-- Row triggers execute on the physical partition, so TG_TABLE_NAME contains
-- the weekly suffix. Normalize existing installations that applied V011.
DO $$
DECLARE
  function_name text;
  definition text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'register_partitioned_clinic_record', 'cleanup_partitioned_clinic_locator'
  ] LOOP
    SELECT pg_get_functiondef(p.oid) INTO definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = current_schema() AND p.proname = function_name
       AND p.pronargs = 0;
    IF definition IS NULL THEN
      RAISE EXCEPTION 'Função de partição ausente: %', function_name;
    END IF;
    definition := replace(definition, 'CASE TG_TABLE_NAME',
      'CASE split_part(TG_TABLE_NAME, ''_w'', 1)');
    definition := replace(definition, 'IF TG_TABLE_NAME =',
      'IF split_part(TG_TABLE_NAME, ''_w'', 1) =');
    EXECUTE definition;
  END LOOP;
END;
$$;
