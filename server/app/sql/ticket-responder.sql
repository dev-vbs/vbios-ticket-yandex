-- Apply before deploying the responder-choice backend/client. MySQL 8.x.
CREATE TABLE IF NOT EXISTS ticket_preferences (
 ticket_id INT NOT NULL,
 responder VARCHAR(16) NOT NULL DEFAULT 'human',
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(ticket_id),
 CONSTRAINT fk_ticket_preferences_ticket FOREIGN KEY(ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
