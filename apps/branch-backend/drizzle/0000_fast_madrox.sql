CREATE TABLE `check_item_modifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`check_item_id` text NOT NULL,
	`menu_item_modifier_id` text NOT NULL,
	`modifier_id` text NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`check_item_id`) REFERENCES `check_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`menu_item_modifier_id`) REFERENCES `menu_item_modifiers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `check_items` (
	`id` text PRIMARY KEY NOT NULL,
	`chk_id` text NOT NULL,
	`menu_item_id` text NOT NULL,
	`item_price` real DEFAULT 0 NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`notes` text,
	`void_qty` real DEFAULT 0 NOT NULL,
	`void_by` text,
	`void_reason` text,
	`void_kind` integer DEFAULT 0 NOT NULL,
	`ent_qty` real DEFAULT 0 NOT NULL,
	`ent_by` text,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`chk_id`) REFERENCES `checks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`void_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ent_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `check_kind` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_kind_kind_unique` ON `check_kind` (`kind`);--> statement-breakpoint
CREATE TABLE `check_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_status_status_unique` ON `check_status` (`status`);--> statement-breakpoint
CREATE TABLE `checks` (
	`id` text PRIMARY KEY NOT NULL,
	`chk_no` integer NOT NULL,
	`transaction_no` text NOT NULL,
	`chk_date` text NOT NULL,
	`chk_time` text NOT NULL,
	`check_kind_id` integer NOT NULL,
	`table_id` text,
	`table_name` text,
	`net` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_by` text,
	`service_charge` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`ent_tax` real DEFAULT 0 NOT NULL,
	`delivery_charge` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`cash` real DEFAULT 0 NOT NULL,
	`visa` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`paid_cash` real DEFAULT 0 NOT NULL,
	`tips_cash` real DEFAULT 0 NOT NULL,
	`tips_visa` real DEFAULT 0 NOT NULL,
	`ent_amount` real DEFAULT 0 NOT NULL,
	`minimum_charge` real DEFAULT 0 NOT NULL,
	`void_amount` real DEFAULT 0 NOT NULL,
	`void_reason` text,
	`void_by` text,
	`visa_number` text,
	`close_time` text,
	`chk_status_id` integer NOT NULL,
	`guest_count` integer DEFAULT 1 NOT NULL,
	`print_count` integer DEFAULT 0 NOT NULL,
	`customer_id` text,
	`delivery_customer_id` text,
	`delivery_pilot_id` text,
	`cashier_id` text,
	`waiter_id` text,
	`shift` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`check_kind_id`) REFERENCES `check_kind`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discount_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`void_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chk_status_id`) REFERENCES `check_status`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_customer_id`) REFERENCES `delivery_customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_pilot_id`) REFERENCES `delivery_pilots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`waiter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `closed_days` (
	`id` text PRIMARY KEY NOT NULL,
	`closed_date` text NOT NULL,
	`closed_by` text,
	`close_time` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` integer DEFAULT 1 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`delivery_zone_id` text NOT NULL,
	`phone` text NOT NULL,
	`phone1` text,
	`phone2` text,
	`phone3` text,
	`phone4` text,
	`address` text,
	`address1` text,
	`address2` text,
	`address3` text,
	`address4` text,
	`floor` text,
	`unit` text,
	`landmark` text,
	`notes` text,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `delivery_pilots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`delivery_charge` real DEFAULT 0 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menu_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`menu_type_id` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`menu_type_id`) REFERENCES `menu_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_item_modifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_item_id` text NOT NULL,
	`modifiers_group_id` text NOT NULL,
	`group_order` integer DEFAULT 0 NOT NULL,
	`choice_count` integer DEFAULT 0 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modifiers_group_id`) REFERENCES `modifiers_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_item_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`price_name` text NOT NULL,
	`menu_item_id` text NOT NULL,
	`dining_price` real DEFAULT 0 NOT NULL,
	`take_away_price` real DEFAULT 0 NOT NULL,
	`delivery_price` real DEFAULT 0 NOT NULL,
	`officer_price` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_item_printers` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_item_id` text NOT NULL,
	`printer_id` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`arabic_name` text NOT NULL,
	`menu_group_id` text NOT NULL,
	`menu_sub_group_id` text,
	`image` text,
	`explicit_tax` real DEFAULT 0 NOT NULL,
	`no_discount` integer DEFAULT 0 NOT NULL,
	`sold_out` integer DEFAULT 0 NOT NULL,
	`coffee_sugar` integer DEFAULT 0 NOT NULL,
	`meat_doneness` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`menu_group_id`) REFERENCES `menu_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`menu_sub_group_id`) REFERENCES `menu_sub_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_sub_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`menu_group_id` text NOT NULL,
	`menu_type_id` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`menu_group_id`) REFERENCES `menu_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`menu_type_id`) REFERENCES `menu_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`modifiers_group_id` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`modifiers_group_id`) REFERENCES `modifiers_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `modifiers_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `options` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`tax_percent` real DEFAULT 0 NOT NULL,
	`ent_tax` real DEFAULT 0 NOT NULL,
	`service_charge_percent` real DEFAULT 0 NOT NULL,
	`fixed_delivery_charge` real DEFAULT 0 NOT NULL,
	`fixed_minimum_charge` real DEFAULT 0 NOT NULL,
	`kitchen_print` integer DEFAULT 0 NOT NULL,
	`kitchen_control_count` integer DEFAULT 0 NOT NULL,
	`discount_percent_1` real DEFAULT 0 NOT NULL,
	`discount_percent_2` real DEFAULT 0 NOT NULL,
	`discount_percent_3` real DEFAULT 0 NOT NULL,
	`discount_percent_4` real DEFAULT 0 NOT NULL,
	`discount_percent_5` real DEFAULT 0 NOT NULL,
	`branch_name` text NOT NULL,
	`branch_address` text,
	`branch_phone` text,
	`branch_logo` text,
	`branch_tax_id` text,
	`cloud_sync_id` text
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);--> statement-breakpoint
CREATE TABLE `printers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ip_address` text NOT NULL,
	`port` integer DEFAULT 9100 NOT NULL,
	`is_usb` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`connection` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_number` integer NOT NULL,
	`business_date` text NOT NULL,
	`opened_by` text NOT NULL,
	`closed_by` text,
	`starting_cash` real DEFAULT 0 NOT NULL,
	`expected_closing_cash` real DEFAULT 0,
	`actual_closing_cash` real DEFAULT 0,
	`status` text DEFAULT 'open' NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`action` text NOT NULL,
	`payload_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `table_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`pos_x` real DEFAULT 10 NOT NULL,
	`pos_y` real DEFAULT 10 NOT NULL,
	`table_width` integer DEFAULT 80 NOT NULL,
	`table_height` integer DEFAULT 80 NOT NULL,
	`angle` integer DEFAULT 0 NOT NULL,
	`shape` text DEFAULT 'rect' NOT NULL,
	`table_section_id` text NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`table_section_id`) REFERENCES `table_sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`pin` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`role_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`cloud_sync_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);