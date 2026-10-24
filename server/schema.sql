SET search_path TO classsync;
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"token" text NOT NULL,
	"time" bigint NOT NULL,
	"method" text NOT NULL
);


CREATE UNIQUE INDEX "one_attendance_per_session" ON "attendance" ("student_id","token");

CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"room" text NOT NULL,
	"mode" text NOT NULL,
	"auth" text NOT NULL,
	"expires" bigint NOT NULL,
	"open" bigint NOT NULL,
	"ip" text,
	"require_ip" bigint NOT NULL
);


CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"roll" text NOT NULL,
	"email" text NOT NULL,
	"descriptors" text
);


CREATE UNIQUE INDEX "students_roll_unique" ON "students" ("roll");

CREATE UNIQUE INDEX "students_email_unique" ON "students" ("email");

CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL
);

ALTER TABLE "students" ADD "created_at" bigint DEFAULT 0 NOT NULL;
CREATE TABLE "learning_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"done" bigint NOT NULL,
	"updated" bigint NOT NULL
);


CREATE UNIQUE INDEX "one_progress_per_lesson" ON "learning_progress" ("student_id","lesson_id");

CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"topic" text NOT NULL,
	"task" text NOT NULL,
	"resource" text NOT NULL,
	"due" text NOT NULL
);

CREATE TABLE "scan_events" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"student_id" text,
	"actor" text NOT NULL,
	"method" text NOT NULL,
	"ip" text NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"time" bigint NOT NULL
);

CREATE TABLE "attendance_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"token" text NOT NULL,
	"status" text NOT NULL,
	"teacher" text NOT NULL,
	"time" bigint NOT NULL
);


ALTER TABLE "sessions" ADD "class_date" text DEFAULT '' NOT NULL;
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"audience" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created" bigint NOT NULL,
	"read_at" bigint,
	"email_status" text NOT NULL,
	"delivery_detail" text NOT NULL
);


ALTER TABLE "students" ADD "parent_email" text DEFAULT '' NOT NULL;
ALTER TABLE "workspace" ADD "target" bigint DEFAULT 75 NOT NULL;

ALTER TABLE "workspace" ADD "critical" bigint DEFAULT 65 NOT NULL;
ALTER TABLE "messages" ADD "alert_key" text;

CREATE UNIQUE INDEX "messages_alert_key_unique" ON "messages" ("alert_key");
CREATE TABLE "liveness_challenges" (
	"nonce" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"token" text NOT NULL,
	"purpose" text NOT NULL,
	"student_id" text NOT NULL,
	"challenge_order" text NOT NULL,
	"direction" bigint NOT NULL,
	"created" bigint NOT NULL,
	"expires" bigint NOT NULL,
	"used" bigint DEFAULT 0 NOT NULL
);

CREATE TABLE "account_invites" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"expires" bigint NOT NULL
);


CREATE TABLE "account_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"expires" bigint NOT NULL
);


CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"salt" text NOT NULL,
	"iterations" bigint NOT NULL,
	"teacher_slot" text,
	"created" bigint NOT NULL
);


CREATE UNIQUE INDEX "accounts_email_unique" ON "accounts" ("email");

CREATE UNIQUE INDEX "accounts_teacher_slot_unique" ON "accounts" ("teacher_slot");

CREATE TABLE "auth_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"hits" bigint NOT NULL,
	"expires" bigint NOT NULL
);

CREATE TABLE "attendance_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"roll" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"student_id" text,
	"ip" text NOT NULL,
	"created" bigint NOT NULL,
	"reviewer" text,
	"reviewed" bigint,
	"receipt_hash" text NOT NULL
);


CREATE UNIQUE INDEX "one_request_per_identity_session" ON "attendance_requests" ("token","roll","normalized_name");
ALTER TABLE "attendance_requests" ADD "account_id" text;
CREATE TABLE "demo_qr_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"roll" text NOT NULL,
	"student_id" text,
	"status" text NOT NULL,
	"receipt_hash" text NOT NULL,
	"created" bigint NOT NULL,
	"reviewed" bigint
);


