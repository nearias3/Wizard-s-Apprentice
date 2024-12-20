const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const { authMiddleware } = require("./utils/auth");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = req.headers.authorization || "";
      // Only apply authMiddleware if there's a token (i.e., user is logged in)
      return { user: token ? authMiddleware(req) : null };
    },
  });

  await server.start();

  const app = express();

  app.use(cors({ origin: "*" }));

  app.use(bodyParser.json());

  // Connect to the server
  app.use(
    "/graphql",
    expressMiddleware(server)
  );

  // MongoDB Schema
  const SaveSlotSchema = new mongoose.Schema({
    userId: String,
    slotNumber: Number,
    playerStats: Object,
    progress: Object,
  });

  const SaveSlot = mongoose.model("SaveSlot", SaveSlotSchema);

  // Route to save the game
  app.post("/api/save-game", async (req, res) => {
    // Mark the route handler as async
    const user = authMiddleware(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { slotNumber, playerStats, progress } = req.body;

    try {
      // Saves game to the specified slot (1, 2, or 3)
      const saveSlot = await SaveSlot.findOneAndUpdate(
        { userId: user._id, slotNumber },
        { playerStats, progress },
        { new: true, upsert: true }
      );

      res.json({ message: "Game saved successfully", saveSlot });
    } catch (error) {
      console.error("Error saving game:", error);
      res.status(500).json({ message: "Failed to save game", error });
    }
  });

  // Route to load the game
  app.post("/api/load-game", async (req, res) => {
    const user = authMiddleware(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { slotNumber } = req.body;

    try {
      const saveSlot = await SaveSlot.findOne({ userId: user._id, slotNumber });
      if (!saveSlot) {
        return res
          .status(404)
          .json({ message: "No save found for this slot." });
      }

      res.json(saveSlot); // Return the saved data
    } catch (error) {
      console.error("Error loading game:", error);
      res.status(500).json({ message: "Failed to load game", error });
    }
  });

  // Route to load the game (GET request with slotNumber in the URL)
  app.get("/api/load-game/:slotNumber", async (req, res) => {
    const user = authMiddleware(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { slotNumber } = req.params; // Get slotNumber from the URL

    try {
      const saveSlot = await SaveSlot.findOne({ userId: user._id, slotNumber });
      if (!saveSlot) {
        return res
          .status(404)
          .json({ message: "No save found for this slot." });
      }

      res.json(saveSlot); // Return the saved data
    } catch (error) {
      console.error("Error loading game:", error);
      res.status(500).json({ message: "Failed to load game", error });
    }
  });

  app.post("/create-checkout-session", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Support Wizard's Apprentice",
              },
              unit_amount: req.body.amount * 100, // Convert dollars to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/success`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      });

      res.json({ id: session.id });
    } catch (error) {
      console.error("Error creating Stripe session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });



  // Serve static files from the client/dist folder
  app.use(express.static(path.join(__dirname, "../client/dist")));

  // For any routes that don't match the API routes, serve the index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error);
    });

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}/graphql`);
  });
}

startServer();
