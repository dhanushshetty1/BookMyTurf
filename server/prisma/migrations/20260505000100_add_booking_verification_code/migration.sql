-- Add a user-facing booking verification code for owner check-in.
ALTER TABLE "Booking" ADD COLUMN "bookingCode" TEXT;

CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");
