const request = require("supertest");
const app = require("../server");
const AddOn = require("../models/AddOn");
process.env.JWT_SECRET = "testsecret";
describe("Addons", () => {

  beforeEach(async () => {
    await AddOn.deleteMany({});
    await AddOn.insertMany([
  { name: "Meal", type: "meal", veg: true, price: 100 },
  { name: "Bag", type: "baggage", veg: false, price: 200 }
]);
  });

  it("get all addons", async () => {
    const res = await request(app).get("/api/addons");
    expect(res.body.length).toBe(2);
  });

  it("filter by type", async () => {
    const res = await request(app).get("/api/addons?type=meal");
    expect(res.body.length).toBe(1);
  });

});