CREATE TABLE "VercelTrafficDay" (
 "projectId" VARCHAR(100) NOT NULL,
 "day" DATE NOT NULL,
 "visitors" INTEGER NOT NULL,
 "pageviews" INTEGER NOT NULL,
 "asOf" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "VercelTrafficDay_pkey" PRIMARY KEY ("projectId", "day"),
 CONSTRAINT "VercelTrafficDay_metrics_check" CHECK ("visitors" >= 0 AND "pageviews" >= 0)
);
CREATE TABLE "VercelTrafficPeriod" (
 "projectId" VARCHAR(100) NOT NULL,
 "start" DATE NOT NULL,
 "end" DATE NOT NULL,
 "visitors" INTEGER NOT NULL,
 "pageviews" INTEGER NOT NULL,
 "asOf" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "VercelTrafficPeriod_pkey" PRIMARY KEY ("projectId", "start", "end"),
 CONSTRAINT "VercelTrafficPeriod_range_check" CHECK ("end" >= "start"),
 CONSTRAINT "VercelTrafficPeriod_metrics_check" CHECK ("visitors" >= 0 AND "pageviews" >= 0)
);
