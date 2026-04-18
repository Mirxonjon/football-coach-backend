-- CreateTable
CREATE TABLE "_CashierStation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CashierStation_AB_unique" ON "_CashierStation"("A", "B");

-- CreateIndex
CREATE INDEX "_CashierStation_B_index" ON "_CashierStation"("B");

-- AddForeignKey
ALTER TABLE "_CashierStation" ADD CONSTRAINT "_CashierStation_A_fkey" FOREIGN KEY ("A") REFERENCES "FuelStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CashierStation" ADD CONSTRAINT "_CashierStation_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
