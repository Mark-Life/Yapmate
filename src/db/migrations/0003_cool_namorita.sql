ALTER TABLE "files" ALTER COLUMN "storagePath" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "dataUrl" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "file_data_exists" CHECK ("files"."storagePath" IS NOT NULL OR "files"."dataUrl" IS NOT NULL);--> statement-breakpoint


-- RLS policies for user-files bucket
-- Users can upload their own files (path must start with their userId)
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-files' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);--> statement-breakpoint

-- Users can read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);--> statement-breakpoint

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);