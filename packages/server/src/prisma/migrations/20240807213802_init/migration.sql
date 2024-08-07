-- CreateTable
CREATE TABLE "ChannelBalance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalLocalBalance" INTEGER NOT NULL,
    "totalRemoteBalance" INTEGER NOT NULL,

    CONSTRAINT "ChannelBalance_pkey" PRIMARY KEY ("id")
);
