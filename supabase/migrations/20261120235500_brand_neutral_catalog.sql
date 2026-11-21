-- Neutralización de los textos visibles. No cambia códigos internos, precios ni relaciones.
-- El historial de Git preserva la versión previa del catálogo para recuperación controlada.
WITH cleaned AS (
 SELECT id,
  CASE WHEN id='RP-127' THEN 'Juego de vasos para tequila, 4 piezas'
       WHEN id='RP-139' THEN 'Limpiador para utensilios'
       ELSE btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(name,''),'RoyalShine','Limpiador para utensilios','gi'),'Royal[[:space:]]*Prestige([®™])?','','gi'),'(Royal|Prestige|Hy[[:space:]]*Cite)','','gi'),'[[:space:]]{2,}',' ','g')) END AS cleaned_name,
  CASE WHEN id='RP-127' THEN '1 × Juego de vasos para tequila, 4 piezas'
       WHEN id='RP-139' THEN '1 × Limpiador para utensilios'
       ELSE btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(description,''),'RoyalShine','Limpiador para utensilios','gi'),'Royal[[:space:]]*Prestige([®™])?','','gi'),'(Royal|Prestige|Hy[[:space:]]*Cite)','','gi'),'[[:space:]]{2,}',' ','g')) END AS cleaned_description,
  CASE WHEN id='RP-139' THEN 'Cobertura no especificada. Consulta condiciones aplicables con un asesor.'
       ELSE btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(warranty_json->>'details',''),'RoyalShine','Limpiador para utensilios','gi'),'Royal[[:space:]]*Prestige([®™])?','','gi'),'(Royal|Prestige|Hy[[:space:]]*Cite)','','gi'),'[[:space:]]{2,}',' ','g')) END AS cleaned_warranty_details
 FROM public.products
)
UPDATE public.products p
SET name=c.cleaned_name,
    description=c.cleaned_description,
    warranty_json=CASE WHEN p.warranty_json IS NULL THEN NULL
     ELSE jsonb_set(p.warranty_json-'sourceUrl','{details}',to_jsonb(c.cleaned_warranty_details),true) END
FROM cleaned c WHERE p.id=c.id;
