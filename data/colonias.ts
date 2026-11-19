// Selección inicial de colonias de las tres ciudades; la opción libre cubre otras zonas.
export const colonias:Record<string,string[]>={
 'Cabo San Lucas':['Centro','El Médano','Lomas del Sol','El Caribe','Las Palmas','Los Cangrejos','4 de Marzo','Obrera','Otra colonia'],
 'San José del Cabo':['Centro','Santa Rosa','El Zacatal','Las Veredas','Costa Dorada','Guaymitas','La Choya','Vista Hermosa','Otra colonia'],
 'La Paz':['Centro','Pueblo Nuevo','Fidepaz','El Conchalito','Las Garzas','8 de Octubre','Arcos del Sol','Benito Juárez','Otra colonia'],
};
export const slots=['08:00–10:00','10:00–12:00','12:00–14:00','14:00–16:00','16:00–18:00','18:00–20:00','20:00–22:00'];
export function slotAvailable(date:string,slot:string){if(!date||!slot)return false;const day=new Date(`${date}T12:00:00`).getDay();return !(day>=1&&day<=5&&slot==='16:00–18:00')}
