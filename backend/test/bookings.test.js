const request = require("supertest");
const app = require("../server");
const Booking = require("../models/Booking");
const Flight = require("../models/Flight");
const Seat = require("../models/Seat");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
process.env.JWT_SECRET = "testsecret";
let token, user, flightId;

beforeEach(async () => {
  await Booking.deleteMany({});
  await Flight.deleteMany({});
  await Seat.deleteMany({});
  await User.deleteMany({});

  user = await User.create({
    name: "test",
    email: "t@test.com",
    password: "123456"
  });
  token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);

  const flight = await Flight.create({
    flightNumber: "AI101",
    airline: "AI",
    airlineCode: "AI",
    source: { city: "A", code: "A" },
    destination: { city: "B", code: "B" },
    departureTime: new Date(),
    arrivalTime: new Date(),
    duration: 60,
    basePrice: 1000,
    rows: 2,
    columns: 2,
    availableSeats: 4
  });

  flightId = flight._id;

  await Seat.create({
    flightId,
    seatNumber: "1A",
    row: 1,
    column: "A",
    seatType: "WINDOW",
    status: "LOCKED",
    lockedBy: user._id
  });
});

describe("Booking", () => {

  it("fail missing fields", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("fail seat not locked", async () => {
    await Seat.deleteMany({ flightId, seatNumber: "1A" });

await Seat.create({
  flightId,
  seatNumber: "1A",
  row: 1,
  column: "A",
  seatType: "WINDOW",
  status: "AVAILABLE",
  lockedBy: null
});

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["1A"],
        passengers: [{ name: "A", age: 20 }]
      });

    expect(res.statusCode).toBe(409);
  });

});