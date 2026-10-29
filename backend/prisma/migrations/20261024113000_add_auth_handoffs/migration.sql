CREATE TABLE "auth_handoffs" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_handoffs_codeHash_key" ON "auth_handoffs"("codeHash");
CREATE INDEX "auth_handoffs_userId_idx" ON "auth_handoffs"("userId");
CREATE INDEX "auth_handoffs_expiresAt_idx" ON "auth_handoffs"("expiresAt");

ALTER TABLE "auth_handoffs"
ADD CONSTRAINT "auth_handoffs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
