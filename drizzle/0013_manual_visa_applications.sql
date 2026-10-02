-- Development-only visa reset, authorized by the project owner.
-- Archive the old rows, including R2 object keys, before removing active data.
-- R2 objects and all non-visa tables are preserved.
CREATE SCHEMA visa_dev_backup_20260930;
REVOKE ALL ON SCHEMA visa_dev_backup_20260930 FROM PUBLIC;
CREATE TABLE visa_dev_backup_20260930.applications AS TABLE visa_applications;
CREATE TABLE visa_dev_backup_20260930.travelers AS TABLE visa_application_travelers;
CREATE TABLE visa_dev_backup_20260930.documents AS TABLE visa_application_documents;
CREATE TABLE visa_dev_backup_20260930.events AS TABLE visa_application_events;
DELETE FROM visa_applications;
--> statement-breakpoint
ALTER TABLE visa_applications DROP COLUMN visa_type_id;
ALTER TABLE visa_applications DROP COLUMN provider_product_id;
ALTER TABLE visa_applications ADD COLUMN listing_id text NOT NULL
  REFERENCES visa_listings(id) ON DELETE RESTRICT;
ALTER TABLE visa_applications ADD COLUMN listing_snapshot jsonb NOT NULL;
ALTER TABLE visa_applications ALTER COLUMN pricing_snapshot DROP DEFAULT;
ALTER TABLE visa_applications ALTER COLUMN pricing_snapshot SET NOT NULL;
CREATE INDEX visa_applications_listing_idx ON visa_applications(listing_id);
--> statement-breakpoint
ALTER TABLE visa_application_documents DROP COLUMN document_type;
ALTER TABLE visa_application_documents ADD COLUMN requirement_id text NOT NULL;
ALTER TABLE visa_application_documents ALTER COLUMN traveler_id DROP NOT NULL;
CREATE UNIQUE INDEX visa_documents_uploaded_traveler_slot_idx
  ON visa_application_documents(application_id, requirement_id, traveler_id)
  WHERE status = 'uploaded' AND traveler_id IS NOT NULL;
CREATE UNIQUE INDEX visa_documents_uploaded_shared_slot_idx
  ON visa_application_documents(application_id, requirement_id)
  WHERE status = 'uploaded' AND traveler_id IS NULL;
