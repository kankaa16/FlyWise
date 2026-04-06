const request = require("supertest");
const app = require("../server");
const Promo = require("../models/PromoCode");
process.env.JWT_SECRET = "testsecret";
describe("Promo", () => {

  beforeEach(async () => {
    await Promo.deleteMany({});
  });

  it("invalid code", async () => {
    const res = await request(app)
      .post("/api/promo/apply")
      .send({ code: "X", totalPrice: 1000 });

    expect(res.statusCode).toBe(400);
  });

  it("student only fail", async () => {
    await Promo.create({
      code: "STUD",
      discountType: "FLAT",
      discountValue: 100,
      isStudentOnly: true
    });

    const res = await request(app)
      .post("/api/promo/apply")
      .send({ code: "STUD", totalPrice: 1000, isStudent: false });

    expect(res.statusCode).toBe(403);
  });

});