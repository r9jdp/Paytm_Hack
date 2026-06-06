CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "exportId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "quantity" DOUBLE PRECISION,
  "unit" TEXT,
  "packSize" TEXT,
  "price" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidenceVisual" TEXT,
  "evidenceVoice" TEXT,
  "rawItem" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "products_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "products_exportId_idx" ON "products"("exportId");
CREATE INDEX IF NOT EXISTS "products_userId_idx" ON "products"("userId");
