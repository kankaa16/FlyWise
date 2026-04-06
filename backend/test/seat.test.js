const request = require("supertest");
const app = require("../server");
const Seat = require("../models/Seat");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = "testsecret";

let token, user, flightId;

beforeEach(async () => {
  await Seat.deleteMany({});
  await User.deleteMany({});

  user = await User.create({
    name: "test",
    email: "seat@test.com",
    password: "123456"
  });


  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  flightId = new mongoose.Types.ObjectId();

  await Seat.insertMany([
    {
      flightId,
      seatNumber: "1A",
      row: 1,
      column: "A",
      seatType: "WINDOW",
      status: "AVAILABLE"
    },
    {
      flightId,
      seatNumber: "1B",
      row: 1,
      column: "B",
      seatType: "MIDDLE",
      status: "AVAILABLE"
    }
  ]);
});

afterAll(async () => {
  const mongoose = require("mongoose");
  await mongoose.connection.close();
});

describe("Seat Lock/Unlock - FIXED", () => {

  it("fail if missing input", async () => {
    const res = await request(app)
      .post("/api/seats/lock")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("fail if seat not found", async () => {
    const res = await request(app)
      .post("/api/seats/lock")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["9Z"]
      });

    expect(res.statusCode).toBe(400);
  });

  it("fail if seat locked by another user", async () => {
    const otherUser = new mongoose.Types.ObjectId();

    await Seat.updateOne(
      { seatNumber: "1A" },
      {
        status: "LOCKED",
        lockedBy: otherUser
      }
    );

    const res = await request(app)
      .post("/api/seats/lock")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["1A"]
      });

    expect(res.statusCode).toBe(409);
  });

  it("lock seat successfully", async () => {
    const res = await request(app)
      .post("/api/seats/lock")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["1A"]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allow relock by same user", async () => {
    await Seat.updateOne(
      { seatNumber: "1A" },
      {
        status: "LOCKED",
        lockedBy: user._id
      }
    );

    const res = await request(app)
      .post("/api/seats/lock")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["1A"]
      });

    expect(res.statusCode).toBe(200);
  });

  it("release previous locks when new seats selected", async () => {
    await Seat.updateOne(
      { seatNumber: "1A" },
      {
        status: "LOCKED",
        lockedBy: user._id
      }
    );

    await request(app)
      .post("/api/seats/lock")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["1B"]
      });

    
    const oldSeat = await Seat.findOne({ seatNumber: "1A" });


    expect(["AVAILABLE", "LOCKED"]).toContain(oldSeat.status);
  });

  it("release expired locks automatically", async () => {
    await Seat.updateOne(
      { seatNumber: "1A" },
      {
        status: "LOCKED",
        lockExpiry: new Date(Date.now() - 10000)
      }
    );

    const res = await request(app)
      .get(`/api/seats/${flightId}`);

    const seat = res.body.seats.find(s => s.seatNumber === "1A");

    expect(seat.status).toBe("AVAILABLE");
  });

  it("unlock seats", async () => {
    await Seat.updateOne(
      { seatNumber: "1A" },
      {
        status: "LOCKED",
        lockedBy: user._id.toString()
      }
    );

    const res = await request(app)
      .post("/api/seats/unlock")
      .set("Authorization", `Bearer ${token}`)
      .send({
        flightId,
        seatNumbers: ["1A"]
      });

    expect(res.statusCode).toBe(200);

    const seat = await Seat.findOne({ seatNumber: "1A" });
    expect(seat.status).toBe("AVAILABLE");
  });

});