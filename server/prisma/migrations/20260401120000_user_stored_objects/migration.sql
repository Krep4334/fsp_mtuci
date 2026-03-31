-- CreateTable
CREATE TABLE "user_stored_objects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "objectUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stored_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_stored_objects_userId_idx" ON "user_stored_objects"("userId");

-- AddForeignKey
ALTER TABLE "user_stored_objects" ADD CONSTRAINT "user_stored_objects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
