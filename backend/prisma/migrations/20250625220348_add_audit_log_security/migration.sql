-- Enable Row-Level Security on audit_log table
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only INSERT operations (no UPDATE or DELETE)
CREATE POLICY "audit_log_insert_only" ON "audit_log"
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow SELECT for authenticated users
CREATE POLICY "audit_log_select" ON "audit_log"
    FOR SELECT
    USING (true);

-- Create function to prevent UPDATE and DELETE operations
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be modified or deleted for compliance reasons';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent UPDATE operations
CREATE TRIGGER prevent_audit_log_update
    BEFORE UPDATE ON "audit_log"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- Create trigger to prevent DELETE operations
CREATE TRIGGER prevent_audit_log_delete
    BEFORE DELETE ON "audit_log"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- Add comment to document the security measures
COMMENT ON TABLE "audit_log" IS 'Immutable audit log table with RLS enabled. Only INSERT operations are allowed for compliance and security.';

-- Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS "audit_log_user_action_idx" ON "audit_log" ("user_id", "action_type");
CREATE INDEX IF NOT EXISTS "audit_log_ip_address_idx" ON "audit_log" ("ip_address");
CREATE INDEX IF NOT EXISTS "audit_log_endpoint_idx" ON "audit_log" ("endpoint"); 