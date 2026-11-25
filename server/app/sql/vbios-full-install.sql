-- vBios SHM: fresh installation only. MySQL 8.x.
-- Select/create an EMPTY database before importing. Never use mysql --force.
-- Includes upstream SHM initial admin account: change its password before exposure.
-- Configure real domains, Telegram/OIDC, AI, Remnawave and storage after import.
SET NAMES utf8mb4;
DELIMITER $$
CREATE PROCEDURE vbios_require_empty_database()
BEGIN
  IF DATABASE() IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Select an empty database first';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fresh install only: database already contains tables. Import aborted.';
  END IF;
END$$
DELIMITER ;
CALL vbios_require_empty_database();
DROP PROCEDURE vbios_require_empty_database;


-- BEGIN SOURCE: server/app/sql/shm/shm_structure.sql
BEGIN;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `acts` (
  `act_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `show_act` tinyint(4) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  PRIMARY KEY (`act_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `acts_data` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `act_id` int(10) unsigned DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `service_id` int(11) DEFAULT NULL,
  `user_service_id` int(11) DEFAULT NULL,
  `withdraw_id` int(10) unsigned DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `name` char(64) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `stop_date` datetime DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `apps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `user_service_id` int(11) NOT NULL,
  `name` char(16) NOT NULL,
  `domain_id` int(11) DEFAULT NULL,
  `settings` json DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `discounts` (
  `discount_id` tinyint(4) NOT NULL AUTO_INCREMENT,
  `title` char(64) NOT NULL,
  `months` decimal(10,4) NOT NULL,
  `percent` tinyint(4) NOT NULL,
  `share` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`discount_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dns_services` (
  `dns_id` int(11) NOT NULL AUTO_INCREMENT,
  `domain_id` int(11) NOT NULL,
  `domain` char(255) DEFAULT NULL,
  `type` char(5) DEFAULT NULL,
  `prio` tinyint(4) DEFAULT NULL,
  `addr` text,
  `ttl` tinyint(4) DEFAULT NULL,
  FOREIGN KEY (domain_id) REFERENCES domains (domain_id),
  PRIMARY KEY (`dns_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `domains` (
  `domain_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `domain` char(64) NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `zone_id` int(11) DEFAULT NULL,
  `subdomain_for` int(11) DEFAULT NULL,
  `punycode` char(64) DEFAULT NULL,
  `user_service_id` int(11) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  PRIMARY KEY (`domain_id`),
  UNIQUE KEY `domain` (`domain`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `domains_services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `domain_id` int(11) NOT NULL,
  `user_service_id` int(11) NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain_service_id` (`domain_id`,`user_service_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT '0.00',
  `text` char(128) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pays_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `pay_system_id` char(32) DEFAULT NULL,
  `money` decimal(10,2) NOT NULL DEFAULT '0.00',
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `comment` json DEFAULT NULL,
  `uniq_key` char(255) DEFAULT NULL,
  UNIQUE KEY `uniq_key` (`user_id`,`uniq_key`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `servers` (
  `server_id` int(11) NOT NULL AUTO_INCREMENT,
  `server_gid` int(11) DEFAULT NULL,
  `name` char(255) DEFAULT NULL,
  `transport` char(32) NOT NULL,
  `host` char(255) DEFAULT NULL,
  `ip` char(15) DEFAULT NULL,
  `weight` int(11) DEFAULT '100',
  `success_count` int(11) NOT NULL DEFAULT '0',
  `fail_count` int(11) NOT NULL DEFAULT '0',
  `services_count` int(11) NOT NULL DEFAULT '0',
  `enabled` int(1) NOT NULL DEFAULT '1',
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`server_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `servers_groups` (
  `group_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` char(255) DEFAULT NULL,
  `transport` char(32) NOT NULL DEFAULT 'ssh',
  `type` char(16) NOT NULL DEFAULT 'random',
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `services` (
  `service_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` char(64) NOT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `period` decimal(10,4) NOT NULL DEFAULT '1',
  `category` char(16) DEFAULT NULL,
  `children` json DEFAULT NULL,
  `next` int(11) DEFAULT '0',
  `allow_to_order` tinyint(4) DEFAULT NULL,
  `max_count` tinyint(4) DEFAULT NULL,
  `question` tinyint(4) DEFAULT NULL,
  `pay_always` tinyint(4) DEFAULT '0',
  `no_discount` tinyint(4) DEFAULT '0',
  `descr` char(255) DEFAULT NULL,
  `pay_in_credit` tinyint(4) DEFAULT '0',
  `config` json DEFAULT NULL,
  `is_composite` tinyint(4) NOT NULL DEFAULT '0',
  `deleted` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`service_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kind` char(32) NOT NULL,
  `title` char(128) NOT NULL,
  `name` char(32) NOT NULL,
  `server_gid` int(11) DEFAULT NULL,
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `spool_queues` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `rate_limit` float DEFAULT NULL COMMENT 'max tasks per second, NULL = unlimited',
  `status` enum('active','paused') NOT NULL DEFAULT 'active',
  `last_executed_at` datetime DEFAULT NULL COMMENT 'last time a task from this queue was executed',
  `created_at`       datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at`      datetime DEFAULT NULL COMMENT 'set automatically when no pending tasks remain',
  `total_added`  int(11) NOT NULL DEFAULT '0',
  `cnt_success`  int(11) NOT NULL DEFAULT '0',
  `cnt_fail`     int(11) NOT NULL DEFAULT '0',
  `cnt_delayed`  int(11) NOT NULL DEFAULT '0',
  `cnt_stuck`    int(11) NOT NULL DEFAULT '0',
  `cnt_paused`   int(11) NOT NULL DEFAULT '0',
  `cnt_skipped`  int(11) NOT NULL DEFAULT '0',
  `cnt_pending`  int(11) NOT NULL DEFAULT '0' COMMENT 'tasks not yet terminally finished',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `spool` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `user_service_id` int(11) DEFAULT NULL,
  `response` json DEFAULT NULL,
  `event` json NOT NULL,
  `prio` int(11) NOT NULL DEFAULT '0',
  `status` char(8) DEFAULT 'NEW',
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `executed` datetime DEFAULT NULL,
  `delayed` int(11) NOT NULL DEFAULT '0',
  `settings` json DEFAULT NULL,
  `queue_id` int(11) DEFAULT NULL,
  KEY idx_spool_select (`prio`,`status`,`delayed`,`executed`,`queue_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_spool_queue` FOREIGN KEY (`queue_id`) REFERENCES `spool_queues` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `spool_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `spool_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_service_id` int(11) DEFAULT NULL,
  `response` json DEFAULT NULL,
  `event` json DEFAULT NULL,
  `prio` int(11) NOT NULL DEFAULT '0',
  `status` char(8) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `executed` datetime DEFAULT NULL,
  `delayed` int(11) NOT NULL DEFAULT '0',
  `settings` json DEFAULT NULL,
  `queue_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_services` (
  `user_service_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `auto_bill` tinyint(4) NOT NULL DEFAULT '1',
  `withdraw_id` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expire` datetime DEFAULT NULL,
  `status_before` char(8) NOT NULL,
  `status` char(8) NOT NULL,
  `next` int(11) DEFAULT NULL,
  `parent` int(11) DEFAULT NULL,
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`user_service_id`),
  FOREIGN KEY (parent) REFERENCES user_services (user_service_id) ON DELETE SET NULL,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_forecast_candidates` (`auto_bill`, `status`, `withdraw_id`, `expire`, `user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_groups` (
  `gid` int(11) NOT NULL AUTO_INCREMENT,
  `name` char(255) NOT NULL,
  `is_admin` tinyint(4) NOT NULL DEFAULT '0',
  `default_policy` char(8) NOT NULL DEFAULT 'allow',
  `rules` json DEFAULT NULL,
  PRIMARY KEY (`gid`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `partner_id` int(11) DEFAULT NULL,
  `login` varchar(128) NOT NULL,
  `password` varchar(128) DEFAULT NULL,
  `type` tinyint(4) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `discount` tinyint(4) NOT NULL DEFAULT '0',
  `balance` decimal(10,2) NOT NULL,
  `credit` decimal(10,2) NOT NULL,
  `comment` char(255) DEFAULT NULL,
  `dogovor` char(32) DEFAULT NULL,
  `block` tinyint(4) NOT NULL DEFAULT '0',
  `gid` tinyint(4) NOT NULL DEFAULT '2',
  `perm_credit` tinyint(4) DEFAULT '0',
  `full_name` char(255) DEFAULT NULL,
  `can_overdraft` tinyint(4) DEFAULT '0',
  `bonus` decimal(10,2) NOT NULL,
  `verified` int(11) DEFAULT NULL,
  `create_act` tinyint(4) DEFAULT NULL,
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `accounts` (
  `login` varchar(128) NOT NULL,
  `type` char(16) NOT NULL DEFAULT 'login',
  `user_id` int(11) NOT NULL,
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`login`, `type`),
  KEY `idx_accounts_user_id` (`user_id`),
  CONSTRAINT `fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `accounts` (
  `login` varchar(128) NOT NULL,
  `type` char(16) NOT NULL DEFAULT 'login',
  `user_id` int(11) NOT NULL,
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`login`, `type`),
  KEY `idx_accounts_user_id` (`user_id`),
  CONSTRAINT `fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `withdraw_history` (
  `withdraw_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `create_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `withdraw_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` tinyint(2) NOT NULL DEFAULT '0',
  `bonus` decimal(10,2) NOT NULL DEFAULT '0.00',
  `months` decimal(10,4) NOT NULL DEFAULT '1',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `service_id` int(11) NOT NULL,
  `qnt` double NOT NULL DEFAULT '1',
  `user_service_id` int(11) NOT NULL,
  PRIMARY KEY (`withdraw_id`),
  KEY idx_user_id_service_id (`user_id`,`service_id`),
  KEY idx_user_id_user_service_id (`user_id`,`user_service_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `zones` (
  `zone_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` char(32) NOT NULL,
  `order` tinyint(4) NOT NULL DEFAULT '0',
  `server` char(64) DEFAULT NULL,
  `query` char(128) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `min_lenght` tinyint(4) DEFAULT NULL,
  `disabled` tinyint(4) DEFAULT '0',
  `nic_service` char(16) DEFAULT NULL,
  `nic_template` char(16) DEFAULT NULL,
  `contract` tinyint(4) DEFAULT '0',
  `idn` tinyint(4) DEFAULT '0',
  `punycode_only` tinyint(4) DEFAULT '0',
  PRIMARY KEY (`zone_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `identities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` char(64) NOT NULL,
  `private_key` text NOT NULL,
  `public_key` text,
  `fingerprint` char(128),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `templates` (
  `id` char(32) NOT NULL,
  `data` MEDIUMTEXT DEFAULT NULL, -- Up to 16 Mb
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `console` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `stop` datetime DEFAULT NULL,
  `log` MEDIUMBLOB NOT NULL,
  `eof` boolean DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `data` json DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config` (
  `key` char(32) NOT NULL,
  `value` json DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` char(64) NOT NULL, -- sha256 hex digest of the session_id bearer credential
  `user_id` int(11) NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `storage` (
  `user_id` int(11) NOT NULL,
  `name` char(32) NOT NULL,
  `user_service_id` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data` MEDIUMBLOB DEFAULT NULL, -- Up to 16 Mb
  `settings` json DEFAULT NULL,
  PRIMARY KEY (`user_id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bonus_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `bonus` decimal(10,2) NOT NULL,
  `comment` json DEFAULT NULL,
  KEY idx_user_id (user_id),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `promo_codes` (
  `id` char(32) NOT NULL,
  `user_id` int(11) NOT NULL,
  `template_id` char(32) NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used` datetime DEFAULT NULL,
  `used_by` int(11) DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `expire` datetime DEFAULT NULL,
  PRIMARY KEY (`id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `logs_api` (
  `user_id` int(11) DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip` varchar(45) NOT NULL,
  `url` varchar(512) NOT NULL,
  `method` varchar(10) NOT NULL,
  `args` json DEFAULT NULL,
  `descr` char(128) DEFAULT NULL,
  `duration` int(11) unsigned NOT NULL DEFAULT '0',
  `response_code` smallint(5) unsigned NOT NULL DEFAULT '0',
  `response_error` varchar(512) DEFAULT NULL,
  KEY `idx_logs_api_user_id` (`user_id`),
  KEY `idx_logs_api_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `statistics` (
  `date` date NOT NULL,
  `kind` varchar(32) NOT NULL,
  `field` varchar(64) NOT NULL,
  `count` int(11) NOT NULL DEFAULT '0',
  `sum` decimal(12,2) NOT NULL DEFAULT '0.00',
  `min` decimal(12,2) NOT NULL DEFAULT '0.00',
  `max` decimal(12,2) NOT NULL DEFAULT '0.00',
  `avg` decimal(12,2) NOT NULL DEFAULT '0.00',
  UNIQUE KEY (`date`, `kind`, `field`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- END SOURCE: server/app/sql/shm/shm_structure.sql

-- BEGIN SOURCE: server/app/sql/shm/shm_data.sql
BEGIN;

INSERT INTO `users` VALUES
(1,0,'admin','0df78fa86a30eca0a918fdd21a94e238133ce7ab',0,NOW(),NULL,0,0.00,0.00,NULL,NULL,0,1,0,'Admin',0,0.00,NULL,NULL,NULL)
;

INSERT INTO `accounts` VALUES
('admin','login',1,'{"password": {"hash": "$7$100000$92e8c37b96278da15d1f542c0a566d2d$2f09dcdf0d50a2c4c83418ced379ab333ff9ac6d222227fe30ec39e4b849f26f"}}')
;

INSERT INTO `user_groups` VALUES
(1,'admins',1,'allow',NULL),
(2,'users',0,'allow',NULL),
(3,'Модератор',1,'deny','[{"uri": "/admin/user", "action": "allow", "methods": ["GET", "POST"]}, {"uri": "/admin/user/search", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/accounts", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/service", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/service/*", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/pay", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/bonus", "action": "allow", "methods": ["GET"]}]'),
(4,'Поддержка',1,'deny','[{"uri": "/admin/user", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/search", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/accounts", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/service", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/service/*", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/pay", "action": "allow", "methods": ["GET"]}, {"uri": "/admin/user/bonus", "action": "allow", "methods": ["GET"]}]'),
(5,'Viewer',1,'deny','[{"uri": "/admin/*", "action": "allow", "methods": ["GET"]}]')
;

INSERT INTO `servers_groups` VALUES
(default,'LOCAL','local','random',NULL),
(default,'Email уведомления','mail','random',NULL),
(default,'Telegram уведомления','telegram','random',NULL),
(default,'Linux servers','ssh','random',NULL)
;

INSERT INTO `services` VALUES
(default,'Тестовая услуга',0.00,1.00,'test','[]',NULL,0,NULL,NULL,1,0,NULL,0,NULL,0,0)
;

INSERT INTO `events` VALUES
(default,'UserService','User password reset','user_password_reset',1,'{\"category\": \"%\", \"template_id\": \"user_password_reset\"}')
;

INSERT INTO `templates` VALUES
('forecast','Уважаемый {{ user.full_name }}\n\nУведомляем Вас о сроках действия услуг:\n\n{{ FOR item IN user.pays.forecast.items }}\n- Услуга: {{ item.name }}\n  Стоимость: {{ item.total }} руб.\n  {{ IF item.expire }}\n  Истекает: {{ item.expire }}\n  {{ END }}\n{{ END }}\n\n{{ IF user.pays.forecast.dept }}\nПогашение задолженности: {{ user.pays.forecast.dept }} руб.\n{{ END }}\n\nИтого к оплате: {{ user.pays.forecast.total }} руб.\n\nУслуги, которые не будут оплачены до срока их истечения, будут приостановлены.\n\nПодробную информацию по Вашим услугам Вы можете посмотреть в вашем личном кабинете: {{ config.api.url }}\n\nЭто письмо сформировано автоматически. Если оно попало к Вам по ошибке,\nпожалуйста, сообщите об этом нам: {{ config.mail.from }}',NULL),
('user_password_reset','Уважаемый клиент.\n\nВаш новый пароль: {{ user.set_new_passwd }}\n\nАдрес кабинета: {{ config.cli.url }}','{\"subject\": \"SHM - Восстановление пароля\"}')
;

INSERT INTO `config` VALUES
("_shm", '{"version":"0.0.3", "cloud": {}}'),
("billing",'{"type": "Simpler", "partner": {"income_percent": 0},"currency": "RUB"}'),
("company", '{"name":"My Company LTD"}'),
("telegram", '{"token":""}'),
("api",     '{"url":"https://bill.domain.ru"}'),
("cli",     '{"url":"https://bill.domain.ru"}'),
("pay_systems",'{"manual":{"name":"Платеж","show_for_client":false},"yoomoney":{"name":"ЮMoney","account":"000000000000000","secret":"","template_id":"yoomoney_template","show_for_client":true}}'),
("mail",    '{"from":"mail@domain.ru"}')
;

INSERT INTO `spool` (id,status,user_id,event) VALUES
(default,'NEW',1,'{"title":"Сервис для продления услуг","kind":"Jobs","method":"job_prolongate","period":"600"}'),
(default,'NEW',1,'{"title":"Сервис для чистки данных и услуг","kind":"Jobs","method":"job_cleanup","period":"86400"}'),
(default,'NEW',1,'{"title":"Сервис отправки прогнозов оплат","kind":"Jobs","method":"job_make_forecasts","period":"86400"}')
;

COMMIT;


-- END SOURCE: server/app/sql/shm/shm_data.sql

-- BEGIN SOURCE: server/app/sql/ticket-3.7.0.sql
-- vBios 3.7.0 supplemental ticket migration. MySQL 8.x.
-- Run in the existing SHM database (e.g. mysql ... webface < 3.7.0.sql).
-- Back up first; pause writes while applying. DDL is not fully transactional.
-- No credentials, configuration replacements, business-data deletion or version changes.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `tickets` (
 `ticket_id` int(11) NOT NULL AUTO_INCREMENT, `user_id` int(11) NOT NULL, `subject` varchar(160) NOT NULL,
 `status` varchar(16) NOT NULL DEFAULT 'open', `priority` varchar(16) NOT NULL DEFAULT 'normal', `ticket_type` varchar(16) NOT NULL DEFAULT 'other',
 `user_service_id` int(11) DEFAULT NULL, `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 `closed_at` datetime DEFAULT NULL, `telegram_chat_id` bigint DEFAULT NULL, `telegram_thread_id` int(11) DEFAULT NULL, `telegram_error` varchar(255) DEFAULT NULL,
 PRIMARY KEY (`ticket_id`), KEY `idx_tickets_user_updated` (`user_id`,`updated`), UNIQUE KEY `uniq_ticket_telegram_topic` (`telegram_chat_id`,`telegram_thread_id`),
 CONSTRAINT `fk_tickets_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `ticket_messages` (
 `message_id` int(11) NOT NULL AUTO_INCREMENT, `ticket_id` int(11) NOT NULL, `user_id` int(11) NOT NULL DEFAULT 0, `is_admin` tinyint(1) NOT NULL DEFAULT 0,
 `message` text NOT NULL, `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`message_id`), KEY `idx_ticket_messages_ticket` (`ticket_id`,`message_id`),
 CONSTRAINT `fk_ticket_messages_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `ticket_media` (
 `id` int(11) NOT NULL AUTO_INCREMENT, `user_id` int(11) NOT NULL, `name` varchar(255) NOT NULL, `mime_type` varchar(100) DEFAULT NULL, `size` int(11) NOT NULL,
 `data` mediumblob NOT NULL, `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), KEY `idx_ticket_media_user` (`user_id`),
 CONSTRAINT `fk_ticket_media_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `ticket_message_media` (
 `message_id` int(11) NOT NULL, `media_id` int(11) NOT NULL, PRIMARY KEY (`message_id`,`media_id`),
 CONSTRAINT `fk_ticket_message_media_message` FOREIGN KEY (`message_id`) REFERENCES `ticket_messages` (`message_id`) ON DELETE CASCADE,
 CONSTRAINT `fk_ticket_message_media_media` FOREIGN KEY (`media_id`) REFERENCES `ticket_media` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_ai_jobs (
 source_message_id INT NOT NULL PRIMARY KEY,
 ticket_id INT NOT NULL,
 status VARCHAR(16) NOT NULL,
 answer MEDIUMTEXT NULL,
 error VARCHAR(255) NULL,
 reply_message_id INT NULL,
 created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_ai_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS ticket_ai_handoffs (
 ticket_id INT NOT NULL PRIMARY KEY,
 requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Apply once before enabling storage. Existing BLOBs are retained.
CREATE TABLE IF NOT EXISTS ticket_media_objects (
 media_id int(11) NOT NULL,
 bucket varchar(63) NOT NULL,
 object_key varchar(255) NOT NULL,
 PRIMARY KEY (media_id),
 UNIQUE KEY ticket_object_key (bucket,object_key),
 CONSTRAINT fk_ticket_object_media FOREIGN KEY (media_id)
 REFERENCES ticket_media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_telegram_links (
 profile VARCHAR(100) NOT NULL,
 chat_id BIGINT NOT NULL,
 telegram_message_id BIGINT NOT NULL,
 ticket_id INT NOT NULL,
 user_id INT NOT NULL,
 PRIMARY KEY(profile,chat_id,telegram_message_id),
 KEY ticket_reply_owner(user_id,ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ticket_telegram_received (
 profile VARCHAR(100) NOT NULL,
 chat_id BIGINT NOT NULL,
 telegram_message_id BIGINT NOT NULL,
 ticket_id INT NOT NULL,
 PRIMARY KEY(profile,chat_id,telegram_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add absent non-key fields without replacing existing values.
SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='user_id'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `user_id` int(11) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='user_service_id'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `user_service_id` int(11) DEFAULT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='created'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='updated'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='closed_at'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `closed_at` datetime DEFAULT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='telegram_chat_id'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `telegram_chat_id` bigint DEFAULT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='telegram_thread_id'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `telegram_thread_id` int(11) DEFAULT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_messages' AND COLUMN_NAME='user_id'), 'SELECT 1', 'ALTER TABLE `ticket_messages` ADD COLUMN `user_id` int(11) NOT NULL DEFAULT 0');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_messages' AND COLUMN_NAME='is_admin'), 'SELECT 1', 'ALTER TABLE `ticket_messages` ADD COLUMN `is_admin` tinyint(1) NOT NULL DEFAULT 0');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_messages' AND COLUMN_NAME='message'), 'SELECT 1', 'ALTER TABLE `ticket_messages` ADD COLUMN `message` text NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_messages' AND COLUMN_NAME='created'), 'SELECT 1', 'ALTER TABLE `ticket_messages` ADD COLUMN `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media' AND COLUMN_NAME='user_id'), 'SELECT 1', 'ALTER TABLE `ticket_media` ADD COLUMN `user_id` int(11) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media' AND COLUMN_NAME='size'), 'SELECT 1', 'ALTER TABLE `ticket_media` ADD COLUMN `size` int(11) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media' AND COLUMN_NAME='data'), 'SELECT 1', 'ALTER TABLE `ticket_media` ADD COLUMN `data` mediumblob NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media' AND COLUMN_NAME='created'), 'SELECT 1', 'ALTER TABLE `ticket_media` ADD COLUMN `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_ai_jobs' AND COLUMN_NAME='answer'), 'SELECT 1', 'ALTER TABLE `ticket_ai_jobs` ADD COLUMN answer MEDIUMTEXT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_ai_jobs' AND COLUMN_NAME='reply_message_id'), 'SELECT 1', 'ALTER TABLE `ticket_ai_jobs` ADD COLUMN reply_message_id INT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_ai_jobs' AND COLUMN_NAME='created'), 'SELECT 1', 'ALTER TABLE `ticket_ai_jobs` ADD COLUMN created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_ai_handoffs' AND COLUMN_NAME='requested_at'), 'SELECT 1', 'ALTER TABLE `ticket_ai_handoffs` ADD COLUMN requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_telegram_links' AND COLUMN_NAME='user_id'), 'SELECT 1', 'ALTER TABLE `ticket_telegram_links` ADD COLUMN user_id INT NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='subject'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `subject` varchar(160) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='status'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `status` varchar(16) NOT NULL DEFAULT ''open''');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='priority'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `priority` varchar(16) NOT NULL DEFAULT ''normal''');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='ticket_type'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `ticket_type` varchar(16) NOT NULL DEFAULT ''other''');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='telegram_error'), 'SELECT 1', 'ALTER TABLE `tickets` ADD COLUMN `telegram_error` varchar(255) DEFAULT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media' AND COLUMN_NAME='name'), 'SELECT 1', 'ALTER TABLE `ticket_media` ADD COLUMN `name` varchar(255) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media' AND COLUMN_NAME='mime_type'), 'SELECT 1', 'ALTER TABLE `ticket_media` ADD COLUMN `mime_type` varchar(100) DEFAULT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_ai_jobs' AND COLUMN_NAME='status'), 'SELECT 1', 'ALTER TABLE `ticket_ai_jobs` ADD COLUMN status VARCHAR(16) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media_objects' AND COLUMN_NAME='bucket'), 'SELECT 1', 'ALTER TABLE `ticket_media_objects` ADD COLUMN bucket varchar(63) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_media_objects' AND COLUMN_NAME='object_key'), 'SELECT 1', 'ALTER TABLE `ticket_media_objects` ADD COLUMN object_key varchar(255) NOT NULL');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;

-- Older AI packages used VARCHAR(100); widen only short VARCHAR error fields.
SET @vbios_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ticket_ai_jobs' AND COLUMN_NAME='error' AND DATA_TYPE='varchar' AND CHARACTER_MAXIMUM_LENGTH < 255), 'ALTER TABLE ticket_ai_jobs MODIFY COLUMN error VARCHAR(255) NULL', 'SELECT 1');
PREPARE vbios_stmt FROM @vbios_ddl;
EXECUTE vbios_stmt;
DEALLOCATE PREPARE vbios_stmt;
SELECT 'vBios ticket schema migration completed' AS result;

-- Apply before deploying the responder-choice backend/client. MySQL 8.x.
CREATE TABLE IF NOT EXISTS ticket_preferences (
 ticket_id INT NOT NULL,
 responder VARCHAR(16) NOT NULL DEFAULT 'human',
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(ticket_id),
 CONSTRAINT fk_ticket_preferences_ticket FOREIGN KEY(ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- END SOURCE: server/app/sql/ticket-3.7.0.sql

-- BEGIN SOURCE: server/app/sql/ticket-object-storage.sql
-- Apply once before enabling storage. Existing BLOBs are retained.
CREATE TABLE IF NOT EXISTS ticket_media_objects (
 media_id int(11) NOT NULL,
 bucket varchar(63) NOT NULL,
 object_key varchar(255) NOT NULL,
 PRIMARY KEY (media_id),
 UNIQUE KEY ticket_object_key (bucket,object_key),
 CONSTRAINT fk_ticket_object_media FOREIGN KEY (media_id)
 REFERENCES ticket_media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- END SOURCE: server/app/sql/ticket-object-storage.sql

-- BEGIN SOURCE: server/app/sql/ticket-telegram-images.sql
CREATE TABLE IF NOT EXISTS ticket_telegram_media_sent (
 profile VARCHAR(100) NOT NULL,
 chat_id BIGINT NOT NULL,
 message_id INT NOT NULL,
 media_id INT NOT NULL,
 telegram_message_id BIGINT NOT NULL,
 PRIMARY KEY(profile,chat_id,message_id,media_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- END SOURCE: server/app/sql/ticket-telegram-images.sql

-- BEGIN SOURCE: server/app/sql/ticket-responder.sql
-- Apply before deploying the responder-choice backend/client. MySQL 8.x.
CREATE TABLE IF NOT EXISTS ticket_preferences (
 ticket_id INT NOT NULL,
 responder VARCHAR(16) NOT NULL DEFAULT 'human',
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(ticket_id),
 CONSTRAINT fk_ticket_preferences_ticket FOREIGN KEY(ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- END SOURCE: server/app/sql/ticket-responder.sql

-- BEGIN SOURCE: server/app/sql/user-avatars.sql
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id INT NOT NULL,
  bucket VARCHAR(63) NOT NULL,
  object_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_avatar_object (bucket, object_key),
  CONSTRAINT fk_user_avatar_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- END SOURCE: server/app/sql/user-avatars.sql

SELECT 'vBios SHM fresh installation SQL completed' AS result;

-- Independent, autocommitted fulfillment journal. No foreign keys: preserve audit
-- records if an administrator removes the corresponding SHM service.
CREATE TABLE IF NOT EXISTS remnawave_addon_ledger (
    order_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    target_id BIGINT UNSIGNED NOT NULL,
    signature CHAR(64) NOT NULL,
    desired JSON NOT NULL,
    applied TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_at DATETIME DEFAULT NULL,
    PRIMARY KEY (order_id),
    KEY pending_target (user_id, target_id, applied, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cabinet_news (
  id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  media_id VARCHAR(255) DEFAULT NULL,
  media_type VARCHAR(32) DEFAULT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY cabinet_news_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cabinet_news_reactions (
  news_id VARCHAR(64) NOT NULL,
  user_id BIGINT NOT NULL,
  reaction ENUM('like','dislike') NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (news_id,user_id),
  KEY cabinet_news_reactions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
