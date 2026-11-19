import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const products=sqliteTable('products',{
 id:text('id').primaryKey(),name:text('name').notNull(),family:text('family').notNull(),category:text('category').notNull().default(''),description:text('description').notNull().default(''),basePrice:integer('base_price').notNull(),kind:text('kind').notNull().default('individual'),isKitchenSet:integer('is_kitchen_set',{mode:'boolean'}).notNull().default(false),completed:integer('completed',{mode:'boolean'}).notNull().default(false),updatedAt:text('updated_at').notNull().default(''),
},t=>[index('idx_products_completed_family').on(t.completed,t.family)]);
export const productPhotos=sqliteTable('product_photos',{
 id:text('id').primaryKey(),productId:text('product_id').notNull().references(()=>products.id,{onDelete:'cascade'}),objectKey:text('object_key').notNull(),position:integer('position').notNull().default(0),
},t=>[index('idx_photos_product').on(t.productId)]);
export const productComponents=sqliteTable('product_components',{
 id:text('id').primaryKey(),productId:text('product_id').notNull().references(()=>products.id,{onDelete:'cascade'}),componentProductId:text('component_product_id'),label:text('label').notNull(),quantity:integer('quantity').notNull().default(1),position:integer('position').notNull().default(0),
},t=>[index('idx_components_product').on(t.productId)]);
export const offers=sqliteTable('offers',{
 id:text('id').primaryKey(),name:text('name').notNull(),description:text('description').notNull().default(''),specialPrice:integer('special_price').notNull(),active:integer('active',{mode:'boolean'}).notNull().default(false),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const offerItems=sqliteTable('offer_items',{
 id:text('id').primaryKey(),offerId:text('offer_id').notNull().references(()=>offers.id,{onDelete:'cascade'}),productId:text('product_id').notNull().references(()=>products.id),quantity:integer('quantity').notNull().default(1),
},t=>[index('idx_offer_items_offer').on(t.offerId)]);
export const appointments=sqliteTable('appointments',{
 id:text('id').primaryKey(),kind:text('kind').notNull().default('scheduled'),status:text('status').notNull().default('pending'),date:text('date').notNull(),slot:text('slot').notNull(),expiresAt:integer('expires_at'),customerName:text('customer_name').notNull(),phone:text('phone').notNull(),city:text('city').notNull().default(''),colonia:text('colonia').notNull().default(''),address:text('address').notNull().default(''),sourceJson:text('source_json').notNull().default('{}'),saleJson:text('sale_json').notNull().default('{}'),notes:text('notes').notNull().default(''),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_appointments_date_status').on(t.date,t.status)]);
export const appointmentSlots=sqliteTable('appointment_slots',{
 key:text('key').primaryKey(),date:text('date').notNull(),slot:text('slot').notNull(),holdToken:text('hold_token').notNull(),appointmentId:text('appointment_id'),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_slots_expires').on(t.expiresAt)]);
export const appointmentReferrals=sqliteTable('appointment_referrals',{
 id:text('id').primaryKey(),appointmentId:text('appointment_id').notNull().references(()=>appointments.id,{onDelete:'cascade'}),name:text('name').notNull(),phone:text('phone').notNull().default(''),age:integer('age'),married:text('married').notNull().default(''),work:text('work').notNull().default(''),health:text('health').notNull().default(''),notes:text('notes').notNull().default(''),
},t=>[index('idx_referrals_appointment').on(t.appointmentId)]);
