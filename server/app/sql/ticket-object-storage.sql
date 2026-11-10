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
