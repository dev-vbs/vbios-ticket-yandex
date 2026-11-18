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
