CREATE SCHEMA extracted;
DROP TABLE IF EXISTS extracted.logs CASCADE;

CREATE TABLE extracted.logs (
  id           serial primary key,
  block_id     integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  log_index    integer not null,
  address      character varying(66) not null,
  to_address   character varying(66) not null,
  data_hex     text not null,
  data         text not null,
  topics       text not null,
  tx_id        integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,

  event_name   text not null, /* todo index */

  unique (log_index, tx_id)
);

CREATE INDEX extracted_logs_event_name_index ON extracted.logs(event_name);
CREATE INDEX extracted_logs_address_index ON extracted.logs(address);
CREATE INDEX extracted_logs_to_address_index ON extracted.logs(to_address);
