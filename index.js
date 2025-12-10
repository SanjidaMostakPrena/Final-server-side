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
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("BookCourierDB");
    const booksCollection = db.collection("books");
    const ordersCollection = db.collection("orders");

    console.log("Connected to MongoDB");
    // Test
    app.get("/", (req, res) => {
      res.send("BookCourier Server Running...");
    });

    // GET all books
    app.get("/books", async (req, res) => {
      const result = await booksCollection.find().toArray();
      res.send(result);
    });

    // GET single book by ID
    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      try {
        if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid book ID" });

        const result = await booksCollection.findOne({ _id: new ObjectId(id) });
        if (!result) return res.status(404).send({ error: "Book not found" });

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Server error" });
      }
    });

    // POST new book
    app.post("/books", async (req, res) => {
      const newBook = req.body;
      const result = await booksCollection.insertOne(newBook);
      res.send(result);
    });

    // POST order
    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    });

    // DELETE book
    app.delete("/books/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid book ID" });

      const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // UPDATE book
    app.put("/books/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBook = req.body;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid book ID" });

      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedBook }
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
