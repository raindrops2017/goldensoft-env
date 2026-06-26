ALTER TABLE `users` ADD `failed_pin_attempts` integer NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD `locked_until` text;
