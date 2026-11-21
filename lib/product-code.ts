/** Neutral display code. Persistent database identifiers remain unchanged. */
export function visibleProductCode(id:string):string {
  const match=/^[A-Z]{2}-(\d{3,6})$/i.exec(id);
  return match?`ART-${match[1]}`:id;
}
