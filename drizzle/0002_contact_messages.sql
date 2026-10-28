CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`topic` varchar(64) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','read') NOT NULL DEFAULT 'new',
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` datetime NOT NULL,
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `contact_messages_status_idx` ON `contact_messages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `contact_messages_ip_idx` ON `contact_messages` (`ip`,`created_at`);