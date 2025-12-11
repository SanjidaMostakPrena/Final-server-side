const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vmnz1az.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    await client.connect();
    const db = client.db("BookCourierDB");
    const booksCollection = db.collection("books");
    const ordersCollection = db.collection("orders");

    console.log("Connected to MongoDB");

    //---------------------------
    // TEST ROUTE
    //---------------------------
    app.get("/", (req, res) => {
      res.send("BookCourier Server Running...");
    });


    // Get only PUBLISHED books (Users see only published)
    app.get("/books", async (req, res) => {
      const filter = { status: "published" };
      const result = await booksCollection.find(filter).toArray();
      res.send(result);
    });

    // Get single book by ID (Published only for users)
    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid book ID" });

      const result = await booksCollection.findOne({ _id: new ObjectId(id), status: "published" });

      if (!result) return res.status(404).send({ error: "Book not found or unpublished" });

      res.send(result);
    });


    // Get all books added by a librarian (both published & unpublished)
    app.get("/librarian/books/:email", async (req, res) => {
      const email = req.params.email;

      const filter = { addedBy: email };
      const result = await booksCollection.find(filter).toArray();
      res.send(result);
    });

    // Add new book
    app.post("/librarian/books", async (req, res) => {
      const newBook = req.body;
      newBook.createdAt = new Date();

      // default unpublished or published must exist
      if (!newBook.status) newBook.status = "published";

      const result = await booksCollection.insertOne(newBook);
      res.send(result);
    });

    // Update book (Librarian can edit)
    app.put("/librarian/books/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid book ID" });

      const updatedBook = req.body;
      updatedBook.updatedAt = new Date();

      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedBook }
      );

      res.send(result);
    });

    

    // USER: Place an order
    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      newOrder.createdAt = new Date();
      newOrder.status = "pending"; // default
      newOrder.paymentStatus = "unpaid";

      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    });

    // USER: Get their own orders
    app.get("/user/orders/:email", async (req, res) => {
      const email = req.params.email;

      const result = await ordersCollection.find({ userEmail: email }).toArray();
      res.send(result);
    });

    // USER: Cancel order (only if pending)
    app.patch("/user/orders/cancel/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid order ID" });

      const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

      if (!order) return res.status(404).send({ error: "Order not found" });

      if (order.status !== "pending")
        return res.status(400).send({ error: "Only pending orders can be cancelled" });

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "cancelled" } }
      );
      res.send(result);
    });

    // LIBRARIAN: Get all orders for books added by librarian
    app.get("/librarian/orders/:email", async (req, res) => {
      const email = req.params.email;

      // Get all books added by this librarian
      const books = await booksCollection.find({ addedBy: email }).toArray();
      const bookIds = books.map(b => b._id.toString());

      // Find orders for these books
      const result = await ordersCollection
        .find({ bookId: { $in: bookIds } })
        .toArray();

      res.send(result);
    });

    // LIBRARIAN: Update order status (pending → shipped → delivered)
    app.patch("/orders/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const allowed = ["pending", "shipped", "delivered"];

      if (!allowed.includes(status))
        return res.status(400).send({ error: "Invalid status" });

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );

      res.send(result);
    });

   
  } catch (err) {
    console.log(err);
  }
}
run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