CREATE UNIQUE INDEX "one_demo_request_per_identity" ON "demo_qr_requests" ("token","roll","normalized_name");

CREATE TABLE "demo_qr_sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"owner_hash" text NOT NULL,
	"creator_hash" text NOT NULL,
	"subject" text NOT NULL,
	"room" text NOT NULL,
	"auth" text NOT NULL,
	"class_date" text NOT NULL,
	"expires" bigint NOT NULL,
	"open" bigint NOT NULL,
	"require_ip" bigint NOT NULL,
	"ip" text NOT NULL,
	"roster" text NOT NULL,
	"created" bigint NOT NULL
);

CREATE TABLE "face_enrollment_links" (
	"token" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"owner" text NOT NULL,
	"creator_hash" text NOT NULL,
	"roster" text NOT NULL,
	"created" bigint NOT NULL,
	"expires" bigint NOT NULL,
	"open" bigint NOT NULL
);


CREATE TABLE "face_enrollment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"owner" text NOT NULL,
	"token" text NOT NULL,
	"student_id" text NOT NULL,
	"name" text NOT NULL,
	"roll" text NOT NULL,
	"account_id" text NOT NULL,
	"receipt_hash" text NOT NULL,
	"descriptors" text,
	"status" text NOT NULL,
	"created" bigint NOT NULL,
	"reviewed" bigint
);


CREATE UNIQUE INDEX "one_face_request_per_student" ON "face_enrollment_requests" ("scope","owner","student_id");
CREATE TABLE "registration_roster" (
 "student_id" text PRIMARY KEY NOT NULL,
 "roll" text NOT NULL UNIQUE,
 "expected_name" text NOT NULL DEFAULT '',
 "owner" text NOT NULL,
 "created" bigint NOT NULL
);

ALTER TABLE account_invites ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON account_invites TO classsync_runtime; CREATE POLICY runtime_access ON account_invites TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE account_sessions ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON account_sessions TO classsync_runtime; CREATE POLICY runtime_access ON account_sessions TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON accounts TO classsync_runtime; CREATE POLICY runtime_access ON accounts TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON attendance TO classsync_runtime; CREATE POLICY runtime_access ON attendance TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE attendance_changes ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON attendance_changes TO classsync_runtime; CREATE POLICY runtime_access ON attendance_changes TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE attendance_requests ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON attendance_requests TO classsync_runtime; CREATE POLICY runtime_access ON attendance_requests TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON auth_attempts TO classsync_runtime; CREATE POLICY runtime_access ON auth_attempts TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE demo_qr_requests ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON demo_qr_requests TO classsync_runtime; CREATE POLICY runtime_access ON demo_qr_requests TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE demo_qr_sessions ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON demo_qr_sessions TO classsync_runtime; CREATE POLICY runtime_access ON demo_qr_sessions TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE face_enrollment_links ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON face_enrollment_links TO classsync_runtime; CREATE POLICY runtime_access ON face_enrollment_links TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE face_enrollment_requests ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON face_enrollment_requests TO classsync_runtime; CREATE POLICY runtime_access ON face_enrollment_requests TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON learning_progress TO classsync_runtime; CREATE POLICY runtime_access ON learning_progress TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON lessons TO classsync_runtime; CREATE POLICY runtime_access ON lessons TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE liveness_challenges ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON liveness_challenges TO classsync_runtime; CREATE POLICY runtime_access ON liveness_challenges TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON messages TO classsync_runtime; CREATE POLICY runtime_access ON messages TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE registration_roster ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON registration_roster TO classsync_runtime; CREATE POLICY runtime_access ON registration_roster TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON scan_events TO classsync_runtime; CREATE POLICY runtime_access ON scan_events TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON sessions TO classsync_runtime; CREATE POLICY runtime_access ON sessions TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE students ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON students TO classsync_runtime; CREATE POLICY runtime_access ON students TO classsync_runtime USING (true) WITH CHECK (true);
ALTER TABLE workspace ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON workspace TO classsync_runtime; CREATE POLICY runtime_access ON workspace TO classsync_runtime USING (true) WITH CHECK (true);
