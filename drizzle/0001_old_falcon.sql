CREATE TABLE `appointment_referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`age` integer,
	`married` text DEFAULT '' NOT NULL,
	`work` text DEFAULT '' NOT NULL,
	`health` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_referrals_appointment` ON `appointment_referrals` (`appointment_id`);--> statement-breakpoint
CREATE TABLE `appointment_slots` (
	`key` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`hold_token` text NOT NULL,
	`appointment_id` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_slots_expires` ON `appointment_slots` (`expires_at`);--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'scheduled' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`expires_at` integer,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`colonia` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`source_json` text DEFAULT '{}' NOT NULL,
	`sale_json` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_date_status` ON `appointments` (`date`,`status`);