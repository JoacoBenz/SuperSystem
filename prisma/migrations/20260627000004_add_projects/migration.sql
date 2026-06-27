-- CreateTable: projects
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planning',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "budget" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "manager_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tasks
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'todo',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "assignee_id" INTEGER,
    "due_date" TIMESTAMP(3),
    "estimated_hours" DECIMAL(8,2),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: time_entries
CREATE TABLE "time_entries" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- Indexes for projects
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");
CREATE INDEX "projects_tenant_id_status_idx" ON "projects"("tenant_id", "status");

-- Indexes for tasks
CREATE INDEX "tasks_tenant_id_project_id_idx" ON "tasks"("tenant_id", "project_id");
CREATE INDEX "tasks_tenant_id_status_idx" ON "tasks"("tenant_id", "status");

-- Indexes for time_entries
CREATE INDEX "time_entries_tenant_id_task_id_idx" ON "time_entries"("tenant_id", "task_id");
CREATE INDEX "time_entries_tenant_id_user_id_idx" ON "time_entries"("tenant_id", "user_id");

-- Foreign Keys
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
