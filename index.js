// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb"); // <-- added ObjectId

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vmnz1az.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("BookCourierDB");
    const booksCollection = db.collection("books");
    const ordersCollection = db.collection("orders");

    console.log("Connected to MongoDB");

    // -------------------------------
    // Test route
    // -------------------------------
    app.get("/", (req, res) => {
      res.send("BookCourier Server Running...");
    });

    // -------------------------------
    // BOOK ROUTES
    // -------------------------------

    // Get all published books
    app.get("/books", async (req, res) => {
      const result = await booksCollection.find({ status: "published" }).toArray();
      res.send(result);
    });

    // Get book by custom id
    app.get("/books/custom/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ id: id, status: "published" });
      if (!result) return res.status(404).send({ error: "Book not found or unpublished" });
      res.send(result);
    });

    // Add a new book (for librarian)
    app.post("/librarian/books", async (req, res) => {
      const newBook = req.body;

      if (!newBook.bookName || !newBook.bookAuthor || !newBook.bookImage || !newBook.price || !newBook.addedBy) {
        return res.status(400).send({ error: "Missing required fields" });
      }

      newBook.createdAt = new Date();
      if (!newBook.status) newBook.status = "published";

      const result = await booksCollection.insertOne(newBook);
      res.send(result);
    });

    // -------------------------------
    // ORDER ROUTES
    // -------------------------------

    // Place a new order
    app.post("/orders", async (req, res) => {
      const newOrder = req.body;

      if (!newOrder.userEmail || !newOrder.bookTitle || !newOrder.amount) {
        return res.status(400).send({ error: "Missing userEmail, bookTitle, or amount" });
      }

      newOrder.createdAt = new Date();
      newOrder.status = "pending";
      newOrder.paymentStatus = "unpaid";

      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    });

    // Get all orders of a user
    app.get("/user/orders/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const result = await ordersCollection.find({ userEmail: email }).toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch orders" });
      }
    });

    // NEW: Get single order by ID
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        if (!order) return res.status(404).send({ error: "Order not found" });
        res.send(order);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch order" });
      }
    });

    // Cancel an order
    app.patch("/orders/cancel/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "cancelled" } }
        );
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to cancel order" });
      }
    });

    // Update order status for payment
    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      try {
        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, paymentStatus: status === "paid" ? "paid" : "unpaid" } }
        );
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update order status" });
      }
    });

    // -------------------------------
    // ⭐ NEW: Payment History Route
    // -------------------------------
    app.get("/user/payments/:email", async (req, res) => {
      const email = req.params.email;

      try {
        const payments = await ordersCollection
          .find({ userEmail: email, status: "paid" })
          .toArray();

        res.send(payments);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch payments" });
      }
    });

  } catch (err) {
    console.error(err);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
