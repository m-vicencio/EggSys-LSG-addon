
-- 1. Alter Table to add new columns
ALTER TABLE "Category" 
ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b',
ADD COLUMN "iconName" TEXT NOT NULL DEFAULT 'HelpCircleIcon',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 2. Drop the old index
DROP INDEX IF EXISTS "Category_userId_name_key";

-- 3. Create the new composite unique index
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");