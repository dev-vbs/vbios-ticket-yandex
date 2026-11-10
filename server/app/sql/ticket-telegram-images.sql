CREATE TABLE IF NOT EXISTS ticket_telegram_media_sent (
 profile VARCHAR(100) NOT NULL,
 chat_id BIGINT NOT NULL,
 message_id INT NOT NULL,
 media_id INT NOT NULL,
 telegram_message_id BIGINT NOT NULL,
 PRIMARY KEY(profile,chat_id,message_id,media_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
