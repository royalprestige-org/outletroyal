-- Custom SQL migration file, put your code below! --
-- Corregir únicamente la precarga original de la cita 22D98BE3.
-- El importe final de $65,501.02 incluye el producto y el adicional financiados a 24 meses.
UPDATE appointments
SET sale_json=json_set(sale_json,
 '$.products[0].unitPrice',60546.33,
 '$.promotions[0].unitPrice',4954.69)
WHERE id='22d98be3-a936-446f-a083-d15dcdf5b6af'
 AND status='completed'
 AND json_valid(sale_json)
 AND json_valid(source_json)
 AND json_extract(sale_json,'$.outcome')=''
 AND json_extract(source_json,'$.estimatedTotal')=65501.02
 AND json_extract(sale_json,'$.products[0].unitPrice')=43546
 AND json_extract(sale_json,'$.promotions[0].unitPrice')=3563.5;
