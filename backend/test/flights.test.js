const request = require("supertest");
const app = require("../server");
const Flight = require("../models/Flight");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
process.env.JWT_SECRET = "testsecret";
let adminToken;

beforeEach(async () => {
  await Flight.deleteMany({});
  await User.deleteMany({});

  const admin = await User.create({
    name: "admin",
    email: "a@test.com",
    password: "123456",
    role: "ADMIN"
  });

  adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
});

describe("Flights", () => {

  it("fail search missing params", async () => {
    const res = await request(app).get("/api/flights/search");
    expect(res.statusCode).toBe(400);
  });

  it("create flight (admin)", async () => {
    const res = await request(app)
      .post("/api/flights")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        flightNumber: "AI1",
        airline: "Air India",
        airlineCode: "AI",
        sourceCity: "A",
        sourceCode: "A",
        destinationCity: "B",
        destinationCode: "B",
        departureTime: new Date(),
        arrivalTime: new Date(),
        basePrice: 1000,
        rows: 5,
        columns: 4,
        businessRows: 1,
        totalSeats: 20,
        availableSeats: 20
      });

    expect(res.statusCode).toBe(201);
  });

});