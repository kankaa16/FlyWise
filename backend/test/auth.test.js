const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
process.env.JWT_SECRET = "testsecret";
let token;

describe("Auth", () => {

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("fail register missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.statusCode).toBe(400);
  });

  it("fail duplicate email", async () => {
    await User.create({ name: "a", email: "a@test.com", password: "123456" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "a", email: "a@test.com", password: "123456" });

    expect(res.statusCode).toBe(400);
  });

  it("success register + login", async () => {
    await request(app).post("/api/auth/register").send({
      name: "k",
      email: "k@test.com",
      password: "123456"
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "k@test.com",
      password: "123456"
    });

    token = res.body.token;
    expect(token).toBeDefined();
  });

  it("fail login wrong password", async () => {
    await User.create({ name: "a", email: "a@test.com", password: "123456" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@test.com", password: "wrong" });

    expect(res.statusCode).toBe(401);
  });

  it("get profile (protected)", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      name: "k",
      email: "k@test.com",
      password: "123456"
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.token}`);

    expect(res.statusCode).toBe(200);
  });

});