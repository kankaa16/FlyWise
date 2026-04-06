const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
process.env.JWT_SECRET = "testsecret";
let token;

beforeEach(async () => {
  await User.deleteMany({});
  const admin = await User.create({
    name: "admin",
    email: "admin@test.com",
    password: "123456",
    role: "ADMIN"
  });

  token = jwt.sign(
  { id: admin._id.toString() },   
  process.env.JWT_SECRET
);

  
});

describe("Pricing Rules", () => {

  it("fail missing condition", async () => {
    const res = await request(app)
      .post("/api/pricing-rules")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Demand",
        type: "DEMAND",
        charge: 100
      });

    expect(res.statusCode).toBe(400);
  });

});