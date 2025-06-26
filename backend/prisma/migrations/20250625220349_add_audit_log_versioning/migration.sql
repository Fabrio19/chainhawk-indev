-- Add versioning columns to audit_log table
ALTER TABLE "audit_log" 
ADD COLUMN "version" INTEGER DEFAULT 1,
ADD COLUMN "previous_id" UUID REFERENCES "audit_log"("id"),
ADD COLUMN "is_current" BOOLEAN DEFAULT true;

-- Create index for versioning queries
CREATE INDEX IF NOT EXISTS "audit_log_version_idx" ON "audit_log" ("id", "version");
CREATE INDEX IF NOT EXISTS "audit_log_current_idx" ON "audit_log" ("is_current");

-- Create function to handle versioning when updates are needed
CREATE OR REPLACE FUNCTION create_audit_log_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark current version as not current
    UPDATE "audit_log" 
    SET "is_current" = false 
    WHERE "id" = NEW."id" AND "is_current" = true;
    
    -- Create new version
    INSERT INTO "audit_log" (
        "user_id", "api_key_id", "action_type", "endpoint", "http_method",
        "request_payload", "response_status", "ip_address", "user_agent",
        "duration", "created_at", "version", "previous_id", "is_current"
    ) VALUES (
        NEW."user_id", NEW."api_key_id", NEW."action_type", NEW."endpoint", NEW."http_method",
        NEW."request_payload", NEW."response_status", NEW."ip_address", NEW."user_agent",
        NEW."duration", NEW."created_at", 
        (SELECT COALESCE(MAX("version"), 0) + 1 FROM "audit_log" WHERE "id" = NEW."id"),
        NEW."id", true
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for versioning (disabled by default - only enable if needed)
-- CREATE TRIGGER audit_log_versioning_trigger
--     INSTEAD OF UPDATE ON "audit_log"
--     FOR EACH ROW
--     EXECUTE FUNCTION create_audit_log_version();

-- Add comment explaining versioning
COMMENT ON COLUMN "audit_log"."version" IS 'Version number for this audit log entry';
COMMENT ON COLUMN "audit_log"."previous_id" IS 'Reference to previous version of this audit log entry';
COMMENT ON COLUMN "audit_log"."is_current" IS 'Indicates if this is the current version of the audit log entry'; 