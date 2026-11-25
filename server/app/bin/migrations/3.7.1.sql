CREATE TABLE IF NOT EXISTS `cabinet_news` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` mediumtext NOT NULL,
  `media_id` varchar(255) DEFAULT NULL,
  `media_type` varchar(32) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cabinet_news_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cabinet_news_reactions` (
  `news_id` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `reaction` enum('like','dislike') NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`news_id`,`user_id`),
  KEY `cabinet_news_reactions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
